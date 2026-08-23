-- Health Record / Nurse Clearance applicability synchronization & decoupled workflow
--
-- 1. All students require Nurse Health Clearance (HEALTH_CLEARANCE).
-- 2. The special Health Record Update form (HEALTH_RECORD_UPDATE) applies only to:
--    - Transferee (all sexes); OR
--    - Incoming 1st Year Student + Female in official record.
-- 3. Standard students receive standard Nurse Health Clearance E-Signature.
-- 4. Centralizes canonical applicability rules, reconciliation, write guards,
--    and atomic signing RPCs with strict bypass prevention.

-- Domain table grants
grant select, insert, update on table public.profiles to authenticated;
grant select on table public.official_student_records to authenticated;
grant select on table public.students to authenticated;
grant select on table public.programs to authenticated;
grant select on table public.enrollments to authenticated;
grant select on table public.enrollment_subjects to authenticated;
grant select on table public.enrollment_terms to authenticated;
grant select on table public.course_offerings to authenticated;
grant select on table public.standard_load_sets to authenticated;
grant select on table public.subjects to authenticated;
grant select on table public.student_requirements to authenticated;
grant select on table public.enrollment_clearances to authenticated;
grant select on table public.enrollment_signatures to authenticated;
grant select on table public.official_role_assignments to authenticated;

-- Allow Nurse signature to carry either HEALTH_RECORD (special form) or ENROLLMENT_CLEARANCE (standard clearance)
alter table public.enrollment_signatures
  drop constraint if exists enrollment_signatures_role_clearance_document_check;

alter table public.enrollment_signatures
  add constraint enrollment_signatures_role_clearance_document_check check (
    (signer_role = 'STUDENT'
      and clearance_type = 'STUDENT_ENROLLMENT_SIGNATURE'
      and document_type = 'ENROLLMENT_REGISTRATION')
    or (signer_role = 'LIBRARIAN'
      and clearance_type = 'LIBRARY_CLEARANCE'
      and document_type = 'ENROLLMENT_CLEARANCE')
    or (signer_role = 'NURSE'
      and clearance_type = 'HEALTH_CLEARANCE'
      and document_type in ('HEALTH_RECORD', 'ENROLLMENT_CLEARANCE'))
    or (signer_role = 'PROGRAM_CHAIR'
      and clearance_type = 'PROGRAM_CLEARANCE'
      and document_type = 'ENROLLMENT_CLEARANCE')
    or (signer_role = 'ACCOUNTANT'
      and clearance_type = 'ACCOUNTING_CLEARANCE'
      and document_type = 'ENROLLMENT_CLEARANCE')
    or (signer_role = 'DEAN'
      and clearance_type = 'DEAN_CLEARANCE'
      and document_type = 'ENROLLMENT_CLEARANCE')
  );

-- 1. Canonical Special Health Requirement Applicability Helper
create or replace function private.get_health_requirement_applicability(p_student_id uuid)
returns text
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_student_type text;
  v_gender_sex text;
begin
  if p_student_id is null then
    return 'NOT_APPLICABLE';
  end if;

  select
    s.student_type,
    osr.gender_sex
  into
    v_student_type,
    v_gender_sex
  from public.students s
  left join public.official_student_records osr
    on osr.id = s.official_record_id
    or (
      s.official_record_id is null
      and s.student_id_number is not null
      and s.student_id_number <> ''
      and osr.student_id_number = s.student_id_number
    )
  where s.id = p_student_id;

  if not found or v_student_type is null then
    return 'NOT_APPLICABLE';
  end if;

  if v_student_type = 'Transferee'
     or (
       v_student_type = 'Incoming 1st Year Student'
       and lower(btrim(coalesce(v_gender_sex, ''))) = 'female'
     ) then
    return 'APPLICABLE';
  else
    return 'NOT_APPLICABLE';
  end if;
end;
$$;

revoke all on function private.get_health_requirement_applicability(uuid) from public;

-- 2. Decoupled Health Clearance Currentness Helper
create or replace function private.health_clearance_is_current(p_enrollment_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.enrollments e
    join public.students s on s.id = e.student_id
    left join public.student_requirements sr
      on sr.student_id = s.id
      and sr.requirement_code = 'HEALTH_RECORD_UPDATE'
      and sr.academic_year = e.academic_year
      and sr.semester = e.semester
    join public.enrollment_clearances ec
      on ec.enrollment_id = e.id
      and ec.clearance_type = 'HEALTH_CLEARANCE'
      and ec.status = 'SIGNED'
    join lateral (
      select es_inner.*
      from public.enrollment_signatures es_inner
      where es_inner.enrollment_id = e.id
        and es_inner.student_id = s.id
        and es_inner.signer_role = 'NURSE'
        and es_inner.clearance_type = 'HEALTH_CLEARANCE'
      order by es_inner.signed_at desc, es_inner.id desc
      limit 1
    ) es on true
    where e.id = p_enrollment_id
      and (
        -- Mode A: Special Health Record Form is required
        (
          private.get_health_requirement_applicability(s.id) = 'APPLICABLE'
          and sr.applicability = 'APPLICABLE'
          and sr.status = 'VERIFIED'
          and es.document_type = 'HEALTH_RECORD'
          and es.document_hash = private.health_record_document_hash(
            e.id,
            s.id,
            e.academic_year,
            e.semester,
            sr.applicability,
            sr.status::text
          )
        )
        -- Mode B: Standard Nurse Health Clearance
        or (
          private.get_health_requirement_applicability(s.id) = 'NOT_APPLICABLE'
          and es.document_type = 'ENROLLMENT_CLEARANCE'
          and es.document_hash = private.enrollment_document_hash(
            e.id,
            'NURSE',
            'HEALTH_CLEARANCE',
            'ENROLLMENT_CLEARANCE'
          )
        )
      )
  );
