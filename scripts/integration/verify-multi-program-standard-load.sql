-- Run only against a disposable local Supabase database.
-- Every fictional row is rolled back at the end of this script.

begin;

create temporary table fixture_expected_loads (
  program_code text not null,
  year_level text not null,
  expected_course_count integer not null,
  expected_total_units integer not null,
  primary key (program_code, year_level)
) on commit drop;

insert into fixture_expected_loads (program_code, year_level, expected_course_count, expected_total_units)
values
  ('BEED', '1st Year', 7, 20),
  ('BEED', '2nd Year', 8, 23),
  ('BEED', '3rd Year', 8, 24),
  ('BEED', '4th Year', 1, 6),
  ('ENGLISH', '1st Year', 8, 23),
  ('ENGLISH', '2nd Year', 8, 23),
  ('ENGLISH', '3rd Year', 8, 24),
  ('ENGLISH', '4th Year', 1, 6),
  ('FILIPINO', '1st Year', 8, 23),
  ('FILIPINO', '2nd Year', 8, 23),
  ('FILIPINO', '3rd Year', 8, 24),
  ('FILIPINO', '4th Year', 1, 6),
  ('MATH', '1st Year', 8, 23),
  ('MATH', '2nd Year', 8, 24),
  ('MATH', '3rd Year', 8, 24),
  ('MATH', '4th Year', 1, 6),
  ('SS', '1st Year', 8, 23),
  ('SS', '2nd Year', 8, 23),
  ('SS', '3rd Year', 8, 24),
  ('SS', '4th Year', 1, 6),
  ('ACP', '1st Year', 9, 26),
  ('ACP', '2nd Year', 10, 29),
  ('ACP', '3rd Year', 8, 24),
  ('ACP', '4th Year', 1, 6),
  ('FSM', '1st Year', 9, 26),
  ('FSM', '2nd Year', 10, 29),
  ('FSM', '3rd Year', 8, 24),
  ('FSM', '4th Year', 1, 6),
  ('BSAIS', '1st Year', 8, 23),
  ('BSAIS', '2nd Year', 9, 26),
  ('BSAIS', '3rd Year', 8, 24),
  ('BSMA', '1st Year', 7, 20),
  ('BSMA', '2nd Year', 9, 26),
  ('BSMA', '3rd Year', 8, 24),
  ('CRIM', '1st Year', 8, 23),
  ('CRIM', '2nd Year', 8, 24);

create temporary table fixture_cases (
  profile_id uuid not null default gen_random_uuid(),
  student_id uuid not null default gen_random_uuid(),
  email text not null unique,
  first_name text not null,
  last_name text not null,
  program_code text not null,
  year_level text not null,
  student_type text not null,
  student_id_number text,
  case_kind text not null
) on commit drop;

