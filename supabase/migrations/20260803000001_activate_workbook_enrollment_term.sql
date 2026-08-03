-- Use the currently supplied course workbook as the authoritative MVP term.
-- Source: LIST OF COURSES FOR 2ND SEM AY 25-26.xlsx

update public.enrollment_terms
set
  is_active = false,
  updated_at = now()
where is_active = true;

insert into public.enrollment_terms (
  academic_year,
  semester,
  enrollment_open,
  is_active
)
values (
  '2025-2026',
  '2nd Semester',
  true,
  true
)
on conflict (academic_year, semester)
do update set
  enrollment_open = excluded.enrollment_open,
  is_active = excluded.is_active,
  updated_at = now();

-- Replace any previously active configuration with the complete combinations
-- represented by the supplied workbook. Incomplete source combinations are
-- intentionally left without an ACTIVE standard-load row.
update public.standard_load_sets
set
  status = 'DRAFT',
  updated_at = now()
where status = 'ACTIVE';

with requested_loads (program_code, year_level, expected_course_count, expected_total_units) as (
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
    ('CRIM', '2nd Year', 8, 24)
)
insert into public.standard_load_sets (
  program_id,
  academic_year,
  semester,
  year_level,
  status,
  expected_course_count,
  expected_total_units,
  source_document
)
select
  p.id,
  '2025-2026',
  '2nd Semester',
  requested.year_level,
  'ACTIVE',
  requested.expected_course_count,
  requested.expected_total_units,
  'LIST OF COURSES FOR 2ND SEM AY 25-26.xlsx'
from requested_loads requested
join public.programs p on p.code = requested.program_code
on conflict (program_id, academic_year, semester, year_level)
do update set
  status = excluded.status,
  expected_course_count = excluded.expected_course_count,
  expected_total_units = excluded.expected_total_units,
  source_document = excluded.source_document,
  updated_at = now();

do $$
begin
  if (select count(*) from public.enrollment_terms where is_active = true) <> 1 then
    raise exception 'Expected exactly one active enrollment term after workbook activation.';
  end if;

  if not exists (
    select 1
    from public.enrollment_terms
    where academic_year = '2025-2026'
      and semester = '2nd Semester'
      and enrollment_open = true
      and is_active = true
  ) then
    raise exception 'The supplied workbook term was not activated.';
  end if;

  if (
    select count(*)
    from public.standard_load_sets
    where academic_year = '2025-2026'
      and semester = '2nd Semester'
      and status = 'ACTIVE'
  ) <> 36 then
    raise exception 'Expected 36 active workbook standard-load sets.';
  end if;

  if exists (
    select 1
    from public.standard_load_sets sls
    left join lateral (
      select count(*)::integer as offering_count, coalesce(sum(co.units), 0)::integer as offering_units
      from public.course_offerings co
      where co.program_id = sls.program_id
        and co.academic_year = sls.academic_year
        and co.semester = sls.semester
        and co.year_level = sls.year_level
        and co.source_document = sls.source_document
    ) loaded on true
    where sls.academic_year = '2025-2026'
      and sls.semester = '2nd Semester'
      and sls.status = 'ACTIVE'
      and (
        loaded.offering_count <> sls.expected_course_count
        or loaded.offering_units <> sls.expected_total_units
      )
  ) then
    raise exception 'At least one active workbook standard-load set does not match its course offerings.';
  end if;
end;
$$;
