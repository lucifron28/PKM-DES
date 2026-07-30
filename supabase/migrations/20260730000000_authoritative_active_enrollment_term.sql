-- Create normalized enrollment terms model
create table if not exists public.enrollment_terms (
  id uuid primary key default gen_random_uuid(),
  academic_year text not null check (academic_year ~ '^[0-9]{4}-[0-9]{4}$'),
  semester text not null check (semester in ('1st Semester', '2nd Semester', 'Summer')),
  enrollment_open boolean not null default true,
  is_active boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint enrollment_terms_academic_year_semester_key unique (academic_year, semester)
);

create unique index if not exists enrollment_terms_active_idx on public.enrollment_terms (is_active) where is_active = true;

alter table public.enrollment_terms enable row level security;

drop policy if exists "Authenticated users can read enrollment terms" on public.enrollment_terms;
create policy "Authenticated users can read enrollment terms"
  on public.enrollment_terms
  for select
  to authenticated
  using (true);

-- Seed initial active term: AY 2026-2027, 1st Semester
insert into public.enrollment_terms (academic_year, semester, enrollment_open, is_active)
values ('2026-2027', '1st Semester', true, true)
on conflict (academic_year, semester) do update set
  enrollment_open = true,
  is_active = true;

-- Update submit_standard_student_enrollment to validate against database active term
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
  v_active_academic_year text;
  v_active_semester text;
  v_active_enrollment_open boolean;
begin
  if auth.uid() is null then
    return query select 'invalid_student_record'::text, null::uuid, 0;
    return;
  end if;

  -- Validate against authoritative database active term
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