insert into fixture_cases (
  email, first_name, last_name, program_code, year_level, student_type, student_id_number, case_kind
)
values
  ('multi.beed.1@example.test', 'Fictional', 'BEED One', 'BEED', '1st Year', 'Incoming 1st Year Student', 'MP-00001', 'complete'),
  ('multi.beed.2@example.test', 'Fictional', 'BEED Two', 'BEED', '2nd Year', 'Continuing Student', 'MP-00002', 'complete'),
  ('multi.beed.3@example.test', 'Fictional', 'BEED Three', 'BEED', '3rd Year', 'Regular Student', 'MP-00003', 'complete'),
  ('multi.beed.4@example.test', 'Fictional', 'BEED Four', 'BEED', '4th Year', 'Old Student', 'MP-00004', 'complete'),
  ('multi.english.1@example.test', 'Fictional', 'English One', 'ENGLISH', '1st Year', 'Incoming 1st Year Student', 'MP-00005', 'complete'),
  ('multi.english.2@example.test', 'Fictional', 'English Two', 'ENGLISH', '2nd Year', 'Continuing Student', 'MP-00006', 'complete'),
  ('multi.english.3@example.test', 'Fictional', 'English Three', 'ENGLISH', '3rd Year', 'Regular Student', 'MP-00007', 'complete'),
  ('multi.english.4@example.test', 'Fictional', 'English Four', 'ENGLISH', '4th Year', 'Old Student', 'MP-00008', 'complete'),
  ('multi.filipino.1@example.test', 'Fictional', 'Filipino One', 'FILIPINO', '1st Year', 'Incoming 1st Year Student', 'MP-00009', 'complete'),
  ('multi.filipino.2@example.test', 'Fictional', 'Filipino Two', 'FILIPINO', '2nd Year', 'Continuing Student', 'MP-00010', 'complete'),
  ('multi.filipino.3@example.test', 'Fictional', 'Filipino Three', 'FILIPINO', '3rd Year', 'Regular Student', 'MP-00011', 'complete'),
  ('multi.filipino.4@example.test', 'Fictional', 'Filipino Four', 'FILIPINO', '4th Year', 'Old Student', 'MP-00012', 'complete'),
  ('multi.math.1@example.test', 'Fictional', 'Math One', 'MATH', '1st Year', 'Incoming 1st Year Student', 'MP-00013', 'complete'),
  ('multi.math.2@example.test', 'Fictional', 'Math Two', 'MATH', '2nd Year', 'Continuing Student', 'MP-00014', 'complete'),
  ('multi.math.3@example.test', 'Fictional', 'Math Three', 'MATH', '3rd Year', 'Regular Student', 'MP-00015', 'complete'),
  ('multi.math.4@example.test', 'Fictional', 'Math Four', 'MATH', '4th Year', 'Old Student', 'MP-00016', 'complete'),
  ('multi.ss.1@example.test', 'Fictional', 'Social Studies One', 'SS', '1st Year', 'Incoming 1st Year Student', 'MP-00017', 'complete'),
  ('multi.ss.2@example.test', 'Fictional', 'Social Studies Two', 'SS', '2nd Year', 'Continuing Student', 'MP-00018', 'complete'),
  ('multi.ss.3@example.test', 'Fictional', 'Social Studies Three', 'SS', '3rd Year', 'Regular Student', 'MP-00019', 'complete'),
  ('multi.ss.4@example.test', 'Fictional', 'Social Studies Four', 'SS', '4th Year', 'Old Student', 'MP-00020', 'complete'),
  ('multi.acp.1@example.test', 'Fictional', 'ACP One', 'ACP', '1st Year', 'Incoming 1st Year Student', 'MP-00021', 'complete'),
  ('multi.acp.2@example.test', 'Fictional', 'ACP Two', 'ACP', '2nd Year', 'Continuing Student', 'MP-00022', 'complete'),
  ('multi.acp.3@example.test', 'Fictional', 'ACP Three', 'ACP', '3rd Year', 'Regular Student', 'MP-00023', 'complete'),
  ('multi.acp.4@example.test', 'Fictional', 'ACP Four', 'ACP', '4th Year', 'Old Student', 'MP-00024', 'complete'),
  ('multi.fsm.1@example.test', 'Fictional', 'FSM One', 'FSM', '1st Year', 'Incoming 1st Year Student', 'MP-00025', 'complete'),
  ('multi.fsm.2@example.test', 'Fictional', 'FSM Two', 'FSM', '2nd Year', 'Continuing Student', 'MP-00026', 'complete'),
  ('multi.fsm.3@example.test', 'Fictional', 'FSM Three', 'FSM', '3rd Year', 'Regular Student', 'MP-00027', 'complete'),
  ('multi.fsm.4@example.test', 'Fictional', 'FSM Four', 'FSM', '4th Year', 'Old Student', 'MP-00028', 'complete'),
  ('multi.bsais.1@example.test', 'Fictional', 'BSAIS One', 'BSAIS', '1st Year', 'Incoming 1st Year Student', 'MP-00029', 'complete'),
  ('multi.bsais.2@example.test', 'Fictional', 'BSAIS Two', 'BSAIS', '2nd Year', 'Continuing Student', 'MP-00030', 'complete'),
  ('multi.bsais.3@example.test', 'Fictional', 'BSAIS Three', 'BSAIS', '3rd Year', 'Regular Student', 'MP-00031', 'complete'),
  ('multi.bsma.1@example.test', 'Fictional', 'BSMA One', 'BSMA', '1st Year', 'Incoming 1st Year Student', 'MP-00032', 'complete'),
  ('multi.bsma.2@example.test', 'Fictional', 'BSMA Two', 'BSMA', '2nd Year', 'Continuing Student', 'MP-00033', 'complete'),
  ('multi.bsma.3@example.test', 'Fictional', 'BSMA Three', 'BSMA', '3rd Year', 'Regular Student', 'MP-00034', 'complete'),
  ('multi.crim.1@example.test', 'Fictional', 'CRIM One', 'CRIM', '1st Year', 'Incoming 1st Year Student', 'MP-00035', 'complete'),
  ('multi.crim.2@example.test', 'Fictional', 'CRIM Two', 'CRIM', '2nd Year', 'Continuing Student', 'MP-00036', 'complete'),
  ('multi.bsais.4@example.test', 'Fictional', 'BSAIS Four', 'BSAIS', '4th Year', 'Incoming 1st Year Student', 'MP-00037', 'incomplete'),
  ('multi.bsma.4@example.test', 'Fictional', 'BSMA Four', 'BSMA', '4th Year', 'Old Student', 'MP-00038', 'incomplete'),
  ('multi.crim.3@example.test', 'Fictional', 'CRIM Three', 'CRIM', '3rd Year', 'Continuing Student', 'MP-00039', 'incomplete'),
  ('multi.crim.4@example.test', 'Fictional', 'CRIM Four', 'CRIM', '4th Year', 'Regular Student', 'MP-00040', 'incomplete'),
  ('multi.bsais.transfer@example.test', 'Fictional', 'BSAIS Transfer', 'BSAIS', '1st Year', 'Transferee', 'MP-00041', 'registrar_managed'),
  ('multi.bsais.irregular@example.test', 'Fictional', 'BSAIS Irregular', 'BSAIS', '1st Year', 'Irregular Student', 'MP-00042', 'registrar_managed'),
  ('multi.bsais.missing-id@example.test', 'Fictional', 'BSAIS Missing ID', 'BSAIS', '1st Year', 'Incoming 1st Year Student', null, 'missing_student_id'),
  ('multi.bsais.rollback@example.test', 'Fictional', 'BSAIS Rollback', 'BSAIS', '1st Year', 'Incoming 1st Year Student', 'MP-00043', 'rollback');

