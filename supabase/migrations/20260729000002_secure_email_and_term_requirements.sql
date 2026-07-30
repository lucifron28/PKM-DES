-- Secure account setup status and term-aware, status-only requirement verification.
-- This research-MVP rule never stores medical details or uploaded forms.

alter table public.profiles
  drop constraint if exists profiles_account_status_check;

alter table public.profiles
  add constraint profiles_account_status_check
  check (account_status in ('ACTIVE', 'PENDING', 'SETUP'));

alter table public.student_requirements
  add column if not exists academic_year text,
  add column if not exists semester text,
  add column if not exists verified_at timestamptz,
  add column if not exists verified_by uuid references public.profiles(id),
  add column if not exists applicability text not null default 'NOT_APPLICABLE',
  add column if not exists note text;

alter table public.student_requirements
  drop constraint if exists student_requirements_student_id_requirement_code_key;

alter table public.student_requirements
  add constraint student_requirements_student_requirement_term_key
  unique (student_id, requirement_code, academic_year, semester);

alter table public.student_requirements
  add constraint student_requirements_term_pair_check
  check (
    (academic_year is null and semester is null)
    or (
      academic_year ~ '^\d{4}-\d{4}$'
      and semester in ('1st Semester', '2nd Semester')
    )
  ) not valid,
  add constraint student_requirements_applicability_check
  check (applicability in ('APPLICABLE', 'NOT_APPLICABLE')),
  add constraint student_requirements_note_length_check
  check (note is null or char_length(note) <= 240),
  add constraint student_requirements_verification_metadata_check
  check (
    (status = 'VERIFIED' and verified_at is not null and verified_by is not null)
    or (status <> 'VERIFIED' and verified_at is null and verified_by is null)
  ) not valid;

create index if not exists student_requirements_student_term_idx
on public.student_requirements (student_id, academic_year, semester);

drop trigger if exists set_student_requirements_updated_at on public.student_requirements;

create trigger set_student_requirements_updated_at
before update on public.student_requirements
for each row execute function public.set_updated_at();

alter table public.student_requirements enable row level security;

drop policy if exists "student_requirements_select_own_or_admin" on public.student_requirements;
drop policy if exists "student_requirements_manage_admin" on public.student_requirements;

create policy "student_requirements_select_own_or_admin"
on public.student_requirements for select
to authenticated
using (
  private.is_admin()
  or exists (
    select 1
    from public.students s
    where s.id = student_requirements.student_id
      and s.profile_id = auth.uid()
  )
);

create policy "student_requirements_manage_admin"
on public.student_requirements for all
to authenticated
using (private.is_admin())
with check (private.is_admin());

revoke all on table public.student_requirements from anon;
grant select, insert, update, delete on table public.student_requirements to authenticated;

