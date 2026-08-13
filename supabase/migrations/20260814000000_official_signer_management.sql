-- Forward-only management RPC for official signing assignments.
-- `profiles.role` remains only `student` or `admin`. This function manages
-- capabilities attached to existing admin profiles; it does not create Auth
-- users and it never permits an admin to assign or revoke their own roles.

alter table public.official_role_assignments enable row level security;
revoke all on table public.official_role_assignments from public, anon, authenticated;
grant select on table public.official_role_assignments to authenticated;
grant all on table public.official_role_assignments to service_role;

create or replace function public.set_official_role_assignment(
  p_profile_id uuid,
  p_official_role text,
  p_active boolean,
  p_program_id uuid default null
)
returns table (outcome text, assignment_id uuid, active boolean)
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  v_target public.profiles%rowtype;
  v_assignment public.official_role_assignments%rowtype;
begin
  if auth.uid() is null or not private.is_admin() then
    return query select 'unauthorized'::text, null::uuid, null::boolean;
    return;
  end if;

  if p_profile_id is null
    or p_official_role is null
    or p_official_role not in ('LIBRARIAN', 'NURSE', 'PROGRAM_CHAIR', 'ACCOUNTANT', 'DEAN')
    or p_active is null then
    return query select 'invalid_request'::text, null::uuid, null::boolean;
    return;
  end if;

  if p_profile_id = auth.uid() then
    return query select 'self_assignment_forbidden'::text, null::uuid, null::boolean;
    return;
  end if;

  select *
  into v_target
  from public.profiles
  where id = p_profile_id;

  if not found or v_target.role <> 'admin' then
    return query select 'target_not_admin'::text, null::uuid, null::boolean;
    return;
  end if;

  if p_active and v_target.account_status <> 'ACTIVE' then
    return query select 'target_not_active'::text, null::uuid, null::boolean;
    return;
  end if;

  if p_program_id is not null
    and not exists (select 1 from public.programs where id = p_program_id) then
    return query select 'invalid_program'::text, null::uuid, null::boolean;
    return;
  end if;

  select *
  into v_assignment
  from public.official_role_assignments
  where profile_id = p_profile_id
    and official_role = p_official_role
    and program_id is not distinct from p_program_id
  for update;

  if not found then
    if not p_active then
      return query select 'not_found'::text, null::uuid, null::boolean;
      return;
    end if;

    insert into public.official_role_assignments (profile_id, official_role, program_id, active)
    values (p_profile_id, p_official_role, p_program_id, true)
    returning * into v_assignment;

    insert into public.audit_logs (actor_profile_id, action, target_table, target_id)
    values (auth.uid(), 'ASSIGN_OFFICIAL_SIGNING_ROLE', 'official_role_assignments', v_assignment.id);

    return query select 'assigned'::text, v_assignment.id, true;
    return;
  end if;

  if v_assignment.active = p_active then
    return query select 'unchanged'::text, v_assignment.id, v_assignment.active;
    return;
  end if;

  update public.official_role_assignments
  set active = p_active,
      updated_at = now()
  where id = v_assignment.id
  returning * into v_assignment;

  insert into public.audit_logs (actor_profile_id, action, target_table, target_id)
  values (
    auth.uid(),
    case when p_active then 'ASSIGN_OFFICIAL_SIGNING_ROLE' else 'REVOKE_OFFICIAL_SIGNING_ROLE' end,
    'official_role_assignments',
    v_assignment.id
  );

  return query select (case when p_active then 'assigned' else 'revoked' end)::text, v_assignment.id, v_assignment.active;
exception
  when unique_violation then
    return query select 'conflict'::text, null::uuid, null::boolean;
end;
$$;

revoke all on function public.set_official_role_assignment(uuid, text, boolean, uuid) from public;
revoke execute on function public.set_official_role_assignment(uuid, text, boolean, uuid) from anon;
grant execute on function public.set_official_role_assignment(uuid, text, boolean, uuid) to authenticated;