insert into auth.users (
  id, aud, role, email, encrypted_password, raw_app_meta_data, raw_user_meta_data, created_at, updated_at
)
select
  profile_id, 'authenticated', 'authenticated', email, 'not-used', '{}'::jsonb, '{}'::jsonb, now(), now()
from fixture_cases;

insert into public.profiles (id, role, first_name, last_name, email, account_status)
select profile_id, 'student', first_name, last_name, email, 'ACTIVE'
from fixture_cases;

insert into public.students (id, profile_id, student_id_number, program_id, year_level, student_type, enrollment_status)
select
  fc.student_id,
  fc.profile_id,
  fc.student_id_number,
  p.id,
  fc.year_level,
  fc.student_type,
  'NOT ENROLLED'
from fixture_cases fc
join public.programs p on p.code = fc.program_code;

grant select on fixture_expected_loads, fixture_cases to authenticated;
-- The base local schema's student policy verification grants are scoped to the
-- fixture transaction; production table grants remain migration-owned.
grant select on public.students, public.enrollments to authenticated;

do $verify$
begin
  if (
    select count(*)
    from public.programs
    where code in ('BSAIS', 'BSMA', 'BEED', 'ENGLISH', 'FILIPINO', 'MATH', 'SS', 'CRIM', 'ACP', 'FSM')
  ) <> 10 then
    raise exception 'FAIL: expected all ten configured program catalog rows';
  end if;

  if (
    select count(*)
    from public.course_offerings
    where academic_year = '2025-2026'
      and semester = '2nd Semester'
      and source_document = 'LIST OF COURSES FOR 2ND SEM AY 25-26.xlsx'
  ) <> 245 then
    raise exception 'FAIL: expected 245 unique supplied workbook offerings';
  end if;

  if exists (
    select 1
    from public.course_offerings
    where academic_year = '2025-2026'
      and semester = '2nd Semester'
      and source_document = 'LIST OF COURSES FOR 2ND SEM AY 25-26.xlsx'
    group by program_id, academic_year, semester, year_level, course_code, course_description, units, source_document
    having count(*) > 1
  ) then
    raise exception 'FAIL: duplicate workbook offering rows were found';
  end if;

  if (
    select count(*)
    from public.standard_load_sets
    where academic_year = '2025-2026'
      and semester = '2nd Semester'
      and status = 'ACTIVE'
  ) <> 36 then
    raise exception 'FAIL: expected 36 active standard-load configurations';
  end if;

  if exists (
    select 1
    from fixture_expected_loads expected
    join public.programs p on p.code = expected.program_code
    left join public.standard_load_sets sls
      on sls.program_id = p.id
     and sls.academic_year = '2025-2026'
     and sls.semester = '2nd Semester'
     and sls.year_level = expected.year_level
    left join lateral (
      select count(*)::integer as offering_count, coalesce(sum(co.units), 0)::integer as offering_units
      from public.course_offerings co
      where co.program_id = p.id
        and co.academic_year = '2025-2026'
        and co.semester = '2nd Semester'
        and co.year_level = expected.year_level
        and co.source_document = 'LIST OF COURSES FOR 2ND SEM AY 25-26.xlsx'
    ) loaded on true
    where sls.id is null
       or sls.status <> 'ACTIVE'
       or sls.expected_course_count <> expected.expected_course_count
       or sls.expected_total_units <> expected.expected_total_units
       or loaded.offering_count <> expected.expected_course_count
       or loaded.offering_units <> expected.expected_total_units
  ) then
    raise exception 'FAIL: an active standard-load configuration does not match the supplied workbook';
  end if;
