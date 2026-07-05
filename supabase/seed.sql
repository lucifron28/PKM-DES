-- Migrate existing AIS to BSAIS
update public.programs set code = 'BSAIS' where code = 'AIS';

insert into public.programs (name, code)
values
  ('Accounting Information System', 'BSAIS'),
  ('Management Accounting', 'BSMA'),
  ('Bachelor of Elementary Education', 'BEED'),
  ('Bachelor of Arts in English', 'ENGLISH'),
  ('Bachelor of Arts in Filipino', 'FILIPINO'),
  ('Bachelor of Science in Mathematics', 'MATH'),
  ('Bachelor of Arts in Social Studies', 'SS'),
  ('Bachelor of Science in Criminology', 'CRIM'),
  ('Agriculture Crop Production', 'ACP'),
  ('Food Service Management', 'FSM')
on conflict (code) do update set name = excluded.name;

with program as (
  select id from public.programs where code = 'BSAIS'
)
insert into public.subjects (
  program_id,
  course_code,
  course_description,
  units,
  year_level,
  semester
)
select
  program.id,
  subject.course_code,
  subject.course_description,
  subject.units,
  subject.year_level,
  subject.semester
from program
cross join (
  values
    ('GE-1', 'Understanding the Self', 3, '1st Year', '1st Semester'),
    ('GE-2', 'Purposive Communication', 3, '1st Year', '1st Semester'),
    ('GE-3', 'Mathematics in the Modern World', 3, '1st Year', '1st Semester'),
    ('AE-1', 'Financial Accounting and Reporting', 3, '1st Year', '1st Semester'),
    ('AE-2', 'Managerial Economics', 3, '1st Year', '1st Semester'),
    ('CBME-1', 'Operation Management and TQM', 3, '1st Year', '1st Semester'),
    ('PE 1', 'Human Enhancement', 2, '1st Year', '1st Semester'),
    ('NSTP 1', 'National Service Training Program', 3, '1st Year', '1st Semester'),
    ('GE-4', 'Readings in the Philippine History', 3, '1st Year', '2nd Semester'),
    ('GE-5', 'Science, Technology, and Society', 3, '1st Year', '2nd Semester'),
    ('AE-3', 'Conceptual Frameworks and Accounting Standards', 3, '1st Year', '2nd Semester'),
    ('AE-4', 'Cost Accounting and Control', 3, '1st Year', '2nd Semester'),
    ('AE-5', 'Law on Obligations and Contracts', 3, '1st Year', '2nd Semester'),
    ('AE-6', 'Economic Development', 3, '1st Year', '2nd Semester'),
    ('PE 2', 'Fitness Exercise for Specific Sports', 3, '1st Year', '2nd Semester'),
    ('NSTP 2', 'National Service Training Program', 2, '1st Year', '2nd Semester'),
    ('GE-6', 'Ethics', 3, '2nd Year', '1st Semester'),
    ('GE-7', 'Rizal’s Life and Works', 3, '2nd Year', '1st Semester'),
    ('AE-7', 'Intermediate Accounting 1', 3, '2nd Year', '1st Semester'),
    ('AE-8', 'Strategic Cost Management', 3, '2nd Year', '1st Semester'),
    ('AE-9', 'Income Taxation', 3, '2nd Year', '1st Semester'),
    ('AE-10', 'Business Laws and Regulations', 3, '2nd Year', '1st Semester'),
    ('AE-11', 'Financial Markets', 3, '2nd Year', '1st Semester'),
    ('PE 3', 'Physical Activities Towards Health and Fitness in Dance', 2, '2nd Year', '1st Semester'),
    ('GE-Elec 1', 'Business Logic', 3, '2nd Year', '2nd Semester'),
    ('AE-12', 'Introduction Accounting Information System', 3, '2nd Year', '2nd Semester'),
    ('AE-13', 'Intermediate Accounting 2', 3, '2nd Year', '2nd Semester'),
    ('AE-14', 'Business Taxation', 3, '2nd Year', '2nd Semester'),
    ('AE-15', 'Regulatory Framework and Legal Issues in Business', 3, '2nd Year', '2nd Semester'),
    ('AE-16', 'Financial Management', 3, '2nd Year', '2nd Semester'),
    ('AE-17', 'Management Science', 3, '2nd Year', '2nd Semester'),
    ('PE 4', 'Physical Activities Towards Health and Fitness in Sports', 2, '2nd Year', '2nd Semester'),
    ('GE-Elec 2', 'Social Science and Philosophy', 3, '2nd Year', '2nd Semester'),
    ('PC-1', 'Information System Analysis and Design', 3, '3rd Year', '1st Semester'),
    ('PC-2', 'Project Management', 3, '3rd Year', '1st Semester'),
    ('AE-18', 'IT Applications Tools in Business', 3, '3rd Year', '1st Semester'),
    ('AE-19', 'Intermediate Accounting 3', 3, '3rd Year', '1st Semester'),
    ('AE-20', 'Accounting Research Methods', 3, '3rd Year', '1st Semester'),
    ('AE-21', 'Strategic Business Analysis', 3, '3rd Year', '1st Semester'),
    ('GE-8', 'Contemporary World', 3, '3rd Year', '1st Semester'),
    ('PC-3', 'Managing Information and Technology', 3, '3rd Year', '2nd Semester'),
    ('PC-4', 'Information System Operations and Maintenance', 3, '3rd Year', '2nd Semester'),
    ('PC-5', 'Information Security and Management', 3, '3rd Year', '2nd Semester'),
    ('AE-22', 'Statistical Analysis with Software Application', 3, '3rd Year', '2nd Semester'),
    ('AE-23', 'International Business and Trade', 3, '3rd Year', '2nd Semester'),
    ('AE-24', 'Governance, Business Ethics, Risk Management', 3, '3rd Year', '2nd Semester'),
    ('PC-Elec 1', 'Financial Modelling', 3, '3rd Year', '2nd Semester'),
    ('GE-9', 'Art Appreciation', 3, '3rd Year', '2nd Semester'),
    ('AE-25', 'Accounting Information System Internship', 6, '4th Year', '1st Semester'),
    ('AE-26', 'Accounting Information System Research', 3, '4th Year', '1st Semester'),
    ('GE-10', 'Art and Humanities', 3, '4th Year', '2nd Semester'),
    ('PC-6', 'Data Warehousing and Management', 3, '4th Year', '2nd Semester'),
    ('PC-7', 'Management Information System', 3, '4th Year', '2nd Semester'),
    ('PC-8', 'Enterprise Resource Planning and Management', 3, '4th Year', '2nd Semester'),
    ('CBME-2', 'Strategic Management', 3, '4th Year', '2nd Semester'),
    ('PC-Elec 2', 'Business Analytics', 3, '4th Year', '2nd Semester')
) as subject(course_code, course_description, units, year_level, semester)
on conflict (program_id, course_code, year_level, semester)
do update set
  course_description = excluded.course_description,
  units = excluded.units;