create or replace function public.submit_standard_student_enrollment(
  p_academic_year text,
  p_semester text
)
returns table (
  outcome text,
  enrollment_id uuid,
  attached_subject_count integer
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_student_id uuid;
  v_student_id_number text;
  v_program_id uuid;
  v_program_code text;
  v_year_level text;
  v_student_type text;
  v_subject_count integer;
  v_attached_subject_count integer;
  v_enrollment_id uuid;
  v_health_requirement_applicability text;
begin
  if auth.uid() is null then
    return query select 'invalid_student_record'::text, null::uuid, 0;
    return;
  end if;

  select
    s.id,
    s.student_id_number,
    s.program_id,
    pr.code,
    s.year_level,
    s.student_type
  into
    v_student_id,
    v_student_id_number,
    v_program_id,
    v_program_code,
    v_year_level,
    v_student_type
  from public.profiles p
  join public.students s on s.profile_id = p.id
  left join public.programs pr on pr.id = s.program_id
  where p.id = auth.uid()
    and p.role = 'student'
    and p.account_status = 'ACTIVE';

  if not found or v_student_id is null or v_program_id is null or v_program_code is null then
    return query select 'invalid_student_record'::text, null::uuid, 0;
    return;
  end if;

  if nullif(btrim(v_student_id_number), '') is null then
    return query select 'missing_student_id'::text, null::uuid, 0;
    return;
  end if;

  if v_year_level not in ('1st Year', '2nd Year', '3rd Year', '4th Year') then
    return query select 'invalid_student_record'::text, null::uuid, 0;
    return;
  end if;

  if v_student_type in ('Transferee', 'Irregular Student') then
    return query select 'registrar_managed_load'::text, null::uuid, 0;
    return;
  end if;

  if v_student_type not in (
    'Incoming 1st Year Student',
    'Old Student',
    'Continuing Student',
    'Regular Student'
  ) then
    return query select 'invalid_student_record'::text, null::uuid, 0;
    return;
  end if;

  if v_program_code <> 'BSAIS' then
    return query select 'unsupported_program'::text, null::uuid, 0;
    return;
  end if;

  -- The approved research-MVP term is AY 2026-2027, 1st Semester.
  if p_academic_year is distinct from '2026-2027'
    or p_semester is distinct from '1st Semester' then
    return query select 'term_not_open'::text, null::uuid, 0;
    return;
  end if;

  if exists (
    select 1
    from public.enrollments e
    where e.student_id = v_student_id
      and e.academic_year = p_academic_year
      and e.semester = p_semester
  ) then
    return query select 'duplicate'::text, null::uuid, 0;
    return;
  end if;

  select count(*)::integer
  into v_subject_count
  from public.subjects s
  where s.program_id = v_program_id
    and s.year_level = v_year_level
    and s.semester = p_semester;

  if v_subject_count < 1 then
    return query select 'no_configured_subjects'::text, null::uuid, 0;
    return;
  end if;

  begin
    insert into public.enrollments (
      student_id,
      program_id,
      year_level,
      academic_year,
      semester,
      status,
      reviewed_at,
      reviewed_by,
      remarks
    )
    values (
      v_student_id,
      v_program_id,
      v_year_level,
      p_academic_year,
      p_semester,
      'PENDING',
      null,
      null,
      null
    )
    returning id into v_enrollment_id;

    insert into public.enrollment_subjects (enrollment_id, subject_id)
    select v_enrollment_id, s.id
    from public.subjects s
    where s.program_id = v_program_id
      and s.year_level = v_year_level
      and s.semester = p_semester;

    get diagnostics v_attached_subject_count = row_count;

    if v_attached_subject_count <> v_subject_count then
      raise exception 'Attached subject count did not match the configured subject count.';
    end if;

    select case when exists (
      select 1
      from public.official_student_records osr
      where osr.student_id_number = v_student_id_number
        and v_student_type = 'Incoming 1st Year Student'
        and lower(btrim(coalesce(osr.gender_sex, ''))) = 'female'
    ) then 'APPLICABLE' else 'NOT_APPLICABLE' end
    into v_health_requirement_applicability;

    insert into public.student_requirements (
      student_id,
      requirement_code,
      status,
      academic_year,
      semester,
      applicability,
      note,
      verified_at,
      verified_by
    )
    values (
      v_student_id,
      'HEALTH_RECORD_UPDATE',
      'PENDING',
      p_academic_year,
      p_semester,
      v_health_requirement_applicability,
      null,
      null,
      null
    )
    on conflict on constraint student_requirements_student_requirement_term_key
    do update set
      applicability = excluded.applicability,
      updated_at = now();
  exception
    when unique_violation then
      return query select 'duplicate'::text, null::uuid, 0;
      return;
    when others then
      return query select 'submission_failed'::text, null::uuid, 0;
      return;
  end;

  return query select 'submitted'::text, v_enrollment_id, v_attached_subject_count;
exception
  when others then
    return query select 'submission_failed'::text, null::uuid, 0;
end;
$$;

revoke all on function public.submit_standard_student_enrollment(text, text) from public;
revoke execute on function public.submit_standard_student_enrollment(text, text) from anon;
grant execute on function public.submit_standard_student_enrollment(text, text) to authenticated;

create or replace function public.update_enrollment_requirement_status(
  p_enrollment_id uuid,
  p_requirement_code text,
  p_status text,
  p_note text
)
returns table (
  outcome text,
  requirement_id uuid,
  requirement_status text,
  applicability text
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_enrollment public.enrollments%rowtype;
  v_student public.students%rowtype;
  v_official_gender text;
  v_note text;
  v_requirement_id uuid;
  v_previous_status public.requirement_status;
  v_applicability text;
begin
  if auth.uid() is null or not private.is_admin() then
    return query select 'unauthorized'::text, null::uuid, null::text, null::text;
    return;
  end if;

  if p_enrollment_id is null
    or p_requirement_code <> 'HEALTH_RECORD_UPDATE'
    or p_status is null
    or p_status not in ('PENDING', 'VERIFIED', 'REJECTED')
    or p_note is not null and (char_length(p_note) > 240 or p_note ~ '[[:cntrl:]]') then
    return query select 'invalid_request'::text, null::uuid, null::text, null::text;
    return;
  end if;

  select * into v_enrollment
  from public.enrollments
  where id = p_enrollment_id
  for update;

  if not found or v_enrollment.status <> 'PENDING'
    or v_enrollment.academic_year !~ '^\d{4}-\d{4}$'
    or v_enrollment.semester not in ('1st Semester', '2nd Semester') then
    return query select 'invalid_request'::text, null::uuid, null::text, null::text;
    return;
  end if;

  select * into v_student
  from public.students
  where id = v_enrollment.student_id
  for update;

  if not found then
    return query select 'invalid_request'::text, null::uuid, null::text, null::text;
    return;
  end if;

  select osr.gender_sex into v_official_gender
  from public.official_student_records osr
  where osr.student_id_number = v_student.student_id_number;

  v_applicability := case
    when v_student.student_type = 'Incoming 1st Year Student'
      and lower(btrim(coalesce(v_official_gender, ''))) = 'female'
      then 'APPLICABLE'
    else 'NOT_APPLICABLE'
  end;

  if v_applicability <> 'APPLICABLE' then
    return query select 'not_applicable'::text, null::uuid, null::text, v_applicability;
    return;
  end if;

  v_note := nullif(btrim(regexp_replace(coalesce(p_note, ''), '[[:space:]]+', ' ', 'g')), '');

  select sr.status into v_previous_status
  from public.student_requirements sr
  where sr.student_id = v_student.id
    and sr.requirement_code = p_requirement_code
    and sr.academic_year = v_enrollment.academic_year
    and sr.semester = v_enrollment.semester
  for update;

  insert into public.student_requirements (
    student_id,
    requirement_code,
    status,
    academic_year,
    semester,
    applicability,
    note,
    verified_at,
    verified_by
  )
  values (
    v_student.id,
    p_requirement_code,
    p_status::public.requirement_status,
    v_enrollment.academic_year,
    v_enrollment.semester,
    v_applicability,
    v_note,
    case when p_status = 'VERIFIED' then now() else null end,
    case when p_status = 'VERIFIED' then auth.uid() else null end
  )
  on conflict on constraint student_requirements_student_requirement_term_key
  do update set
    status = excluded.status,
    applicability = excluded.applicability,
    note = excluded.note,
    verified_at = excluded.verified_at,
    verified_by = excluded.verified_by,
    updated_at = now()
  returning id into v_requirement_id;

  if v_previous_status is distinct from p_status::public.requirement_status then
    insert into public.audit_logs (
      actor_profile_id,
      action,
      target_table,
      target_id
    )
    values (
      auth.uid(),
      'UPDATE_STUDENT_REQUIREMENT_STATUS',
      'student_requirements',
      v_requirement_id
    );
  end if;

  return query select 'updated'::text, v_requirement_id, p_status, v_applicability;
end;
$$;

revoke all on function public.update_enrollment_requirement_status(uuid, text, text, text) from public;
revoke execute on function public.update_enrollment_requirement_status(uuid, text, text, text) from anon;
grant execute on function public.update_enrollment_requirement_status(uuid, text, text, text) to authenticated;

create or replace function public.review_pending_enrollment(
  p_enrollment_id uuid,
  p_decision text,
  p_remarks text
)
returns table (
  outcome text,
  enrollment_id uuid,
  review_status text,
  student_enrollment_status text
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_enrollment public.enrollments%rowtype;
  v_student public.students%rowtype;
  v_remarks text;
  v_student_status text;
  v_health_requirement_applies boolean;
begin
  if auth.uid() is null or not private.is_admin() then
    return query select 'unauthorized'::text, null::uuid, null::text, null::text;
    return;
  end if;

  if p_enrollment_id is null
    or p_decision is null
    or p_decision not in ('APPROVED', 'REJECTED') then
    return query select 'invalid_request'::text, null::uuid, null::text, null::text;
    return;
  end if;

  select * into v_enrollment
  from public.enrollments
  where id = p_enrollment_id
  for update;

  if not found then
    return query select 'not_found'::text, null::uuid, null::text, null::text;
    return;
  end if;

  if v_enrollment.status <> 'PENDING' then
    return query select 'already_reviewed'::text, v_enrollment.id, v_enrollment.status, null::text;
    return;
  end if;

  select * into v_student
  from public.students
  where id = v_enrollment.student_id
  for update;

  if not found then
    return query select 'invalid_request'::text, null::uuid, null::text, null::text;
    return;
  end if;

  select exists (
    select 1
    from public.official_student_records osr
    where osr.student_id_number = v_student.student_id_number
      and v_student.student_type = 'Incoming 1st Year Student'
      and lower(btrim(coalesce(osr.gender_sex, ''))) = 'female'
  ) into v_health_requirement_applies;

  if p_decision = 'APPROVED'
    and v_health_requirement_applies
    and not exists (
      select 1
      from public.student_requirements sr
      where sr.student_id = v_student.id
        and sr.requirement_code = 'HEALTH_RECORD_UPDATE'
        and sr.academic_year = v_enrollment.academic_year
        and sr.semester = v_enrollment.semester
        and sr.applicability = 'APPLICABLE'
        and sr.status = 'VERIFIED'
    ) then
    return query select 'unverified_requirements'::text, v_enrollment.id, v_enrollment.status, null::text;
    return;
  end if;

  v_remarks := case
    when p_decision = 'REJECTED' then nullif(btrim(coalesce(p_remarks, '')), '')
    else null
  end;

  update public.enrollments
  set
    status = p_decision,
    reviewed_at = now(),
    reviewed_by = auth.uid(),
    remarks = v_remarks
  where id = v_enrollment.id;

  select case
    when exists (
      select 1
      from public.enrollments e
      where e.student_id = v_student.id
        and e.status = 'APPROVED'
    ) then 'ENROLLED'
    when exists (
      select 1
      from public.enrollments e
      where e.student_id = v_student.id
        and e.status = 'PENDING'
    ) then 'PENDING'
    else 'NOT ENROLLED'
  end into v_student_status;

  update public.students
  set enrollment_status = v_student_status
  where id = v_student.id;

  insert into public.audit_logs (
    actor_profile_id,
    action,
    target_table,
    target_id
  )
  values (
    auth.uid(),
    case when p_decision = 'APPROVED' then 'APPROVE_ENROLLMENT' else 'REJECT_ENROLLMENT' end,
    'enrollments',
    v_enrollment.id
  );

  return query select lower(p_decision), v_enrollment.id, p_decision, v_student_status;
end;
$$;

revoke all on function public.review_pending_enrollment(uuid, text, text) from public;
revoke execute on function public.review_pending_enrollment(uuid, text, text) from anon;
grant execute on function public.review_pending_enrollment(uuid, text, text) to authenticated;