end;
$verify$;

set local role authenticated;

do $verify$
declare
  v_case record;
  v_load record;
  v_outcome text;
  v_enrollment_id uuid;
  v_attached_count integer;
  v_actual_count integer;
  v_actual_units integer;
begin
  for v_case in
    select *
    from fixture_cases
    where case_kind = 'complete'
    order by program_code, year_level
  loop
    perform set_config('request.jwt.claim.sub', v_case.profile_id::text, true);

    select sls.expected_course_count, sls.expected_total_units
    into v_load
    from public.standard_load_sets sls
    join public.programs p on p.id = sls.program_id
    where p.code = v_case.program_code
      and sls.academic_year = '2025-2026'
      and sls.semester = '2nd Semester'
      and sls.year_level = v_case.year_level
      and sls.status = 'ACTIVE';

    if not found then
      raise exception 'FAIL: complete fixture has no active load for % %', v_case.program_code, v_case.year_level;
    end if;

    select outcome, enrollment_id, attached_subject_count
    into v_outcome, v_enrollment_id, v_attached_count
    from public.submit_standard_student_enrollment('2025-2026', '2nd Semester');

    if v_outcome <> 'submitted' or v_enrollment_id is null or v_attached_count <> v_load.expected_course_count then
      raise exception 'FAIL: standard load submission failed for % %: % (% attachments)', v_case.program_code, v_case.year_level, v_outcome, v_attached_count;
    end if;

    select count(*)::integer, coalesce(sum(es.units), 0)::integer
    into v_actual_count, v_actual_units
    from public.enrollment_subjects es
    where es.enrollment_id = v_enrollment_id;

    if v_actual_count <> v_load.expected_course_count or v_actual_units <> v_load.expected_total_units then
      raise exception 'FAIL: attached count or units mismatch for % %', v_case.program_code, v_case.year_level;
    end if;

    if exists (
      select 1
      from public.enrollment_subjects es
      where es.enrollment_id = v_enrollment_id
        and (es.subject_id is not null or es.course_offering_id is null)
    ) then
      raise exception 'FAIL: standard load used the legacy subject source for % %', v_case.program_code, v_case.year_level;
    end if;

    if exists (
      select 1
      from public.enrollment_subjects es
      where es.enrollment_id = v_enrollment_id
        and (
          (select count(*) from public.enrollment_subjects same_es where same_es.enrollment_id = v_enrollment_id and same_es.course_offering_id = es.course_offering_id) > 1
          or not exists (
            select 1
            from public.course_offerings co
            join public.programs p on p.id = co.program_id
            where co.id = es.course_offering_id
              and p.code = v_case.program_code
              and co.academic_year = '2025-2026'
              and co.semester = '2nd Semester'
              and co.year_level = v_case.year_level
              and co.source_document = 'LIST OF COURSES FOR 2ND SEM AY 25-26.xlsx'
          )
        )
    ) or exists (
      select 1
      from public.course_offerings co
      join public.programs p on p.id = co.program_id
      where p.code = v_case.program_code
        and co.academic_year = '2025-2026'
        and co.semester = '2nd Semester'
        and co.year_level = v_case.year_level
        and co.source_document = 'LIST OF COURSES FOR 2ND SEM AY 25-26.xlsx'
        and not exists (
          select 1
          from public.enrollment_subjects es
          where es.enrollment_id = v_enrollment_id
            and es.course_offering_id = co.id
        )
    ) then
      raise exception 'FAIL: attached offering set is not exact for % %', v_case.program_code, v_case.year_level;
    end if;

    if exists (
      select 1
      from public.enrollment_subjects es
      join public.course_offerings co on co.id = es.course_offering_id
      where es.enrollment_id = v_enrollment_id
        and (es.course_code <> co.course_code or es.course_description <> co.course_description or es.units <> co.units)
    ) then
      raise exception 'FAIL: offering snapshot mismatch for % %', v_case.program_code, v_case.year_level;
    end if;

    if (select enrollment_status from public.students where id = v_case.student_id) <> 'PENDING' then
      raise exception 'FAIL: student status did not become PENDING for % %', v_case.program_code, v_case.year_level;
    end if;
  end loop;
