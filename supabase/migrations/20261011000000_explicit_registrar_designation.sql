-- ============================================================================
-- Migration: 20261011000000_explicit_registrar_designation.sql
-- Description: Explicitly distinguish Registrar accounts via public.profiles.is_registrar.
-- Prevents privilege escalation when an official staff member's last role assignment is revoked.
-- ============================================================================

-- 1. Add is_registrar column to public.profiles
alter table public.profiles
add column if not exists is_registrar boolean not null default false;

-- 2. Backfill existing legitimate Registrar profiles
-- Active admin profiles that do not have (and never had) official signing role assignments
update public.profiles
set is_registrar = true
where role = 'admin'
  and not exists (
    select 1
    from public.official_role_assignments a
    where a.profile_id = profiles.id
  );

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
      if not private.is_registrar() or old.id = auth.uid() then
        raise exception 'Profile is_registrar cannot be modified directly or by self.';
      end if;
    end if;
    -- Registrar is authorized to update profile fields (excluding id, role, and self is_registrar checked above)
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
    if not private.is_registrar() then
      if new.role <> 'student' then
        raise exception 'Self-provisioning as administrator is forbidden.';
      end if;
      if new.is_registrar = true then
        raise exception 'Self-provisioning as registrar is forbidden.';
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
  private.is_registrar()
  or (
    id = auth.uid()
    and role = 'student'
    and account_status in ('PENDING', 'SETUP')
    and coalesce(is_registrar, false) = false
  )
);
