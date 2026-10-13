-- ============================================================================
-- Migration: 20261011000000_explicit_registrar_designation.sql
-- Description: Explicitly distinguish Registrar accounts via public.profiles.is_registrar.
-- Prevents privilege escalation when an official staff member's last role assignment is revoked.
-- ============================================================================

-- 1. Add is_registrar column to public.profiles (defaults to false, failing closed)
alter table public.profiles
add column if not exists is_registrar boolean not null default false;

alter table public.profiles
drop constraint if exists profiles_registrar_must_be_admin_check;

alter table public.profiles
add constraint profiles_registrar_must_be_admin_check
check (not is_registrar or role = 'admin');

-- 2. Explicit Registrar Designation Helper (Fail-Closed Provisioning)
-- Unknown or unassigned admin accounts are NEVER automatically promoted during migration.
-- Legitimate Registrar accounts must be explicitly designated through an authorized
-- provisioning step (supabase/registrar_admin_setup.example.sql,
-- scripts/demo/prepare-demo.mjs, or private.designate_registrar_profile).
create or replace function private.designate_registrar_profile(
  p_profile_id uuid,
  p_is_registrar boolean default true
)
returns public.profiles
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_profile public.profiles%rowtype;
begin
  if current_setting('request.jwt.claim.role', true) in ('authenticated', 'anon') then
    raise exception 'Registrar designation requires privileged provisioning access.';
  end if;

  if p_profile_id is null or p_is_registrar is null then
    raise exception 'Profile ID and registrar designation flag are required.';
  end if;

  select *
  into v_profile
  from public.profiles
  where id = p_profile_id
  for update;

  if not found then
    raise exception 'Profile % not found.', p_profile_id;
  end if;

  if p_is_registrar and (v_profile.role <> 'admin' or v_profile.account_status <> 'ACTIVE') then
    raise exception 'Only ACTIVE admin profiles can be designated as Registrar.';
  end if;

  update public.profiles
  set
    is_registrar = p_is_registrar,
    updated_at = now()
  where id = p_profile_id
  returning * into v_profile;

  insert into public.audit_logs (actor_profile_id, action, target_table, target_id)
  values (
    v_profile.id,
    case when p_is_registrar then 'DESIGNATE_REGISTRAR_PROFILE' else 'REVOKE_REGISTRAR_PROFILE' end,
    'profiles',
    v_profile.id
  );

  return v_profile;
end;
$$;

revoke all on function private.designate_registrar_profile(uuid, boolean) from public, anon, authenticated;
grant execute on function private.designate_registrar_profile(uuid, boolean) to service_role;
-- 3. Redefine private.is_registrar()
-- Explicitly check p.is_registrar = true instead of relying on absence of active assignments
create or replace function private.is_registrar()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'
      and p.is_registrar = true
      and p.account_status = 'ACTIVE'
  );
$$;

revoke all on function private.is_registrar() from public;
grant execute on function private.is_registrar() to authenticated;

-- 4. Update sensitive field protection trigger
create or replace function private.protect_profile_sensitive_fields()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if current_setting('request.jwt.claim.role', true) in ('authenticated', 'anon') then
    if new.id is distinct from old.id then
      raise exception 'Profile id cannot be modified.';
    end if;
    if new.role is distinct from old.role then
      raise exception 'Profile role cannot be modified directly.';
    end if;
    if new.is_registrar is distinct from old.is_registrar then
      raise exception 'Profile is_registrar cannot be modified directly.';
    end if;
    -- Registrar is authorized to update profile fields (excluding id, role, and is_registrar checked above)
    if private.is_registrar() then
      return new;
    end if;
    -- Allow student completing their own account setup (SETUP -> ACTIVE)
    if old.id = auth.uid()
       and old.role = 'student'
       and old.account_status = 'SETUP'
       and new.account_status = 'ACTIVE'
       and new.email = old.email
       and new.first_name = old.first_name
       and new.last_name = old.last_name
       and new.is_registrar = false then
      return new;
    end if;
    raise exception 'Profile modification forbidden.';
  end if;
  return new;
end;
$$;

-- 5. Update profile creation protection trigger
create or replace function private.protect_profile_creation()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if current_setting('request.jwt.claim.role', true) in ('authenticated', 'anon') then
    if new.id is distinct from auth.uid() and not private.is_registrar() then
      raise exception 'Profile creation forbidden for another user.';
    end if;
    if new.is_registrar = true then
      raise exception 'Self-provisioning as registrar is forbidden.';
    end if;
    if not private.is_registrar() then
      if new.role <> 'student' then
        raise exception 'Self-provisioning as administrator is forbidden.';
      end if;
      if new.account_status = 'ACTIVE' then
        raise exception 'Self-activation of profile is forbidden.';
      end if;
    end if;
  end if;
  return new;
end;
$$;

-- 6. Update profiles_insert_own policy check
drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
on public.profiles for insert
to authenticated
with check (
  (
    private.is_registrar()
    and coalesce(is_registrar, false) = false
  )
  or (
    id = auth.uid()
    and role = 'student'
    and account_status in ('PENDING', 'SETUP')
    and coalesce(is_registrar, false) = false
  )
);