end;
$verify$;

do $verify$
declare
  v_case record;
  v_outcome text;
begin
  select * into v_case from fixture_cases where case_kind = 'complete' order by profile_id limit 1;
  perform set_config('request.jwt.claim.sub', v_case.profile_id::text, true);

  select outcome into v_outcome
  from public.submit_standard_student_enrollment('2025-2026', '2nd Semester');
  if v_outcome <> 'duplicate' then
    raise exception 'FAIL: duplicate standard-load submission returned %', v_outcome;
  end if;

  select outcome into v_outcome
  from public.submit_standard_student_enrollment('2026-2027', '1st Semester');
  if v_outcome <> 'term_not_open' then
    raise exception 'FAIL: mismatched term returned %', v_outcome;
  end if;
end;
$verify$;

do $verify$
declare
  v_case record;
  v_outcome text;
begin
  for v_case in select * from fixture_cases where case_kind = 'incomplete' loop
    perform set_config('request.jwt.claim.sub', v_case.profile_id::text, true);
    select outcome into v_outcome
    from public.submit_standard_student_enrollment('2025-2026', '2nd Semester');
    if v_outcome <> 'no_configured_load' then
      raise exception 'FAIL: incomplete % % returned %', v_case.program_code, v_case.year_level, v_outcome;
    end if;
  end loop;

  for v_case in select * from fixture_cases where case_kind = 'registrar_managed' loop
    perform set_config('request.jwt.claim.sub', v_case.profile_id::text, true);
    select outcome into v_outcome
    from public.submit_standard_student_enrollment('2025-2026', '2nd Semester');
    if v_outcome <> 'registrar_managed_load' then
      raise exception 'FAIL: Registrar-managed % returned %', v_case.student_type, v_outcome;
    end if;
  end loop;

  select * into v_case from fixture_cases where case_kind = 'missing_student_id' limit 1;
  perform set_config('request.jwt.claim.sub', v_case.profile_id::text, true);
  select outcome into v_outcome
  from public.submit_standard_student_enrollment('2025-2026', '2nd Semester');
  if v_outcome <> 'missing_student_id' then
    raise exception 'FAIL: missing Student ID returned %', v_outcome;
  end if;
end;
$verify$;

