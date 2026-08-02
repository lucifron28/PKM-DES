-- Add explicit, term-scoped standard-load configuration for every program.
-- Historical course_offerings rows remain historical source data and are not
-- promoted to the active term by this migration.

create table if not exists public.standard_load_sets (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.programs(id) on delete restrict,
  academic_year text not null check (academic_year ~ '^[0-9]{4}-[0-9]{4}$'),
  semester text not null check (semester in ('1st Semester', '2nd Semester', 'Summer')),
  year_level text not null check (year_level in ('1st Year', '2nd Year', '3rd Year', '4th Year')),
  status text not null default 'DRAFT' check (status in ('DRAFT', 'ACTIVE')),
  expected_course_count integer not null check (expected_course_count > 0),
  expected_total_units integer not null check (expected_total_units >= 0),
  source_document text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint standard_load_sets_program_term_year_key
    unique (program_id, academic_year, semester, year_level)
);

create index if not exists idx_standard_load_sets_active_lookup
  on public.standard_load_sets (program_id, academic_year, semester, year_level)
  where status = 'ACTIVE';

alter table public.standard_load_sets enable row level security;

drop policy if exists "Authenticated users can read active standard loads" on public.standard_load_sets;
create policy "Authenticated users can read active standard loads"
  on public.standard_load_sets
  for select
  to authenticated
  using (status = 'ACTIVE');

drop policy if exists "Admins manage standard loads" on public.standard_load_sets;
create policy "Admins manage standard loads"
  on public.standard_load_sets
  for all
  to authenticated
  using (private.is_admin())
  with check (private.is_admin());

alter table public.enrollment_subjects
  add column if not exists course_offering_id uuid;

alter table public.enrollment_subjects
  add column if not exists course_code text;

alter table public.enrollment_subjects
  add column if not exists course_description text;

alter table public.enrollment_subjects
  add column if not exists units integer;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'enrollment_subjects_course_offering_id_fkey'
      and conrelid = 'public.enrollment_subjects'::regclass
  ) then
    alter table public.enrollment_subjects
      add constraint enrollment_subjects_course_offering_id_fkey
      foreign key (course_offering_id)
      references public.course_offerings(id)
      on delete restrict;
  end if;
end;
$$;

update public.enrollment_subjects es
set
  course_code = s.course_code,
  course_description = s.course_description,
  units = s.units
from public.subjects s
where es.subject_id = s.id
  and (es.course_code is null or es.course_description is null or es.units is null);

alter table public.enrollment_subjects
  alter column subject_id drop not null;

alter table public.enrollment_subjects
  alter column course_code set not null;

alter table public.enrollment_subjects
  alter column course_description set not null;

alter table public.enrollment_subjects
  alter column units set not null;

alter table public.enrollment_subjects
  drop constraint if exists enrollment_subjects_enrollment_id_subject_id_key;

alter table public.enrollment_subjects
  drop constraint if exists enrollment_subjects_exactly_one_source;

alter table public.enrollment_subjects
  add constraint enrollment_subjects_exactly_one_source
  check ((subject_id is null) <> (course_offering_id is null));

create unique index if not exists enrollment_subjects_legacy_subject_unique
  on public.enrollment_subjects (enrollment_id, subject_id)
  where subject_id is not null;

create unique index if not exists enrollment_subjects_course_offering_unique
  on public.enrollment_subjects (enrollment_id, course_offering_id)
  where course_offering_id is not null;

create index if not exists idx_enrollment_subjects_course_offering_id
  on public.enrollment_subjects (course_offering_id)
  where course_offering_id is not null;

-- Replace the old BSAIS-only function with a generic configured-load path.
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
  v_year_level text;
  v_student_type text;
  v_load_status text;
  v_expected_course_count integer;
  v_expected_total_units integer;
  v_source_document text;
  v_offering_count integer;
  v_offering_total_units integer;
  v_attached_subject_count integer;
  v_enrollment_id uuid;
  v_health_requirement_applicability text;
  v_active_academic_year text;
  v_active_semester text;
  v_active_enrollment_open boolean;
begin
  if auth.uid() is null then
    return query select 'invalid_student_record'::text, null::uuid, 0;
    return;
  end if;

  select academic_year, semester, enrollment_open
  into v_active_academic_year, v_active_semester, v_active_enrollment_open
  from public.enrollment_terms
  where is_active = true
  limit 1;

  if not found or v_active_academic_year is null or v_active_semester is null then
    return query select 'term_unavailable'::text, null::uuid, 0;
    return;
  end if;

  if not v_active_enrollment_open then
    return query select 'term_not_open'::text, null::uuid, 0;
    return;
  end if;

  if p_academic_year is distinct from v_active_academic_year
    or p_semester is distinct from v_active_semester then
    return query select 'term_not_open'::text, null::uuid, 0;
    return;
  end if;

  select
    s.id,
    s.student_id_number,
    s.program_id,
    s.year_level,
    s.student_type
  into
    v_student_id,
    v_student_id_number,
    v_program_id,
    v_year_level,
    v_student_type
  from public.profiles p
  join public.students s on s.profile_id = p.id
  where p.id = auth.uid()
    and p.role = 'student'
    and p.account_status = 'ACTIVE'
  for update of s;

  if not found or v_student_id is null or v_program_id is null then
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

  select
    sls.status,
    sls.expected_course_count,
    sls.expected_total_units,
    sls.source_document
  into
    v_load_status,
    v_expected_course_count,
    v_expected_total_units,
    v_source_document
  from public.standard_load_sets sls
  where sls.program_id = v_program_id
    and sls.academic_year = p_academic_year
    and sls.semester = p_semester
    and sls.year_level = v_year_level;

  if not found then
    return query select 'no_configured_load'::text, null::uuid, 0;
    return;
  end if;

  if v_load_status <> 'ACTIVE' or v_expected_course_count <= 0 then
    return query select 'incomplete_configured_load'::text, null::uuid, 0;
    return;
  end if;

  select
    count(*)::integer,
    coalesce(sum(co.units), 0)::integer
  into v_offering_count, v_offering_total_units
  from public.course_offerings co
  where co.program_id = v_program_id
    and co.academic_year = p_academic_year
    and co.semester = p_semester
    and co.year_level = v_year_level
    and co.source_document = v_source_document;

  if v_offering_count <> v_expected_course_count
    or v_offering_total_units <> v_expected_total_units then
    return query select 'incomplete_configured_load'::text, null::uuid, 0;
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

    insert into public.enrollment_subjects (
      enrollment_id,
      subject_id,
      course_offering_id,
      course_code,
      course_description,
      units
    )
    select
      v_enrollment_id,
      null,
      co.id,
      co.course_code,
      co.course_description,
      co.units
    from public.course_offerings co
    where co.program_id = v_program_id
      and co.academic_year = p_academic_year
      and co.semester = p_semester
      and co.year_level = v_year_level
      and co.source_document = v_source_document;

    get diagnostics v_attached_subject_count = row_count;

    if v_attached_subject_count <> v_expected_course_count then
      raise exception 'Attached course offering count did not match the configured load.';
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
