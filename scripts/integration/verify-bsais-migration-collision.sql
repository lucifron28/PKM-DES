-- Disposable local SQL verification fixture for BSAIS program alias migration.
-- Runs inside one transaction block and always rolls back.

begin;

-- Create test programs: canonical BSAIS, aliases (AIS, lowercase, whitespace), and a non-BSAIS program (BEED)
insert into public.programs (id, name, code)
values
  ('11111111-1111-4000-8000-000000000001', 'Bachelor of Science in Accounting Information Systems', 'BSAIS'),
  ('11111111-1111-4000-8000-000000000002', 'Accounting Information System', 'AIS'),
  ('11111111-1111-4000-8000-000000000003', ' bachelor of science in accounting information systems ', ' bsais '),
  ('11111111-1111-4000-8000-000000000004', 'Bachelor of Elementary Education', 'BEED');

-- Add subjects:
-- 1. Subject on canonical BSAIS
insert into public.subjects (id, program_id, course_code, course_description, units, year_level, semester)
values ('22222222-2222-4000-8000-000000000001', '11111111-1111-4000-8000-000000000001', 'ACT-101', 'Accounting Principles I', 3, '1st Year', '1st Semester');

-- 2. Colliding subject on AIS alias (same course_code, year_level, semester)
insert into public.subjects (id, program_id, course_code, course_description, units, year_level, semester)
values ('22222222-2222-4000-8000-000000000002', '11111111-1111-4000-8000-000000000002', 'ACT-101', 'Accounting Principles I', 3, '1st Year', '1st Semester');

-- 3. Non-colliding subject on AIS alias
insert into public.subjects (id, program_id, course_code, course_description, units, year_level, semester)
values ('22222222-2222-4000-8000-000000000003', '11111111-1111-4000-8000-000000000002', 'ACT-102', 'Accounting Principles II', 3, '1st Year', '2nd Semester');

-- 4. Subject on non-BSAIS program (BEED)
insert into public.subjects (id, program_id, course_code, course_description, units, year_level, semester)
values ('22222222-2222-4000-8000-000000000004', '11111111-1111-4000-8000-000000000004', 'EED-101', 'Teaching Reading', 3, '1st Year', '1st Semester');

-- Add course_offerings:
-- 1. Offering on canonical BSAIS
insert into public.course_offerings (id, program_id, academic_year, semester, year_level, course_code, course_description, units, source_document)
values ('33333333-3333-4000-8000-000000000001', '11111111-1111-4000-8000-000000000001', '2025-2026', '1st Semester', '1st Year', 'ACT-101', 'Accounting Principles I', 3, 'LIST 1.xlsx');

-- 2. Exact duplicate offering on AIS alias (should be deleted upon repoint)
insert into public.course_offerings (id, program_id, academic_year, semester, year_level, course_code, course_description, units, source_document)
values ('33333333-3333-4000-8000-000000000002', '11111111-1111-4000-8000-000000000002', '2025-2026', '1st Semester', '1st Year', 'ACT-101', 'Accounting Principles I', 3, 'LIST 1.xlsx');

-- 3. Distinct offering sharing same course_code but different source_document or description (MUST be preserved)
insert into public.course_offerings (id, program_id, academic_year, semester, year_level, course_code, course_description, units, source_document)
values ('33333333-3333-4000-8000-000000000003', '11111111-1111-4000-8000-000000000002', '2025-2026', '1st Semester', '1st Year', 'ACT-101', 'Accounting Principles I Special', 3, 'LIST 2.xlsx');

-- 4. Course offering on non-BSAIS program (BEED)
insert into public.course_offerings (id, program_id, academic_year, semester, year_level, course_code, course_description, units, source_document)
values ('33333333-3333-4000-8000-000000000004', '11111111-1111-4000-8000-000000000004', '2025-2026', '1st Semester', '1st Year', 'EED-101', 'Teaching Reading', 3, 'LIST 1.xlsx');

-- Execute the migration block logic inside the transaction
do $$
declare
  v_canonical_id uuid;
  v_alias_ids uuid[];
  v_rec record;
