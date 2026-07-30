-- Schema linkage, deterministic backfill, and atomic account synchronization RPC
drop function if exists public.claim_student_profile(uuid, uuid);

alter table public.students
add column if not exists official_record_id uuid unique references public.official_student_records(id) on delete set null;

-- Deterministic backfill of exact legacy records
do $$
begin
  update public.students s
  set official_record_id = matched.record_id
  from (
    select s_inner.id as student_id, r_inner.id as record_id
    from public.students s_inner
    join public.profiles p_inner on p_inner.id = s_inner.profile_id
    join public.official_student_records r_inner
      on lower(trim(r_inner.email)) = lower(trim(p_inner.email))
     and s_inner.student_id_number is not null
     and s_inner.student_id_number <> ''
     and trim(r_inner.student_id_number) = trim(s_inner.student_id_number)
    where s_inner.official_record_id is null
      and (
        select count(*)
        from public.students s_check
        join public.profiles p_check on p_check.id = s_check.profile_id
        where lower(trim(r_inner.email)) = lower(trim(p_check.email))
          and s_check.student_id_number is not null
          and trim(r_inner.student_id_number) = trim(s_check.student_id_number)
      ) = 1
      and (
        select count(*)
        from public.official_student_records r_check
        where lower(trim(r_check.email)) = lower(trim(p_inner.email))
          and s_inner.student_id_number is not null
          and trim(r_check.student_id_number) = trim(s_inner.student_id_number)
      ) = 1
  ) matched
  where s.id = matched.student_id;
end $$;

-- Atomic official-record update and safe account synchronization
create or replace function public.update_official_student_record_and_sync(
  p_record_id uuid,
  p_student_id_number text,
  p_first_name text,
  p_last_name text,
  p_email text,
  p_program_id uuid,
  p_year_level text,
  p_student_type text,
  p_birthdate text default null,
  p_gender_sex text default null,
  p_address text default null,
  p_contact_number text default null,
  p_guardian text default null,
  p_emergency_contact_person text default null,
  p_nationality text default null,
  p_civil_status text default null,
  p_previous_school_information text default null,
  p_admission_status text default null,
  p_enrollment_status text default 'NOT ENROLLED'
)
returns table (
  outcome text,
  record_id uuid,
  email_mismatch boolean
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_caller_id uuid;
  v_record record;
  v_student record;
  v_profile record;
  v_clean_student_id text;
  v_clean_email text;
  v_email_mismatch boolean := false;
begin
  v_caller_id := auth.uid();
  if v_caller_id is null or not private.is_admin() then
    return query select 'unauthorized'::text, p_record_id, false;
    return;
  end if;

  v_clean_student_id := nullif(trim(p_student_id_number), '');
  v_clean_email := lower(trim(p_email));

  select * into v_record
  from public.official_student_records
  where id = p_record_id
  for update;

  if not found then
    return query select 'record_not_found'::text, p_record_id, false;
    return;
  end if;

  if v_clean_student_id is not null then
    if exists (
      select 1 from public.official_student_records
      where id <> p_record_id and trim(student_id_number) = v_clean_student_id
    ) then
      return query select 'student_id_conflict'::text, p_record_id, false;
      return;
    end if;

    if exists (
      select 1 from public.students
      where (official_record_id is null or official_record_id <> p_record_id)
        and trim(student_id_number) = v_clean_student_id
    ) then
      return query select 'student_id_conflict'::text, p_record_id, false;
      return;
    end if;
  end if;

  update public.official_student_records
  set
    student_id_number = v_clean_student_id,
    first_name = trim(p_first_name),
    last_name = trim(p_last_name),
    email = v_clean_email,
    program_id = p_program_id,
    year_level = p_year_level,
    student_type = p_student_type,
    birthdate = nullif(trim(p_birthdate), ''),
    gender_sex = nullif(trim(p_gender_sex), ''),
    address = nullif(trim(p_address), ''),
    contact_number = nullif(trim(p_contact_number), ''),
    guardian = nullif(trim(p_guardian), ''),
    emergency_contact_person = nullif(trim(p_emergency_contact_person), ''),
    nationality = nullif(trim(p_nationality), ''),
    civil_status = nullif(trim(p_civil_status), ''),
    previous_school_information = nullif(trim(p_previous_school_information), ''),
    admission_status = nullif(trim(p_admission_status), ''),
    enrollment_status = p_enrollment_status,
    updated_at = now()
  where id = p_record_id;

  select * into v_student
  from public.students
  where official_record_id = p_record_id
  for update;

  if found then
    select * into v_profile
    from public.profiles
    where id = v_student.profile_id
    for update;

    if found then
      if lower(trim(v_profile.email)) <> v_clean_email then
        v_email_mismatch := true;
      end if;

      update public.profiles
      set
        first_name = trim(p_first_name),
        last_name = trim(p_last_name),
        updated_at = now()
      where id = v_student.profile_id;
    end if;

    update public.students
    set
      program_id = p_program_id,
      year_level = p_year_level,
      student_type = p_student_type,
      student_id_number = v_clean_student_id,
      updated_at = now()
    where id = v_student.id;
  end if;

  return query select 'updated'::text, p_record_id, v_email_mismatch;
end;
$$;

revoke all on function public.update_official_student_record_and_sync from public;
revoke execute on function public.update_official_student_record_and_sync from anon;
grant execute on function public.update_official_student_record_and_sync to authenticated;