$$;

revoke all on function private.health_clearance_is_current(uuid) from public;

-- 2b. Authoritative Check for All 6 Required Clearances
create or replace function private.enrollment_required_clearances_are_current(p_enrollment_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    -- 1. Health Clearance must be current (supporting either Special or Standard mode)
    private.health_clearance_is_current(p_enrollment_id)
    -- 2. Student signature must be current
    and exists (
      select 1
      from public.enrollments e
      join public.students s on s.id = e.student_id
      join public.enrollment_clearances ec
        on ec.enrollment_id = e.id
        and ec.clearance_type = 'STUDENT_ENROLLMENT_SIGNATURE'
        and ec.status = 'SIGNED'
      join lateral (
        select es_inner.*
        from public.enrollment_signatures es_inner
        where es_inner.enrollment_id = e.id
          and es_inner.student_id = s.id
          and es_inner.signer_role = 'STUDENT'
          and es_inner.clearance_type = 'STUDENT_ENROLLMENT_SIGNATURE'
          and es_inner.document_type = 'ENROLLMENT_REGISTRATION'
        order by es_inner.signed_at desc, es_inner.id desc
        limit 1
      ) es on true
      where e.id = p_enrollment_id
        and es.document_hash = private.enrollment_document_hash(
          e.id,
          'STUDENT',
          'STUDENT_ENROLLMENT_SIGNATURE',
          'ENROLLMENT_REGISTRATION'
        )
    )
    -- 3. Library Clearance must be current
    and exists (
      select 1
      from public.enrollments e
      join public.students s on s.id = e.student_id
      join public.enrollment_clearances ec
        on ec.enrollment_id = e.id
        and ec.clearance_type = 'LIBRARY_CLEARANCE'
        and ec.status = 'SIGNED'
      join lateral (
        select es_inner.*
        from public.enrollment_signatures es_inner
        where es_inner.enrollment_id = e.id
          and es_inner.student_id = s.id
          and es_inner.signer_role = 'LIBRARIAN'
          and es_inner.clearance_type = 'LIBRARY_CLEARANCE'
          and es_inner.document_type = 'ENROLLMENT_CLEARANCE'
        order by es_inner.signed_at desc, es_inner.id desc
        limit 1
      ) es on true
      where e.id = p_enrollment_id
        and es.document_hash = private.enrollment_document_hash(
          e.id,
          'LIBRARIAN',
          'LIBRARY_CLEARANCE',
          'ENROLLMENT_CLEARANCE'
        )
    )
    -- 4. Program Clearance must be current
    and exists (
      select 1
      from public.enrollments e
      join public.students s on s.id = e.student_id
      join public.enrollment_clearances ec
        on ec.enrollment_id = e.id
        and ec.clearance_type = 'PROGRAM_CLEARANCE'
        and ec.status = 'SIGNED'
      join lateral (
        select es_inner.*
        from public.enrollment_signatures es_inner
        where es_inner.enrollment_id = e.id
          and es_inner.student_id = s.id
          and es_inner.signer_role = 'PROGRAM_CHAIR'
          and es_inner.clearance_type = 'PROGRAM_CLEARANCE'
          and es_inner.document_type = 'ENROLLMENT_CLEARANCE'
        order by es_inner.signed_at desc, es_inner.id desc
        limit 1
      ) es on true
      where e.id = p_enrollment_id
        and es.document_hash = private.enrollment_document_hash(
          e.id,
          'PROGRAM_CHAIR',
          'PROGRAM_CLEARANCE',
          'ENROLLMENT_CLEARANCE'
        )
    )
    -- 5. Accounting Clearance must be current
    and exists (
      select 1
      from public.enrollments e
      join public.students s on s.id = e.student_id
      join public.enrollment_clearances ec
        on ec.enrollment_id = e.id
        and ec.clearance_type = 'ACCOUNTING_CLEARANCE'
        and ec.status = 'SIGNED'
      join lateral (
        select es_inner.*
        from public.enrollment_signatures es_inner
        where es_inner.enrollment_id = e.id
          and es_inner.student_id = s.id
          and es_inner.signer_role = 'ACCOUNTANT'
          and es_inner.clearance_type = 'ACCOUNTING_CLEARANCE'
          and es_inner.document_type = 'ENROLLMENT_CLEARANCE'
        order by es_inner.signed_at desc, es_inner.id desc
        limit 1
      ) es on true
      where e.id = p_enrollment_id
        and es.document_hash = private.enrollment_document_hash(
          e.id,
          'ACCOUNTANT',
          'ACCOUNTING_CLEARANCE',
          'ENROLLMENT_CLEARANCE'
        )
    )
    -- 6. Dean Clearance must be current
    and exists (
      select 1
      from public.enrollments e
      join public.students s on s.id = e.student_id
      join public.enrollment_clearances ec
        on ec.enrollment_id = e.id
        and ec.clearance_type = 'DEAN_CLEARANCE'
        and ec.status = 'SIGNED'
      join lateral (
        select es_inner.*
        from public.enrollment_signatures es_inner
        where es_inner.enrollment_id = e.id
          and es_inner.student_id = s.id
          and es_inner.signer_role = 'DEAN'
          and es_inner.clearance_type = 'DEAN_CLEARANCE'
          and es_inner.document_type = 'ENROLLMENT_CLEARANCE'
        order by es_inner.signed_at desc, es_inner.id desc
        limit 1
      ) es on true
      where e.id = p_enrollment_id
        and es.document_hash = private.enrollment_document_hash(
          e.id,
          'DEAN',
          'DEAN_CLEARANCE',
          'ENROLLMENT_CLEARANCE'
        )
    );
$$;

revoke all on function private.enrollment_required_clearances_are_current(uuid) from public;

-- 3. Health Requirement Write Guard
create or replace function private.prevent_unscoped_health_requirement_verification()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
  v_nurse_transaction boolean := coalesce(current_setting('pkm.health_requirement_mutation', true), 'false') = 'true';
  v_reconcile_transaction boolean := coalesce(current_setting('pkm.health_applicability_reconciliation', true), 'false') = 'true';
begin
  if new.requirement_code = 'HEALTH_RECORD_UPDATE' then
    if tg_op = 'INSERT' then
      if new.status <> 'PENDING' and not v_nurse_transaction then
        raise exception 'Health Record Update writes require the dedicated Nurse transaction.';
      end if;
    elsif tg_op = 'UPDATE' then
      if v_reconcile_transaction then
        if new.status not in ('PENDING') and new.status is distinct from old.status then
          raise exception 'Health applicability reconciliation cannot set non-pending status.';
        end if;
      elsif (
        new.status is distinct from old.status
        or new.note is distinct from old.note
        or new.verified_at is distinct from old.verified_at
        or new.verified_by is distinct from old.verified_by
        or new.applicability is distinct from old.applicability
      ) and not v_nurse_transaction then
        raise exception 'Health Record Update status changes require the dedicated Nurse transaction.';
      end if;
    end if;
  end if;

  return new;
end;
$$;

-- 4. Controlled Idempotent Reconciliation Function
create or replace function private.reconcile_health_requirement_for_student(p_student_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_new_applicability text;
  v_special_applicable boolean;
  v_enrollment record;
  v_requirement public.student_requirements%rowtype;
  v_clearance_status text;
  v_clearance_exists boolean;
  v_mode_changed boolean;
  v_is_current boolean;
  v_had_signed_signature boolean;
begin
  if p_student_id is null then
    return;
  end if;

  v_new_applicability := private.get_health_requirement_applicability(p_student_id);
  v_special_applicable := (v_new_applicability = 'APPLICABLE');

  perform set_config('pkm.health_applicability_reconciliation', 'true', true);

  -- Focus on mutable / current workflow records: PENDING enrollments
  for v_enrollment in
    select e.id, e.academic_year, e.semester
    from public.enrollments e
    where e.student_id = p_student_id
      and e.status = 'PENDING'
    for update of e
  loop
    -- 1. Reconcile student_requirements row for special form
    select * into v_requirement
    from public.student_requirements sr
    where sr.student_id = p_student_id
      and sr.requirement_code = 'HEALTH_RECORD_UPDATE'
      and sr.academic_year = v_enrollment.academic_year
      and sr.semester = v_enrollment.semester
    for update;

    if not found then
      v_mode_changed := false;
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
        p_student_id,
        'HEALTH_RECORD_UPDATE',
        'PENDING',
        v_enrollment.academic_year,
        v_enrollment.semester,
        v_new_applicability,
        null,
        null,
        null
      );
    else
      v_mode_changed := (v_requirement.applicability is distinct from v_new_applicability);

      if v_special_applicable then
        if v_mode_changed then
          update public.student_requirements
          set
            applicability = 'APPLICABLE',
            status = 'PENDING',
            verified_at = null,
            verified_by = null,
            updated_at = now()
          where id = v_requirement.id;
        end if;
      else
        -- Special form not required
        if v_mode_changed or v_requirement.status <> 'PENDING' or v_requirement.verified_at is not null then
          update public.student_requirements
          set
            applicability = 'NOT_APPLICABLE',
            status = 'PENDING',
            verified_at = null,
            verified_by = null,
            updated_at = now()
          where id = v_requirement.id;
        end if;
      end if;
    end if;

    -- 2. Reconcile enrollment_clearances row (HEALTH_CLEARANCE is ALWAYS required for every student)
    select ec.status into v_clearance_status
    from public.enrollment_clearances ec
    where ec.enrollment_id = v_enrollment.id
      and ec.clearance_type = 'HEALTH_CLEARANCE'
    for update;

    v_clearance_exists := found;

    select exists (
      select 1
      from public.enrollment_signatures es
      where es.enrollment_id = v_enrollment.id
        and es.clearance_type = 'HEALTH_CLEARANCE'
        and es.signer_role = 'NURSE'
    ) into v_had_signed_signature;

    if not v_clearance_exists then
      insert into public.enrollment_clearances (enrollment_id, clearance_type, status)
      values (
        v_enrollment.id,
        'HEALTH_CLEARANCE',
        case when v_mode_changed then (case when v_had_signed_signature then 'INVALIDATED' else 'PENDING' end)
             when private.health_clearance_is_current(v_enrollment.id) then 'SIGNED'
             else 'PENDING' end
      )
      on conflict (enrollment_id, clearance_type)
      do update set
        status = excluded.status,
        updated_at = now();
    elsif v_mode_changed then
      -- When workflow mode changes, previous evidence MUST NOT satisfy the new mode automatically.
      update public.enrollment_clearances
      set
        status = case when v_had_signed_signature then 'INVALIDATED' else 'PENDING' end,
        updated_at = now()
      where enrollment_id = v_enrollment.id
        and clearance_type = 'HEALTH_CLEARANCE';
    else
      v_is_current := private.health_clearance_is_current(v_enrollment.id);

      if v_is_current then
        if v_clearance_status <> 'SIGNED' then
          update public.enrollment_clearances
          set status = 'SIGNED', updated_at = now()
          where enrollment_id = v_enrollment.id
            and clearance_type = 'HEALTH_CLEARANCE';
        end if;
      else
        if v_clearance_status = 'SIGNED' then
          update public.enrollment_clearances
          set status = 'INVALIDATED', updated_at = now()
          where enrollment_id = v_enrollment.id
            and clearance_type = 'HEALTH_CLEARANCE';
        elsif v_clearance_status = 'NOT_APPLICABLE' then
          update public.enrollment_clearances
          set status = 'PENDING', updated_at = now()
          where enrollment_id = v_enrollment.id
            and clearance_type = 'HEALTH_CLEARANCE';
        end if;
      end if;
    end if;
  end loop;
end;
$$;
revoke all on function private.reconcile_health_requirement_for_student(uuid) from public;

-- 5. Triggers on Authoritative Data Changes
create or replace function private.reconcile_health_on_official_record_change()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_student_id uuid;
begin
  for v_student_id in
    select s.id
    from public.students s
    where s.official_record_id = new.id
       or (
         s.official_record_id is null
         and s.student_id_number is not null
         and s.student_id_number <> ''
         and (s.student_id_number = new.student_id_number or s.student_id_number = old.student_id_number)
       )
  loop
    perform private.reconcile_health_requirement_for_student(v_student_id);
  end loop;
  return new;
end;
$$;

drop trigger if exists reconcile_health_after_official_record_change on public.official_student_records;
create trigger reconcile_health_after_official_record_change
after update of student_type, gender_sex, student_id_number on public.official_student_records
for each row execute function private.reconcile_health_on_official_record_change();

create or replace function private.reconcile_health_on_student_change()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if (
    old.student_type is distinct from new.student_type
    or old.official_record_id is distinct from new.official_record_id
    or old.student_id_number is distinct from new.student_id_number
  ) then
    perform private.reconcile_health_requirement_for_student(new.id);
  end if;
  return new;
end;
$$;

drop trigger if exists reconcile_health_after_student_change on public.students;
create trigger reconcile_health_after_student_change
after update of student_type, official_record_id, student_id_number on public.students
for each row execute function private.reconcile_health_on_student_change();

-- 6. Update Invalidation Trigger on Official Record Change (Scoped to mutable pending enrollments)
create or replace function private.invalidate_health_clearance_on_official_record_change()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  update public.enrollment_clearances ec
  set status = 'INVALIDATED', updated_at = now()
  from public.enrollments e
  join public.students s on s.id = e.student_id
  where ec.enrollment_id = e.id
    and ec.clearance_type = 'HEALTH_CLEARANCE'
    and ec.status = 'SIGNED'
    and e.status = 'PENDING'
    and (
      s.official_record_id = new.id
      or s.official_record_id = old.id
      or (
        s.official_record_id is null
        and s.student_id_number is not null
        and s.student_id_number <> ''
        and (s.student_id_number = new.student_id_number or s.student_id_number = old.student_id_number)
      )
    );
  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

create or replace function private.invalidate_health_clearance_on_requirement_change()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.requirement_code = 'HEALTH_RECORD_UPDATE'
     and (
       old.status is distinct from new.status
       or old.applicability is distinct from new.applicability
       or old.academic_year is distinct from new.academic_year
       or old.semester is distinct from new.semester
     ) then
    update public.enrollment_clearances ec
    set status = 'INVALIDATED', updated_at = now()
    from public.enrollments e
    where ec.enrollment_id = e.id
      and ec.clearance_type = 'HEALTH_CLEARANCE'
      and ec.status = 'SIGNED'
      and e.status = 'PENDING'
      and e.student_id = new.student_id
      and e.academic_year = new.academic_year
      and e.semester = new.semester;
  end if;
  return new;
end;
$$;

-- 7. Update Official Record Synchronization RPC
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
    birthdate = case when nullif(trim(p_birthdate), '') is not null then nullif(trim(p_birthdate), '')::date else null end,
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

    perform private.reconcile_health_requirement_for_student(v_student.id);
  end if;

  return query select 'updated'::text, p_record_id, v_email_mismatch;
end;
$$;

revoke all on function public.update_official_student_record_and_sync from public;
revoke execute on function public.update_official_student_record_and_sync from anon;
grant execute on function public.update_official_student_record_and_sync to authenticated;

-- 8. Update Enrollment Submission
create or replace function private.submit_standard_student_enrollment_unlocked(
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

    v_health_requirement_applicability := private.get_health_requirement_applicability(v_student_id);

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
    on conflict (student_id, requirement_code, academic_year, semester)
    do update set
      applicability = excluded.applicability,
      updated_at = now();

    return query select 'submitted'::text, v_enrollment_id, v_attached_subject_count;
  exception
    when unique_violation then
      return query select 'duplicate'::text, null::uuid, 0;
  end;
end;
$$;

-- 9. Update Clearance Seeding (Every enrollment gets HEALTH_CLEARANCE = PENDING)
create or replace function private.seed_enrollment_clearances()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.enrollment_clearances (enrollment_id, clearance_type, status)
  values
    (new.id, 'LIBRARY_CLEARANCE', 'PENDING'),
    (new.id, 'PROGRAM_CLEARANCE', 'PENDING'),
    (new.id, 'ACCOUNTING_CLEARANCE', 'PENDING'),
    (new.id, 'DEAN_CLEARANCE', 'PENDING'),
    (new.id, 'STUDENT_ENROLLMENT_SIGNATURE', 'PENDING'),
    (new.id, 'HEALTH_CLEARANCE', 'PENDING')
  on conflict (enrollment_id, clearance_type) do nothing;

  return new;
end;
$$;

-- 10. Special Nurse Health Record Verification RPC
create or replace function public.verify_health_requirement_with_signature(
  p_enrollment_id uuid,
  p_signature_id uuid,
  p_signature_storage_path text,
  p_signature_hash text,
  p_document_hash text,
  p_verification_acknowledged boolean,
  p_note text
)
returns table (outcome text, requirement_id uuid, signature_id uuid, signed_at timestamptz)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_enrollment public.enrollments%rowtype;
  v_student public.students%rowtype;
  v_profile public.profiles%rowtype;
  v_requirement public.student_requirements%rowtype;
  v_expected_document_hash text;
  v_clearance_status text;
  v_note text;
  v_signed_at timestamptz := now();
begin
  if auth.uid() is null or not private.has_official_role('NURSE') then
    return query select 'unauthorized'::text, null::uuid, null::uuid, null::timestamptz;
    return;
  end if;

  if not coalesce(p_verification_acknowledged, false) then
    return query select 'acknowledgment_required'::text, null::uuid, null::uuid, null::timestamptz;
    return;
  end if;

  v_note := nullif(btrim(regexp_replace(coalesce(p_note, ''), '[[:space:]]+', ' ', 'g')), '');
  if p_enrollment_id is null
    or p_signature_id is null
    or p_signature_storage_path is null
    or p_signature_hash is null
    or p_signature_hash !~ '^[0-9a-f]{64}$'
    or p_document_hash is null
    or p_document_hash !~ '^[0-9a-f]{64}$'
    or p_signature_storage_path <> format('%s/NURSE/%s.png', p_enrollment_id, p_signature_id)
    or v_note is not null and (char_length(v_note) > 240 or v_note ~ '[[:cntrl:]]') then
    return query select 'invalid_request'::text, null::uuid, null::uuid, null::timestamptz;
    return;
  end if;

  select e.*
  into v_enrollment
  from public.enrollments e
  where e.id = p_enrollment_id
  for update;

  if not found then
    return query select 'not_found'::text, null::uuid, null::uuid, null::timestamptz;
    return;
  end if;

  select s.* into v_student
  from public.students s
  where s.id = v_enrollment.student_id
  for update;

  select p.* into v_profile
  from public.profiles p
  where p.id = auth.uid();

  if not private.has_official_role_for_program('NURSE', v_enrollment.program_id) then
    return query select 'unauthorized'::text, null::uuid, null::uuid, null::timestamptz;
    return;
  end if;

  if v_enrollment.status <> 'PENDING' then
    return query select 'not_signable'::text, null::uuid, null::uuid, null::timestamptz;
    return;
  end if;

  -- Must strictly require special form
  if private.get_health_requirement_applicability(v_student.id) <> 'APPLICABLE' then
    return query select 'special_form_not_required'::text, null::uuid, null::uuid, null::timestamptz;
    return;
  end if;

  select * into v_requirement
  from public.student_requirements sr
  where sr.student_id = v_student.id
    and sr.requirement_code = 'HEALTH_RECORD_UPDATE'
    and sr.academic_year = v_enrollment.academic_year
    and sr.semester = v_enrollment.semester
  for update;

  if not found or v_requirement.applicability <> 'APPLICABLE' then
    return query select 'requirement_unavailable'::text, null::uuid, null::uuid, null::timestamptz;
    return;
  end if;

  if v_requirement.status = 'VERIFIED' and private.health_clearance_is_current(v_enrollment.id) then
    return query select 'already_verified'::text, v_requirement.id, null::uuid, null::timestamptz;
    return;
  end if;

  v_expected_document_hash := private.health_record_document_hash(
    v_enrollment.id,
    v_student.id,
    v_enrollment.academic_year,
    v_enrollment.semester,
    'APPLICABLE',
    'VERIFIED'
  );

  if p_document_hash <> v_expected_document_hash then
    return query select 'fingerprint_mismatch'::text, v_requirement.id, null::uuid, null::timestamptz;
    return;
  end if;

  select ec.status
  into v_clearance_status
  from public.enrollment_clearances ec
  where ec.enrollment_id = v_enrollment.id
    and ec.clearance_type = 'HEALTH_CLEARANCE'
  for update;

  if v_clearance_status = 'SIGNED' then
    update public.enrollment_clearances
    set status = 'INVALIDATED', updated_at = now()
    where enrollment_id = v_enrollment.id
      and clearance_type = 'HEALTH_CLEARANCE';
  end if;

  perform set_config('pkm.health_requirement_mutation', 'true', true);

  update public.student_requirements
  set
    status = 'VERIFIED',
    note = v_note,
    verified_at = v_signed_at,
    verified_by = auth.uid(),
    updated_at = v_signed_at
  where id = v_requirement.id;

  insert into public.enrollment_signatures (
    id, enrollment_id, student_id, signer_profile_id, signer_role,
    clearance_type, document_type, signer_name_snapshot,
    signature_storage_path, signature_hash, document_hash, signed_at
  )
  values (
    p_signature_id,
    v_enrollment.id,
    v_student.id,
    auth.uid(),
    'NURSE',
    'HEALTH_CLEARANCE',
    'HEALTH_RECORD',
    btrim(concat_ws(' ', v_profile.first_name, v_profile.last_name)),
    p_signature_storage_path,
    p_signature_hash,
    p_document_hash,
    v_signed_at
  );

  insert into public.enrollment_clearances (enrollment_id, clearance_type, status)
  values (v_enrollment.id, 'HEALTH_CLEARANCE', 'SIGNED')
  on conflict (enrollment_id, clearance_type)
  do update set status = 'SIGNED', updated_at = now();

  insert into public.audit_logs (actor_profile_id, action, target_table, target_id)
  values (auth.uid(), 'NURSE_VERIFY_HEALTH_REQUIREMENT', 'student_requirements', v_requirement.id);

  return query select 'signed'::text, v_requirement.id, p_signature_id, v_signed_at;
exception
  when unique_violation then
    return query select 'duplicate'::text, null::uuid, null::uuid, null::timestamptz;
end;
$$;

revoke all on function public.verify_health_requirement_with_signature(uuid, uuid, text, text, text, boolean, text) from public;
revoke execute on function public.verify_health_requirement_with_signature(uuid, uuid, text, text, text, boolean, text) from anon;
grant execute on function public.verify_health_requirement_with_signature(uuid, uuid, text, text, text, boolean, text) to authenticated;

-- 11. Standard Nurse Health Clearance Signing RPC (For non-special students)
create or replace function public.record_standard_nurse_health_clearance_signature(
  p_enrollment_id uuid,
  p_signature_id uuid,
  p_signature_storage_path text,
  p_signature_hash text,
  p_document_hash text
)
returns table (outcome text, signature_id uuid, signed_at timestamptz)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_enrollment public.enrollments%rowtype;
  v_student public.students%rowtype;
  v_profile public.profiles%rowtype;
  v_expected_document_hash text;
  v_clearance_status text;
  v_signed_at timestamptz := now();
begin
  if auth.uid() is null or not private.has_official_role('NURSE') then
    return query select 'unauthorized'::text, null::uuid, null::timestamptz;
    return;
  end if;

  if p_enrollment_id is null
    or p_signature_id is null
    or p_signature_storage_path is null
    or p_signature_hash is null
    or p_signature_hash !~ '^[0-9a-f]{64}$'
    or p_document_hash is null
    or p_document_hash !~ '^[0-9a-f]{64}$'
    or p_signature_storage_path <> format('%s/NURSE/%s.png', p_enrollment_id, p_signature_id) then
    return query select 'invalid_request'::text, null::uuid, null::timestamptz;
    return;
  end if;

  select e.*
  into v_enrollment
  from public.enrollments e
  where e.id = p_enrollment_id
  for update;

  if not found then
    return query select 'not_found'::text, null::uuid, null::timestamptz;
    return;
  end if;

  select s.* into v_student
  from public.students s
  where s.id = v_enrollment.student_id
  for update;

  select p.* into v_profile
  from public.profiles p
  where p.id = auth.uid();

  if not private.has_official_role_for_program('NURSE', v_enrollment.program_id) then
    return query select 'unauthorized'::text, null::uuid, null::timestamptz;
    return;
  end if;

  if v_enrollment.status not in ('PENDING', 'APPROVED') then
    return query select 'not_signable'::text, null::uuid, null::timestamptz;
    return;
  end if;

  -- PREVENT SPECIAL-FORM BYPASS: If student requires special health record form, refuse standard path
  if private.get_health_requirement_applicability(v_student.id) = 'APPLICABLE' then
    return query select 'special_form_required'::text, null::uuid, null::timestamptz;
    return;
  end if;

  v_expected_document_hash := private.enrollment_document_hash(
    v_enrollment.id,
    'NURSE',
    'HEALTH_CLEARANCE',
    'ENROLLMENT_CLEARANCE'
  );

  if p_document_hash <> v_expected_document_hash then
    return query select 'fingerprint_mismatch'::text, null::uuid, null::timestamptz;
    return;
  end if;

  select ec.status
  into v_clearance_status
  from public.enrollment_clearances ec
  where ec.enrollment_id = v_enrollment.id
    and ec.clearance_type = 'HEALTH_CLEARANCE'
  for update;

  if v_clearance_status = 'SIGNED'
     and exists (
       select 1 from public.enrollment_signatures es
       where es.enrollment_id = v_enrollment.id
         and es.clearance_type = 'HEALTH_CLEARANCE'
         and es.signer_role = 'NURSE'
         and es.document_hash = v_expected_document_hash
     ) then
    return query select 'duplicate'::text, null::uuid, null::timestamptz;
    return;
  end if;

  if v_clearance_status = 'SIGNED' then
    update public.enrollment_clearances
    set status = 'INVALIDATED', updated_at = now()
    where enrollment_id = v_enrollment.id
      and clearance_type = 'HEALTH_CLEARANCE';
  end if;

  insert into public.enrollment_signatures (
    id, enrollment_id, student_id, signer_profile_id, signer_role,
    clearance_type, document_type, signer_name_snapshot,
    signature_storage_path, signature_hash, document_hash, signed_at
  )
  values (
    p_signature_id,
    v_enrollment.id,
    v_student.id,
    auth.uid(),
    'NURSE',
    'HEALTH_CLEARANCE',
    'ENROLLMENT_CLEARANCE',
    btrim(concat_ws(' ', v_profile.first_name, v_profile.last_name)),
    p_signature_storage_path,
    p_signature_hash,
    p_document_hash,
    v_signed_at
  );

  insert into public.enrollment_clearances (enrollment_id, clearance_type, status)
  values (v_enrollment.id, 'HEALTH_CLEARANCE', 'SIGNED')
  on conflict (enrollment_id, clearance_type)
  do update set status = 'SIGNED', updated_at = now();

  insert into public.audit_logs (actor_profile_id, action, target_table, target_id)
  values (auth.uid(), 'NURSE_APPLY_STANDARD_HEALTH_CLEARANCE', 'enrollment_signatures', p_signature_id);

  return query select 'signed'::text, p_signature_id, v_signed_at;
exception
  when unique_violation then
    return query select 'duplicate'::text, null::uuid, null::timestamptz;
end;
$$;

revoke all on function public.record_standard_nurse_health_clearance_signature(uuid, uuid, text, text, text) from public;
revoke execute on function public.record_standard_nurse_health_clearance_signature(uuid, uuid, text, text, text) from anon;
grant execute on function public.record_standard_nurse_health_clearance_signature(uuid, uuid, text, text, text) to authenticated;

-- 12. Nurse Rejection RPC
create or replace function public.reject_health_requirement(
  p_enrollment_id uuid,
  p_note text
)
returns table (outcome text, requirement_id uuid, rejected_at timestamptz)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_enrollment public.enrollments%rowtype;
  v_student public.students%rowtype;
  v_requirement public.student_requirements%rowtype;
  v_clearance_status text;
  v_note text;
  v_rejected_at timestamptz := now();
begin
  if auth.uid() is null or not private.has_official_role('NURSE') then
    return query select 'unauthorized'::text, null::uuid, null::timestamptz;
    return;
  end if;

  v_note := nullif(btrim(regexp_replace(coalesce(p_note, ''), '[[:space:]]+', ' ', 'g')), '');
  if p_enrollment_id is null
    or v_note is not null and (char_length(v_note) > 240 or v_note ~ '[[:cntrl:]]') then
    return query select 'invalid_request'::text, null::uuid, null::timestamptz;
    return;
  end if;

  select e.* into v_enrollment
  from public.enrollments e
  where e.id = p_enrollment_id
  for update;

  if not found then
    return query select 'not_found'::text, null::uuid, null::timestamptz;
    return;
  end if;

  if not private.has_official_role_for_program('NURSE', v_enrollment.program_id) then
    return query select 'unauthorized'::text, null::uuid, null::timestamptz;
    return;
  end if;

  if v_enrollment.status <> 'PENDING' then
    return query select 'not_signable'::text, null::uuid, null::timestamptz;
    return;
  end if;

  select s.* into v_student
  from public.students s
  where s.id = v_enrollment.student_id
  for update;

  if private.get_health_requirement_applicability(v_student.id) <> 'APPLICABLE' then
    return query select 'special_form_not_required'::text, null::uuid, null::timestamptz;
    return;
  end if;

  select * into v_requirement
  from public.student_requirements sr
  where sr.student_id = v_student.id
    and sr.requirement_code = 'HEALTH_RECORD_UPDATE'
    and sr.academic_year = v_enrollment.academic_year
    and sr.semester = v_enrollment.semester
  for update;

  if not found or v_requirement.applicability <> 'APPLICABLE' then
    return query select 'requirement_unavailable'::text, null::uuid, null::timestamptz;
    return;
  end if;

  if private.health_clearance_is_current(v_enrollment.id) then
    return query select 'already_verified'::text, v_requirement.id, null::timestamptz;
    return;
  end if;

  select ec.status into v_clearance_status
  from public.enrollment_clearances ec
  where ec.enrollment_id = v_enrollment.id
    and ec.clearance_type = 'HEALTH_CLEARANCE'
  for update;

  perform set_config('pkm.health_requirement_mutation', 'true', true);

  update public.student_requirements
  set
    status = 'REJECTED',
    note = v_note,
    verified_at = null,
    verified_by = null,
    updated_at = v_rejected_at
  where id = v_requirement.id;

  if v_clearance_status = 'SIGNED' then
    update public.enrollment_clearances
    set status = 'INVALIDATED', updated_at = now()
    where enrollment_id = v_enrollment.id
      and clearance_type = 'HEALTH_CLEARANCE';
  end if;

  insert into public.audit_logs (actor_profile_id, action, target_table, target_id)
  values (auth.uid(), 'NURSE_REJECT_HEALTH_REQUIREMENT', 'student_requirements', v_requirement.id);

  return query select 'rejected'::text, v_requirement.id, v_rejected_at;
end;
$$;

-- 13. Nurse Worklist Rows (Shows ALL students in authorized program scope)
drop function if exists public.get_nurse_health_requirement(uuid);
drop function if exists public.list_nurse_health_requirements();
drop function if exists private.nurse_health_requirement_rows(uuid);

create or replace function private.nurse_health_requirement_rows(p_enrollment_id uuid default null)
returns table (
  enrollment_id uuid,
  enrollment_status text,
  student_id uuid,
  student_id_number text,
  student_name text,
  program_id uuid,
  program_name text,
  year_level text,
  student_type text,
  gender_sex text,
  academic_year text,
  semester text,
  requirement_id uuid,
  requirement_status text,
  requirement_applicability text,
  special_form_required boolean,
  verified_at timestamptz,
  verified_by uuid,
  nurse_signature_id uuid,
  nurse_signature_name text,
  nurse_signature_signed_at timestamptz,
  nurse_signature_storage_path text,
  nurse_signature_document_hash text,
  nurse_signature_document_type text,
  nurse_signature_is_current boolean
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    e.id as enrollment_id,
    e.status as enrollment_status,
    s.id as student_id,
    s.student_id_number,
    btrim(concat_ws(' ', student_profile.first_name, student_profile.last_name)) as student_name,
    e.program_id,
    p.name as program_name,
    e.year_level,
    s.student_type,
    osr.gender_sex,
    e.academic_year,
    e.semester,
    sr.id as requirement_id,
    sr.status::text as requirement_status,
    coalesce(sr.applicability, private.get_health_requirement_applicability(s.id)) as requirement_applicability,
    (private.get_health_requirement_applicability(s.id) = 'APPLICABLE') as special_form_required,
    sr.verified_at,
    sr.verified_by,
    es.id as nurse_signature_id,
    es.signer_name_snapshot as nurse_signature_name,
    es.signed_at as nurse_signature_signed_at,
    es.signature_storage_path as nurse_signature_storage_path,
    es.document_hash as nurse_signature_document_hash,
    es.document_type as nurse_signature_document_type,
    coalesce(private.health_clearance_is_current(e.id), false) as nurse_signature_is_current
  from public.enrollments e
  join public.students s on s.id = e.student_id
  join public.profiles student_profile on student_profile.id = s.profile_id
  join public.programs p on p.id = e.program_id
  left join public.official_student_records osr
    on osr.id = s.official_record_id
    or (
      s.official_record_id is null
      and s.student_id_number is not null
      and s.student_id_number <> ''
      and osr.student_id_number = s.student_id_number
    )
  left join public.student_requirements sr
    on sr.student_id = s.id
    and sr.requirement_code = 'HEALTH_RECORD_UPDATE'
    and sr.academic_year = e.academic_year
    and sr.semester = e.semester
  left join lateral (
    select es_inner.*
    from public.enrollment_signatures es_inner
    where es_inner.enrollment_id = e.id
      and es_inner.clearance_type = 'HEALTH_CLEARANCE'
      and es_inner.signer_role = 'NURSE'
    order by es_inner.signed_at desc, es_inner.id desc
    limit 1
  ) es on true
  where private.has_official_role_for_program('NURSE', e.program_id)
    and (p_enrollment_id is null or e.id = p_enrollment_id)
    and e.status in ('PENDING', 'APPROVED');
$$;

create or replace function public.list_nurse_health_requirements()
returns table (
  enrollment_id uuid,
  enrollment_status text,
  student_id uuid,
  student_id_number text,
  student_name text,
  program_id uuid,
  program_name text,
  year_level text,
  student_type text,
  gender_sex text,
  academic_year text,
  semester text,
  requirement_id uuid,
  requirement_status text,
  requirement_applicability text,
  special_form_required boolean,
  verified_at timestamptz,
  verified_by uuid,
  nurse_signature_id uuid,
  nurse_signature_name text,
  nurse_signature_signed_at timestamptz,
  nurse_signature_storage_path text,
  nurse_signature_document_hash text,
  nurse_signature_document_type text,
  nurse_signature_is_current boolean
)
language sql
security definer
set search_path = public, pg_temp
as $$
  select * from private.nurse_health_requirement_rows(null);
$$;
revoke all on function public.list_nurse_health_requirements() from public;
revoke execute on function public.list_nurse_health_requirements() from anon;
grant execute on function public.list_nurse_health_requirements() to authenticated;

create or replace function public.get_nurse_health_requirement(p_enrollment_id uuid)
returns table (
  enrollment_id uuid,
  enrollment_status text,
  student_id uuid,
  student_id_number text,
  student_name text,
  program_id uuid,
  program_name text,
  year_level text,
  student_type text,
  gender_sex text,
  academic_year text,
  semester text,
  requirement_id uuid,
  requirement_status text,
  requirement_applicability text,
  special_form_required boolean,
  verified_at timestamptz,
  verified_by uuid,
  nurse_signature_id uuid,
  nurse_signature_name text,
  nurse_signature_signed_at timestamptz,
  nurse_signature_storage_path text,
  nurse_signature_document_hash text,
  nurse_signature_document_type text,
  nurse_signature_is_current boolean
)
language sql
security definer
set search_path = public, pg_temp
as $$
  select * from private.nurse_health_requirement_rows(p_enrollment_id);
$$;

revoke all on function public.get_nurse_health_requirement(uuid) from public;
revoke execute on function public.get_nurse_health_requirement(uuid) from anon;
grant execute on function public.get_nurse_health_requirement(uuid) to authenticated;

-- 14. Registrar Review Pending Enrollment RPC
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
  v_subject_count integer;
  v_invalid_subject_count integer;
  v_total_units numeric;
  v_recipient_email text;
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

  if p_decision = 'APPROVED' then
    select
      count(*)::integer,
      count(*) filter (
        where nullif(btrim(es.course_code), '') is null
           or nullif(btrim(es.course_description), '') is null
           or es.units is null
           or es.units < 0
      )::integer,
      coalesce(sum(es.units), 0)::numeric
    into v_subject_count, v_invalid_subject_count, v_total_units
    from public.enrollment_subjects es
    where es.enrollment_id = v_enrollment.id;

    if v_subject_count < 1
      or v_invalid_subject_count > 0
      or v_total_units <= 0 then
      return query select 'invalid_enrollment_load'::text, v_enrollment.id, v_enrollment.status, null::text;
      return;
    end if;

    -- ALL students require all 6 required clearances to be complete and current before approval
    if not private.enrollment_required_clearances_are_current(v_enrollment.id) then
      return query select 'incomplete_clearances'::text, v_enrollment.id, v_enrollment.status, null::text;
      return;
    end if;
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
    when exists (select 1 from public.enrollments e where e.student_id = v_student.id and e.status = 'APPROVED') then 'ENROLLED'
    when exists (select 1 from public.enrollments e where e.student_id = v_student.id and e.status = 'PENDING') then 'PENDING'
    else 'NOT ENROLLED'
  end into v_student_status;

  update public.students
  set enrollment_status = v_student_status
  where id = v_student.id;

  insert into public.audit_logs (actor_profile_id, action, target_table, target_id)
  values (
    auth.uid(),
    case when p_decision = 'APPROVED' then 'APPROVE_ENROLLMENT' else 'REJECT_ENROLLMENT' end,
    'enrollments',
    v_enrollment.id
  );

  select btrim(coalesce(p.email, '')) into v_recipient_email
  from public.profiles p
  where p.id = v_student.profile_id;

  insert into public.enrollment_decision_notifications (
    enrollment_id, decision, recipient_email, academic_year, semester,
    status, attempt_count, last_error_code, reserved_at, reservation_token, sent_at
  )
  values (
    v_enrollment.id, p_decision, coalesce(v_recipient_email, ''),
    v_enrollment.academic_year, v_enrollment.semester, 'PENDING', 0,
    null, null, null, null
  )
  on conflict on constraint enrollment_decision_notifications_enrollment_decision_key do nothing;

  return query select lower(p_decision), v_enrollment.id, p_decision, v_student_status;
end;
$$;

-- 15. Safe One-Time Backfill for Current-Term Pending Enrollments
do $$
declare
  v_rec record;
begin
  for v_rec in
    select distinct e.student_id
    from public.enrollments e
    join public.enrollment_terms et
      on et.academic_year = e.academic_year
      and et.semester = e.semester
      and et.is_active = true
    where e.status = 'PENDING'
  loop
    perform private.reconcile_health_requirement_for_student(v_rec.student_id);
  end loop;
end;
$$;