begin
  select id into v_canonical_id
  from public.programs
  where trim(upper(code)) = 'BSAIS'
     or trim(upper(name)) in (
       'BACHELOR OF SCIENCE IN ACCOUNTING INFORMATION SYSTEMS',
       'BACHELOR OF SCIENCE IN ACCOUNTING INFORMATION SYSTEM',
       'ACCOUNTING INFORMATION SYSTEM',
       'ACCOUNTING INFORMATION SYSTEMS'
     )
  order by (case when trim(upper(code)) = 'BSAIS' then 1 else 2 end)
  limit 1;

  select array_agg(id) into v_alias_ids
  from public.programs
  where (
      trim(upper(code)) in ('AIS', 'BSAIS')
      or trim(upper(name)) in (
        'AIS',
        'BSAIS',
        'ACCOUNTING INFORMATION SYSTEM',
        'ACCOUNTING INFORMATION SYSTEMS',
        'BACHELOR OF SCIENCE IN ACCOUNTING INFORMATION SYSTEM',
        'BACHELOR OF SCIENCE IN ACCOUNTING INFORMATION SYSTEMS'
      )
    )
    and id <> v_canonical_id;

  if v_alias_ids is not null and array_length(v_alias_ids, 1) > 0 then
    update public.students set program_id = v_canonical_id where program_id = any(v_alias_ids);
    update public.official_student_records set program_id = v_canonical_id where program_id = any(v_alias_ids);
    update public.enrollments set program_id = v_canonical_id where program_id = any(v_alias_ids);

    for v_rec in
      select s_alias.id as alias_subject_id, s_canonical.id as canonical_subject_id
      from public.subjects s_alias
      join public.subjects s_canonical
        on s_canonical.program_id = v_canonical_id
       and s_canonical.course_code = s_alias.course_code
       and s_canonical.year_level = s_alias.year_level
       and s_canonical.semester = s_alias.semester
      where s_alias.program_id = any(v_alias_ids)
    loop
      update public.enrollment_subjects set subject_id = v_rec.canonical_subject_id where subject_id = v_rec.alias_subject_id;
      delete from public.subjects where id = v_rec.alias_subject_id;
    end loop;

    update public.subjects set program_id = v_canonical_id where program_id = any(v_alias_ids);

    delete from public.course_offerings co_alias
    where co_alias.program_id = any(v_alias_ids)
      and exists (
        select 1 from public.course_offerings co_canonical
        where co_canonical.program_id = v_canonical_id
          and co_canonical.academic_year = co_alias.academic_year
          and co_canonical.semester = co_alias.semester
          and co_canonical.year_level = co_alias.year_level
          and co_canonical.course_code = co_alias.course_code
          and co_canonical.course_description = co_alias.course_description
          and co_canonical.units = co_alias.units
          and co_canonical.source_document = co_alias.source_document
      );

    update public.course_offerings set program_id = v_canonical_id where program_id = any(v_alias_ids);
    delete from public.programs where id = any(v_alias_ids);
  end if;
end $$;

-- Verification assertions
do $verify$
declare
  bsais_count integer;
  beed_count integer;
  subject_count integer;
  offering_count integer;
begin
  select count(*) into bsais_count from public.programs where trim(upper(code)) = 'BSAIS';
  if bsais_count <> 1 then
    raise exception 'BSAIS canonical program count is % (expected 1)', bsais_count;
  end if;

  select count(*) into beed_count from public.programs where code = 'BEED';
  if beed_count <> 1 then
    raise exception 'Non-BSAIS BEED program was modified';
  end if;

  -- Verify subjects: canonical ACT-101, non-colliding ACT-102 repointed, EED-101 intact
  select count(*) into subject_count from public.subjects where program_id = '11111111-1111-4000-8000-000000000001';
  if subject_count <> 2 then
    raise exception 'Canonical BSAIS subject count is % (expected 2: ACT-101 and ACT-102)', subject_count;
  end if;

  -- Verify course_offerings: exact duplicate deleted, distinct preserved (total 2 under canonical BSAIS)
  select count(*) into offering_count from public.course_offerings where program_id = '11111111-1111-4000-8000-000000000001';
  if offering_count <> 2 then
    raise exception 'Canonical BSAIS course offering count is % (expected 2)', offering_count;
  end if;
end;
$verify$;

rollback;