do $verify$
declare
  v_owner record;
  v_other record;
  v_enrollment_id uuid;
  v_attachment_id uuid;
  v_offering record;
  v_rows integer;
  v_before_units integer;
begin
  select fc.* into v_owner
  from fixture_cases fc
  where fc.case_kind = 'complete'
  order by fc.program_code, fc.year_level
  limit 1;

  perform set_config('request.jwt.claim.sub', v_owner.profile_id::text, true);

  select e.id into v_enrollment_id
  from public.enrollments e
  where e.student_id = v_owner.student_id
    and e.academic_year = '2025-2026'
    and e.semester = '2nd Semester';

  select es.id, es.units into v_attachment_id, v_before_units
  from public.enrollment_subjects es
  where es.enrollment_id = v_enrollment_id
  order by es.id
  limit 1;

  select fc.* into v_other
  from fixture_cases fc
  where fc.case_kind = 'complete'
    and fc.profile_id <> v_owner.profile_id
  order by fc.profile_id
  limit 1;

  select count(*) into v_rows
  from public.enrollment_subjects
  where enrollment_id = v_enrollment_id;
  if v_rows <= 0 then
    raise exception 'FAIL: owning student could not select its own attachment rows';
  end if;

  perform set_config('request.jwt.claim.sub', v_other.profile_id::text, true);
  if (select count(*) from public.enrollment_subjects where enrollment_id = v_enrollment_id) <> 0 then
    raise exception 'FAIL: another student can select private attachment rows';
  end if;

  perform set_config('request.jwt.claim.sub', v_owner.profile_id::text, true);

  begin
    update public.enrollment_subjects
    set units = units + 1
    where id = v_attachment_id;
    get diagnostics v_rows = row_count;
    if v_rows <> 0 then
      raise exception 'FAIL: owning student directly updated an attachment row';
    end if;
  exception when insufficient_privilege then
    null;
  end;

  begin
    delete from public.enrollment_subjects where id = v_attachment_id;
    get diagnostics v_rows = row_count;
    if v_rows <> 0 then
      raise exception 'FAIL: owning student directly deleted an attachment row';
    end if;
  exception when insufficient_privilege then
    null;
  end;

  select co.id, co.course_code, co.course_description, co.units
  into v_offering
  from public.course_offerings co
  where co.source_document = 'LIST OF COURSES FOR 2ND SEM AY 25-26.xlsx'
    and co.id not in (select es.course_offering_id from public.enrollment_subjects es where es.enrollment_id = v_enrollment_id)
  limit 1;

  begin
    insert into public.enrollment_subjects (enrollment_id, subject_id, course_offering_id, course_code, course_description, units)
    values (v_enrollment_id, null, v_offering.id, v_offering.course_code, v_offering.course_description, v_offering.units);
    get diagnostics v_rows = row_count;
    if v_rows <> 0 then
      raise exception 'FAIL: owning student directly inserted an attachment row';
    end if;
  exception when insufficient_privilege then
    null;
  end;

  if (select units from public.enrollment_subjects where id = v_attachment_id) <> v_before_units then
    raise exception 'FAIL: unauthorized attachment update changed persisted data';
  end if;
end;
$verify$;

reset role;

do $verify$
declare
  v_enrollment_id uuid;
  v_offering record;
  v_snapshot record;
begin
  select e.id into v_enrollment_id
  from public.enrollments e
  join public.students s on s.id = e.student_id
  join public.programs p on p.id = s.program_id
  where p.code = 'BSAIS'
    and s.year_level = '1st Year'
    and e.academic_year = '2025-2026'
    and e.semester = '2nd Semester'
  order by e.submitted_at
  limit 1;

  select co.id, co.course_description, co.units, es.course_code, es.course_description as snapshot_description, es.units as snapshot_units
  into v_snapshot
  from public.enrollment_subjects es
  join public.course_offerings co on co.id = es.course_offering_id
  where es.enrollment_id = v_enrollment_id
  limit 1;

  update public.course_offerings
  set course_description = course_description || ' (fixture edit)', units = units + 1
  where id = v_snapshot.id;

  if (select course_description from public.enrollment_subjects where enrollment_id = v_enrollment_id and course_offering_id = v_snapshot.id) <> v_snapshot.snapshot_description
    or (select units from public.enrollment_subjects where enrollment_id = v_enrollment_id and course_offering_id = v_snapshot.id) <> v_snapshot.snapshot_units then
    raise exception 'FAIL: enrollment offering snapshot changed after source edit';
  end if;

  update public.course_offerings
  set course_description = v_snapshot.course_description, units = v_snapshot.units
  where id = v_snapshot.id;
