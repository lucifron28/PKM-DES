-- A destructive reset endpoint for an explicitly opted-in demo database.
-- The web action is server-only and the function is executable only by the
-- Supabase service_role. Admin/staff/Registrar accounts are never selected.

create or replace function private.prevent_enrollment_signature_mutation()
returns trigger
language plpgsql
as $$
begin
  if coalesce(current_setting('pkm.demo_reset', true), 'false') = 'true' then
    return old;
  end if;

  raise exception 'Enrollment signatures are immutable; use a controlled invalidation and re-sign workflow.';
end;
$$;

create or replace function private.prevent_signature_specimen_mutation()
returns trigger
language plpgsql
as $$
begin
  if coalesce(current_setting('pkm.demo_reset', true), 'false') = 'true' then
    return old;
  end if;

  if tg_op = 'DELETE' then
    raise exception 'Signature specimens are retained as metadata; use the controlled retirement workflow.';
  end if;

  if old.id <> new.id
     or old.profile_id <> new.profile_id
     or old.signature_storage_path <> new.signature_storage_path
     or old.signature_hash <> new.signature_hash
     or old.created_at <> new.created_at
     or old.retired_at is not null
     or new.retired_at is null then
    raise exception 'Signature specimens are immutable; use the controlled retirement workflow.';
  end if;

  return new;
end;
$$;

create or replace function public.reset_demo_student_data()
returns table (
  student_account_count integer,
  student_record_count integer,
  official_record_count integer,
  enrollment_count integer,
  signature_count integer,
  requirement_count integer
)
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  v_profile_ids uuid[];
  v_student_ids uuid[];
  v_enrollment_ids uuid[];
  v_official_record_ids uuid[];
  v_target_ids uuid[];
  v_signature_count integer := 0;
  v_requirement_count integer := 0;
  v_enrollment_count integer := 0;
  v_student_record_count integer := 0;
  v_official_record_count integer := 0;
  v_student_account_count integer := 0;
begin
  if coalesce(current_setting('request.jwt.claim.role', true), 'service_role') <> 'service_role' then
    raise exception 'This reset is available only through the server-side service role.';
  end if;

  perform set_config('pkm.demo_reset', 'true', true);

  select coalesce(array_agg(p.id), '{}'::uuid[])
    into v_profile_ids
  from public.profiles p
  where p.role = 'student';

  select coalesce(array_agg(s.id), '{}'::uuid[])
    into v_student_ids
  from public.students s
  where s.profile_id = any(v_profile_ids);

  select coalesce(array_agg(e.id), '{}'::uuid[])
    into v_enrollment_ids
  from public.enrollments e
  where e.student_id = any(v_student_ids);

  select coalesce(array_agg(osr.id), '{}'::uuid[])
    into v_official_record_ids
  from public.official_student_records osr;

  v_target_ids := v_profile_ids || v_student_ids || v_enrollment_ids || v_official_record_ids;

  delete from public.audit_logs al
  where al.actor_profile_id = any(v_profile_ids)
     or (
       al.target_table in (
         'enrollments',
         'students',
         'official_student_records',
         'enrollment_signatures',
         'signature_specimens',
         'student_requirements'
       )
       and al.target_id = any(v_target_ids)
     );

  delete from public.enrollment_signatures es
  where es.enrollment_id = any(v_enrollment_ids);
  get diagnostics v_signature_count = row_count;

  delete from public.enrollment_decision_notifications edn
  where edn.enrollment_id = any(v_enrollment_ids);

  delete from public.enrollment_clearances ec
  where ec.enrollment_id = any(v_enrollment_ids);

  delete from public.enrollment_subjects esub
  where esub.enrollment_id = any(v_enrollment_ids);

  delete from public.student_requirements sr
  where sr.student_id = any(v_student_ids);
  get diagnostics v_requirement_count = row_count;

  delete from public.grades g
  where g.student_id = any(v_student_ids);

  delete from public.balances b
  where b.student_id = any(v_student_ids);

  delete from public.enrollments e
  where e.id = any(v_enrollment_ids);
  get diagnostics v_enrollment_count = row_count;

  delete from public.students s
  where s.id = any(v_student_ids);
  get diagnostics v_student_record_count = row_count;

  delete from public.signature_specimens ss
  where ss.profile_id = any(v_profile_ids);

  delete from public.official_student_records osr
  where osr.id = any(v_official_record_ids);
  get diagnostics v_official_record_count = row_count;

  delete from public.profiles p
  where p.id = any(v_profile_ids);
  get diagnostics v_student_account_count = row_count;

  delete from auth.users au
  where au.id = any(v_profile_ids);

  return query
  select
    v_student_account_count,
    v_student_record_count,
    v_official_record_count,
    v_enrollment_count,
    v_signature_count,
    v_requirement_count;
end;
$$;

revoke all on function public.reset_demo_student_data() from public, anon, authenticated;
grant execute on function public.reset_demo_student_data() to service_role;