end;
$verify$;

do $verify$
declare
  v_legacy_student uuid;
  v_program_id uuid;
  v_enrollment_id uuid := '40000000-0000-4100-8000-000000000001';
  v_subject_id uuid := '50000000-0000-4100-8000-000000000001';
  v_attachment_id uuid;
begin
  select fc.student_id, p.id
  into v_legacy_student, v_program_id
  from fixture_cases fc
  join public.programs p on p.code = fc.program_code
  where fc.case_kind = 'incomplete'
    and fc.program_code = 'CRIM'
    and fc.year_level = '3rd Year'
  limit 1;

  insert into public.enrollments (id, student_id, program_id, year_level, academic_year, semester, status)
  values (v_enrollment_id, v_legacy_student, v_program_id, '3rd Year', '2025-2026', '2nd Semester', 'PENDING');

  insert into public.subjects (id, program_id, course_code, course_description, units, year_level, semester)
  values (v_subject_id, v_program_id, 'FIX-LEGACY-1', 'Legacy fixture subject', 3, '3rd Year', '2nd Semester');

  insert into public.enrollment_subjects (enrollment_id, subject_id, course_offering_id, course_code, course_description, units)
  values (v_enrollment_id, v_subject_id, null, 'FIX-LEGACY-1', 'Legacy fixture subject', 3)
  returning id into v_attachment_id;

  begin
    delete from public.subjects where id = v_subject_id;
    raise exception 'FAIL: deleting a referenced legacy subject was allowed';
  exception when foreign_key_violation then
    null;
  end;

  if not exists (select 1 from public.enrollment_subjects where id = v_attachment_id and subject_id = v_subject_id) then
    raise exception 'FAIL: legacy subject-backed attachment was not preserved';
  end if;
end;
$verify$;

create or replace function public.fixture_fail_subject_attachment()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if current_setting('pkm.fixture.fail_subject_attachment', true) = 'on' then
    raise exception 'fixture attachment failure';
  end if;
  return new;
end;
$$;

create trigger fixture_fail_subject_attachment_trigger
before insert on public.enrollment_subjects
for each row execute function public.fixture_fail_subject_attachment();

set local role authenticated;

do $verify$
declare
  v_case record;
  v_outcome text;
begin
  select * into v_case from fixture_cases where case_kind = 'rollback' limit 1;
  perform set_config('request.jwt.claim.sub', v_case.profile_id::text, true);
  perform set_config('pkm.fixture.fail_subject_attachment', 'on', true);

  select outcome into v_outcome
  from public.submit_standard_student_enrollment('2025-2026', '2nd Semester');
  if v_outcome <> 'submission_failed' then
    raise exception 'FAIL: forced attachment failure returned %', v_outcome;
  end if;

  if exists (select 1 from public.enrollments where student_id = v_case.student_id and academic_year = '2025-2026' and semester = '2nd Semester') then
    raise exception 'FAIL: failed standard-load submission left an enrollment row';
  end if;

  if exists (
    select 1
    from public.enrollment_subjects es
    join public.enrollments e on e.id = es.enrollment_id
    where e.student_id = v_case.student_id
  ) then
    raise exception 'FAIL: failed standard-load submission left attachment rows';
  end if;

  if (select enrollment_status from public.students where id = v_case.student_id) <> 'NOT ENROLLED' then
    raise exception 'FAIL: failed standard-load submission changed student status';
  end if;
end;
$verify$;

reset role;
drop trigger fixture_fail_subject_attachment_trigger on public.enrollment_subjects;
drop function public.fixture_fail_subject_attachment();

select 'multi-program-standard-load-verification-passed' as verification_result;

rollback;
