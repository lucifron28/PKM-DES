-- Migration for multi-program historical course offerings
create table if not exists public.course_offerings (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.programs(id) on delete cascade,
  academic_year text not null check (academic_year ~ '^[0-9]{4}-[0-9]{4}$'),
  semester text not null check (semester in ('1st Semester', '2nd Semester', 'Summer')),
  year_level text not null check (year_level in ('1st Year', '2nd Year', '3rd Year', '4th Year')),
  course_code text not null,
  course_description text not null,
  units integer not null check (units >= 0),
  source_document text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint course_offerings_unique_entry unique (program_id, academic_year, semester, year_level, course_code, course_description, units, source_document)
);

create index if not exists idx_course_offerings_prog_term on public.course_offerings (program_id, academic_year, semester);
create index if not exists idx_course_offerings_prog_term_yl on public.course_offerings (program_id, academic_year, semester, year_level);
create index if not exists idx_course_offerings_prog_code on public.course_offerings (program_id, course_code);

alter table public.course_offerings enable row level security;

drop policy if exists "Authenticated users can read course offerings" on public.course_offerings;
create policy "Authenticated users can read course offerings"
  on public.course_offerings
  for select
  to authenticated
  using (true);

-- Insert 245 historical workbook-derived course offerings

insert into public.course_offerings (program_id, academic_year, semester, year_level, course_code, course_description, units, source_document)
select id, '2025-2026', '2nd Semester', '1st Year', 'SOC-SCI 1', 'Readings in Philippine History', 3, 'LIST OF COURSES FOR 2ND SEM AY 25-26.xlsx'
from public.programs where code = 'BEED'
on conflict on constraint course_offerings_unique_entry do nothing;
insert into public.course_offerings (program_id, academic_year, semester, year_level, course_code, course_description, units, source_document)
select id, '2025-2026', '2nd Semester', '1st Year', 'SOC-SCI 2', 'Science, Technology and Society', 3, 'LIST OF COURSES FOR 2ND SEM AY 25-26.xlsx'
from public.programs where code = 'BEED'
on conflict on constraint course_offerings_unique_entry do nothing;
insert into public.course_offerings (program_id, academic_year, semester, year_level, course_code, course_description, units, source_document)
select id, '2025-2026', '2nd Semester', '1st Year', 'EDUC 101', 'The Child and Adolescent Learners & Learning Principles', 3, 'LIST OF COURSES FOR 2ND SEM AY 25-26.xlsx'
from public.programs where code = 'BEED'
on conflict on constraint course_offerings_unique_entry do nothing;
insert into public.course_offerings (program_id, academic_year, semester, year_level, course_code, course_description, units, source_document)
select id, '2025-2026', '2nd Semester', '1st Year', 'EED 102', 'Educkasyong Pantahanan at Pangkabuhayan with Entrepremeurialism', 3, 'LIST OF COURSES FOR 2ND SEM AY 25-26.xlsx'
from public.programs where code = 'BEED'
on conflict on constraint course_offerings_unique_entry do nothing;
insert into public.course_offerings (program_id, academic_year, semester, year_level, course_code, course_description, units, source_document)
select id, '2025-2026', '2nd Semester', '1st Year', 'EED 104', 'Content and Pedagogy for the Mother-Tongue', 3, 'LIST OF COURSES FOR 2ND SEM AY 25-26.xlsx'
from public.programs where code = 'BEED'
on conflict on constraint course_offerings_unique_entry do nothing;
insert into public.course_offerings (program_id, academic_year, semester, year_level, course_code, course_description, units, source_document)
select id, '2025-2026', '2nd Semester', '1st Year', 'PATHFIT 2', 'Exercise-based Firtness Activities', 2, 'LIST OF COURSES FOR 2ND SEM AY 25-26.xlsx'
from public.programs where code = 'BEED'
on conflict on constraint course_offerings_unique_entry do nothing;
insert into public.course_offerings (program_id, academic_year, semester, year_level, course_code, course_description, units, source_document)
select id, '2025-2026', '2nd Semester', '1st Year', 'NSTP 2', 'National Service Training Program 2', 3, 'LIST OF COURSES FOR 2ND SEM AY 25-26.xlsx'
from public.programs where code = 'BEED'
on conflict on constraint course_offerings_unique_entry do nothing;
insert into public.course_offerings (program_id, academic_year, semester, year_level, course_code, course_description, units, source_document)
select id, '2025-2026', '2nd Semester', '2nd Year', 'GE ELEC 3', 'Arts and Humanities', 3, 'LIST OF COURSES FOR 2ND SEM AY 25-26.xlsx'
from public.programs where code = 'BEED'
on conflict on constraint course_offerings_unique_entry do nothing;
insert into public.course_offerings (program_id, academic_year, semester, year_level, course_code, course_description, units, source_document)
select id, '2025-2026', '2nd Semester', '2nd Year', 'EDUC 104', 'Facilitating Learner-Centered Teaching', 3, 'LIST OF COURSES FOR 2ND SEM AY 25-26.xlsx'
from public.programs where code = 'BEED'
on conflict on constraint course_offerings_unique_entry do nothing;
insert into public.course_offerings (program_id, academic_year, semester, year_level, course_code, course_description, units, source_document)
select id, '2025-2026', '2nd Semester', '2nd Year', 'EDUC 105', 'The Teacher and the Community, School Culture and Organizational Leadership', 3, 'LIST OF COURSES FOR 2ND SEM AY 25-26.xlsx'
from public.programs where code = 'BEED'
on conflict on constraint course_offerings_unique_entry do nothing;
insert into public.course_offerings (program_id, academic_year, semester, year_level, course_code, course_description, units, source_document)
select id, '2025-2026', '2nd Semester', '2nd Year', 'EDUC 106', 'Assessment in Learning 2', 3, 'LIST OF COURSES FOR 2ND SEM AY 25-26.xlsx'
from public.programs where code = 'BEED'
on conflict on constraint course_offerings_unique_entry do nothing;
insert into public.course_offerings (program_id, academic_year, semester, year_level, course_code, course_description, units, source_document)
select id, '2025-2026', '2nd Semester', '2nd Year', 'EED 115', 'Teaching PE and Health in Elementary Grades', 3, 'LIST OF COURSES FOR 2ND SEM AY 25-26.xlsx'
from public.programs where code = 'BEED'
on conflict on constraint course_offerings_unique_entry do nothing;
insert into public.course_offerings (program_id, academic_year, semester, year_level, course_code, course_description, units, source_document)
select id, '2025-2026', '2nd Semester', '2nd Year', 'EED 106', 'Teaching Math in the Intermediate Grades', 3, 'LIST OF COURSES FOR 2ND SEM AY 25-26.xlsx'
from public.programs where code = 'BEED'
on conflict on constraint course_offerings_unique_entry do nothing;
insert into public.course_offerings (program_id, academic_year, semester, year_level, course_code, course_description, units, source_document)
select id, '2025-2026', '2nd Semester', '2nd Year', 'EED 108', 'Teaching Science in Elementary Grades', 3, 'LIST OF COURSES FOR 2ND SEM AY 25-26.xlsx'
from public.programs where code = 'BEED'
on conflict on constraint course_offerings_unique_entry do nothing;
insert into public.course_offerings (program_id, academic_year, semester, year_level, course_code, course_description, units, source_document)
select id, '2025-2026', '2nd Semester', '2nd Year', 'PATHFIT 4', 'Sports', 2, 'LIST OF COURSES FOR 2ND SEM AY 25-26.xlsx'
from public.programs where code = 'BEED'
on conflict on constraint course_offerings_unique_entry do nothing;
insert into public.course_offerings (program_id, academic_year, semester, year_level, course_code, course_description, units, source_document)
select id, '2025-2026', '2nd Semester', '3rd Year', 'HUM 3', 'Art Appreciation', 3, 'LIST OF COURSES FOR 2ND SEM AY 25-26.xlsx'
from public.programs where code = 'BEED'
on conflict on constraint course_offerings_unique_entry do nothing;
insert into public.course_offerings (program_id, academic_year, semester, year_level, course_code, course_description, units, source_document)
select id, '2025-2026', '2nd Semester', '3rd Year', 'EDUC 110', 'Building and Enhancing New Literacies Across the Curriculum', 3, 'LIST OF COURSES FOR 2ND SEM AY 25-26.xlsx'
from public.programs where code = 'BEED'
on conflict on constraint course_offerings_unique_entry do nothing;
insert into public.course_offerings (program_id, academic_year, semester, year_level, course_code, course_description, units, source_document)
select id, '2025-2026', '2nd Semester', '3rd Year', 'EED 116', 'Teaching  Music in Elementary Grades', 3, 'LIST OF COURSES FOR 2ND SEM AY 25-26.xlsx'
from public.programs where code = 'BEED'
on conflict on constraint course_offerings_unique_entry do nothing;
insert into public.course_offerings (program_id, academic_year, semester, year_level, course_code, course_description, units, source_document)
select id, '2025-2026', '2nd Semester', '3rd Year', 'EED 118 TTL 2', 'Technology for Teaching and Elementary Grades', 3, 'LIST OF COURSES FOR 2ND SEM AY 25-26.xlsx'
from public.programs where code = 'BEED'
on conflict on constraint course_offerings_unique_entry do nothing;
insert into public.course_offerings (program_id, academic_year, semester, year_level, course_code, course_description, units, source_document)
select id, '2025-2026', '2nd Semester', '3rd Year', 'EED 110', 'Teaching English in the Elementary Grades Through Literature', 3, 'LIST OF COURSES FOR 2ND SEM AY 25-26.xlsx'
from public.programs where code = 'BEED'
on conflict on constraint course_offerings_unique_entry do nothing;
insert into public.course_offerings (program_id, academic_year, semester, year_level, course_code, course_description, units, source_document)
select id, '2025-2026', '2nd Semester', '3rd Year', 'EED 112', 'Pagtuturo and Filipino sa Elementarya (II) Panitikan ng Pilipinas', 3, 'LIST OF COURSES FOR 2ND SEM AY 25-26.xlsx'
from public.programs where code = 'BEED'
on conflict on constraint course_offerings_unique_entry do nothing;
insert into public.course_offerings (program_id, academic_year, semester, year_level, course_code, course_description, units, source_document)
select id, '2025-2026', '2nd Semester', '3rd Year', 'EED 114', 'Teaching Social Studies in Elementary Grades (Culture and Geography)', 3, 'LIST OF COURSES FOR 2ND SEM AY 25-26.xlsx'
from public.programs where code = 'BEED'
on conflict on constraint course_offerings_unique_entry do nothing;
insert into public.course_offerings (program_id, academic_year, semester, year_level, course_code, course_description, units, source_document)
select id, '2025-2026', '2nd Semester', '3rd Year', 'EED 117', 'Teaching Arts in Elementary Grades', 3, 'LIST OF COURSES FOR 2ND SEM AY 25-26.xlsx'
from public.programs where code = 'BEED'
on conflict on constraint course_offerings_unique_entry do nothing;
insert into public.course_offerings (program_id, academic_year, semester, year_level, course_code, course_description, units, source_document)
select id, '2025-2026', '2nd Semester', '4th Year', 'EDUC 111', 'Teaching Internship', 6, 'LIST OF COURSES FOR 2ND SEM AY 25-26.xlsx'
from public.programs where code = 'BEED'
on conflict on constraint course_offerings_unique_entry do nothing;
insert into public.course_offerings (program_id, academic_year, semester, year_level, course_code, course_description, units, source_document)
select id, '2025-2026', '2nd Semester', '1st Year', 'SOC SCI 1', 'Readings in the Philippine History', 3, 'LIST OF COURSES FOR 2ND SEM AY 25-26.xlsx'
from public.programs where code = 'ENGLISH'
on conflict on constraint course_offerings_unique_entry do nothing;
insert into public.course_offerings (program_id, academic_year, semester, year_level, course_code, course_description, units, source_document)
select id, '2025-2026', '2nd Semester', '1st Year', 'SOC SCI 2', 'Science, Technology and Society', 3, 'LIST OF COURSES FOR 2ND SEM AY 25-26.xlsx'
from public.programs where code = 'ENGLISH'
on conflict on constraint course_offerings_unique_entry do nothing;
insert into public.course_offerings (program_id, academic_year, semester, year_level, course_code, course_description, units, source_document)
select id, '2025-2026', '2nd Semester', '1st Year', 'EDUC 101', 'Child and Adolescent Learners & Learning Principles', 3, 'LIST OF COURSES FOR 2ND SEM AY 25-26.xlsx'
from public.programs where code = 'ENGLISH'
on conflict on constraint course_offerings_unique_entry do nothing;
insert into public.course_offerings (program_id, academic_year, semester, year_level, course_code, course_description, units, source_document)
select id, '2025-2026', '2nd Semester', '1st Year', 'EL 103', 'Principles and Theories of Language Acquisition and Learning', 3, 'LIST OF COURSES FOR 2ND SEM AY 25-26.xlsx'
from public.programs where code = 'ENGLISH'
on conflict on constraint course_offerings_unique_entry do nothing;
insert into public.course_offerings (program_id, academic_year, semester, year_level, course_code, course_description, units, source_document)
select id, '2025-2026', '2nd Semester', '1st Year', 'EL 109', 'Speech and Theatre Arts', 3, 'LIST OF COURSES FOR 2ND SEM AY 25-26.xlsx'
from public.programs where code = 'ENGLISH'
on conflict on constraint course_offerings_unique_entry do nothing;
insert into public.course_offerings (program_id, academic_year, semester, year_level, course_code, course_description, units, source_document)
select id, '2025-2026', '2nd Semester', '1st Year', 'EL 118', 'Technical Writing', 3, 'LIST OF COURSES FOR 2ND SEM AY 25-26.xlsx'
from public.programs where code = 'ENGLISH'
on conflict on constraint course_offerings_unique_entry do nothing;
insert into public.course_offerings (program_id, academic_year, semester, year_level, course_code, course_description, units, source_document)
select id, '2025-2026', '2nd Semester', '1st Year', 'PATHFIT 2', 'Exercise-Based Fitness Activities', 2, 'LIST OF COURSES FOR 2ND SEM AY 25-26.xlsx'
from public.programs where code = 'ENGLISH'
on conflict on constraint course_offerings_unique_entry do nothing;
insert into public.course_offerings (program_id, academic_year, semester, year_level, course_code, course_description, units, source_document)
select id, '2025-2026', '2nd Semester', '1st Year', 'NSTP 2', 'National Service Training Program', 3, 'LIST OF COURSES FOR 2ND SEM AY 25-26.xlsx'
from public.programs where code = 'ENGLISH'
on conflict on constraint course_offerings_unique_entry do nothing;
insert into public.course_offerings (program_id, academic_year, semester, year_level, course_code, course_description, units, source_document)
select id, '2025-2026', '2nd Semester', '2nd Year', 'GE ELEC 3', 'Arts and Humanities', 3, 'LIST OF COURSES FOR 2ND SEM AY 25-26.xlsx'
from public.programs where code = 'ENGLISH'
on conflict on constraint course_offerings_unique_entry do nothing;
insert into public.course_offerings (program_id, academic_year, semester, year_level, course_code, course_description, units, source_document)
select id, '2025-2026', '2nd Semester', '2nd Year', 'EDUC 104', 'Facilitating Learner-Centered Teaching', 3, 'LIST OF COURSES FOR 2ND SEM AY 25-26.xlsx'
from public.programs where code = 'ENGLISH'
on conflict on constraint course_offerings_unique_entry do nothing;
insert into public.course_offerings (program_id, academic_year, semester, year_level, course_code, course_description, units, source_document)
select id, '2025-2026', '2nd Semester', '2nd Year', 'EDUC 105', 'The Teacher and the Community, School Culture and Organizational Leadership', 3, 'LIST OF COURSES FOR 2ND SEM AY 25-26.xlsx'
from public.programs where code = 'ENGLISH'
on conflict on constraint course_offerings_unique_entry do nothing;
insert into public.course_offerings (program_id, academic_year, semester, year_level, course_code, course_description, units, source_document)
select id, '2025-2026', '2nd Semester', '2nd Year', 'PATHFIT 4', 'Sports', 2, 'LIST OF COURSES FOR 2ND SEM AY 25-26.xlsx'
from public.programs where code = 'ENGLISH'
on conflict on constraint course_offerings_unique_entry do nothing;
insert into public.course_offerings (program_id, academic_year, semester, year_level, course_code, course_description, units, source_document)
select id, '2025-2026', '2nd Semester', '2nd Year', 'EL 107', 'Teaching Assessment of Macro Skills', 3, 'LIST OF COURSES FOR 2ND SEM AY 25-26.xlsx'
from public.programs where code = 'ENGLISH'
on conflict on constraint course_offerings_unique_entry do nothing;
insert into public.course_offerings (program_id, academic_year, semester, year_level, course_code, course_description, units, source_document)
select id, '2025-2026', '2nd Semester', '2nd Year', 'EL 111', 'Children and Adolescent Literature', 3, 'LIST OF COURSES FOR 2ND SEM AY 25-26.xlsx'
from public.programs where code = 'ENGLISH'
on conflict on constraint course_offerings_unique_entry do nothing;
insert into public.course_offerings (program_id, academic_year, semester, year_level, course_code, course_description, units, source_document)
select id, '2025-2026', '2nd Semester', '2nd Year', 'EL 119', 'Campus Journalism', 3, 'LIST OF COURSES FOR 2ND SEM AY 25-26.xlsx'
from public.programs where code = 'ENGLISH'
on conflict on constraint course_offerings_unique_entry do nothing;
insert into public.course_offerings (program_id, academic_year, semester, year_level, course_code, course_description, units, source_document)
select id, '2025-2026', '2nd Semester', '2nd Year', 'EL 120 TTL 2', 'Technology in Language Education', 3, 'LIST OF COURSES FOR 2ND SEM AY 25-26.xlsx'
from public.programs where code = 'ENGLISH'
on conflict on constraint course_offerings_unique_entry do nothing;
insert into public.course_offerings (program_id, academic_year, semester, year_level, course_code, course_description, units, source_document)
select id, '2025-2026', '2nd Semester', '3rd Year', 'HUM 3', 'Art Appreciation', 3, 'LIST OF COURSES FOR 2ND SEM AY 25-26.xlsx'
from public.programs where code = 'ENGLISH'
on conflict on constraint course_offerings_unique_entry do nothing;
insert into public.course_offerings (program_id, academic_year, semester, year_level, course_code, course_description, units, source_document)
select id, '2025-2026', '2nd Semester', '3rd Year', 'EDUC 106', 'Assessment in Learning 2', 3, 'LIST OF COURSES FOR 2ND SEM AY 25-26.xlsx'
from public.programs where code = 'ENGLISH'
on conflict on constraint course_offerings_unique_entry do nothing;
insert into public.course_offerings (program_id, academic_year, semester, year_level, course_code, course_description, units, source_document)
select id, '2025-2026', '2nd Semester', '3rd Year', 'EDUC 110', 'Building and Enhancing New Literacies Across the Curriculum', 3, 'LIST OF COURSES FOR 2ND SEM AY 25-26.xlsx'
from public.programs where code = 'ENGLISH'
on conflict on constraint course_offerings_unique_entry do nothing;
insert into public.course_offerings (program_id, academic_year, semester, year_level, course_code, course_description, units, source_document)
select id, '2025-2026', '2nd Semester', '3rd Year', 'EL 106', 'Teaching Assessment of Literature Studies', 3, 'LIST OF COURSES FOR 2ND SEM AY 25-26.xlsx'
from public.programs where code = 'ENGLISH'
on conflict on constraint course_offerings_unique_entry do nothing;
insert into public.course_offerings (program_id, academic_year, semester, year_level, course_code, course_description, units, source_document)
select id, '2025-2026', '2nd Semester', '3rd Year', 'EL 114', 'Survey of Afro-Asian Literatue', 3, 'LIST OF COURSES FOR 2ND SEM AY 25-26.xlsx'
from public.programs where code = 'ENGLISH'
on conflict on constraint course_offerings_unique_entry do nothing;
insert into public.course_offerings (program_id, academic_year, semester, year_level, course_code, course_description, units, source_document)
select id, '2025-2026', '2nd Semester', '3rd Year', 'EL 116', 'Contemporary Popular and Emergent Literature', 3, 'LIST OF COURSES FOR 2ND SEM AY 25-26.xlsx'
from public.programs where code = 'ENGLISH'
on conflict on constraint course_offerings_unique_entry do nothing;
insert into public.course_offerings (program_id, academic_year, semester, year_level, course_code, course_description, units, source_document)
select id, '2025-2026', '2nd Semester', '3rd Year', 'EL 112', 'Mythology and Folklore', 3, 'LIST OF COURSES FOR 2ND SEM AY 25-26.xlsx'
from public.programs where code = 'ENGLISH'
on conflict on constraint course_offerings_unique_entry do nothing;
insert into public.course_offerings (program_id, academic_year, semester, year_level, course_code, course_description, units, source_document)
select id, '2025-2026', '2nd Semester', '3rd Year', 'EL 115', 'Survey of English and American Literature', 3, 'LIST OF COURSES FOR 2ND SEM AY 25-26.xlsx'
from public.programs where code = 'ENGLISH'
on conflict on constraint course_offerings_unique_entry do nothing;
insert into public.course_offerings (program_id, academic_year, semester, year_level, course_code, course_description, units, source_document)
select id, '2025-2026', '2nd Semester', '4th Year', 'EDUC 111', 'Teaching Internship', 6, 'LIST OF COURSES FOR 2ND SEM AY 25-26.xlsx'
from public.programs where code = 'ENGLISH'
on conflict on constraint course_offerings_unique_entry do nothing;
insert into public.course_offerings (program_id, academic_year, semester, year_level, course_code, course_description, units, source_document)
select id, '2025-2026', '2nd Semester', '1st Year', 'SOC SCI 1', 'Readings in the Philippine History', 3, 'LIST OF COURSES FOR 2ND SEM AY 25-26.xlsx'
from public.programs where code = 'FILIPINO'
on conflict on constraint course_offerings_unique_entry do nothing;
insert into public.course_offerings (program_id, academic_year, semester, year_level, course_code, course_description, units, source_document)
select id, '2025-2026', '2nd Semester', '1st Year', 'SOC SCI 2', 'Science, Technology and Society', 3, 'LIST OF COURSES FOR 2ND SEM AY 25-26.xlsx'
from public.programs where code = 'FILIPINO'
on conflict on constraint course_offerings_unique_entry do nothing;
insert into public.course_offerings (program_id, academic_year, semester, year_level, course_code, course_description, units, source_document)
select id, '2025-2026', '2nd Semester', '1st Year', 'EDUC 101', 'Child and Adolescent Learners & Learning Principles', 3, 'LIST OF COURSES FOR 2ND SEM AY 25-26.xlsx'
from public.programs where code = 'FILIPINO'
on conflict on constraint course_offerings_unique_entry do nothing;
insert into public.course_offerings (program_id, academic_year, semester, year_level, course_code, course_description, units, source_document)
select id, '2025-2026', '2nd Semester', '1st Year', 'FIL 103', 'Ang Filipino sa Kurikulum ng Batayang Edukasyon', 3, 'LIST OF COURSES FOR 2ND SEM AY 25-26.xlsx'
from public.programs where code = 'FILIPINO'
on conflict on constraint course_offerings_unique_entry do nothing;
insert into public.course_offerings (program_id, academic_year, semester, year_level, course_code, course_description, units, source_document)
select id, '2025-2026', '2nd Semester', '1st Year', 'Fil 104', 'Estraktura ng Wikang Filipino', 3, 'LIST OF COURSES FOR 2ND SEM AY 25-26.xlsx'
from public.programs where code = 'FILIPINO'
on conflict on constraint course_offerings_unique_entry do nothing;
insert into public.course_offerings (program_id, academic_year, semester, year_level, course_code, course_description, units, source_document)
select id, '2025-2026', '2nd Semester', '1st Year', 'LIT 102', 'Kulturang Popular', 3, 'LIST OF COURSES FOR 2ND SEM AY 25-26.xlsx'
from public.programs where code = 'FILIPINO'
on conflict on constraint course_offerings_unique_entry do nothing;
insert into public.course_offerings (program_id, academic_year, semester, year_level, course_code, course_description, units, source_document)
select id, '2025-2026', '2nd Semester', '1st Year', 'PATHFIT 2', 'Exercise-Bases Fitness Activities', 2, 'LIST OF COURSES FOR 2ND SEM AY 25-26.xlsx'
from public.programs where code = 'FILIPINO'
on conflict on constraint course_offerings_unique_entry do nothing;
insert into public.course_offerings (program_id, academic_year, semester, year_level, course_code, course_description, units, source_document)
select id, '2025-2026', '2nd Semester', '1st Year', 'NSTP 2', 'National Service Training Program', 3, 'LIST OF COURSES FOR 2ND SEM AY 25-26.xlsx'
from public.programs where code = 'FILIPINO'
on conflict on constraint course_offerings_unique_entry do nothing;
insert into public.course_offerings (program_id, academic_year, semester, year_level, course_code, course_description, units, source_document)
select id, '2025-2026', '2nd Semester', '2nd Year', 'GE ELEC 3', 'Arts and Humanities', 3, 'LIST OF COURSES FOR 2ND SEM AY 25-26.xlsx'
from public.programs where code = 'FILIPINO'
on conflict on constraint course_offerings_unique_entry do nothing;
insert into public.course_offerings (program_id, academic_year, semester, year_level, course_code, course_description, units, source_document)
select id, '2025-2026', '2nd Semester', '2nd Year', 'EDUC 104', 'Facilitating Learner-Centered Teaching', 3, 'LIST OF COURSES FOR 2ND SEM AY 25-26.xlsx'
from public.programs where code = 'FILIPINO'
on conflict on constraint course_offerings_unique_entry do nothing;
insert into public.course_offerings (program_id, academic_year, semester, year_level, course_code, course_description, units, source_document)
select id, '2025-2026', '2nd Semester', '2nd Year', 'EDUC 105', 'The Teacher and the Community, School Culture and Organizational Leadership', 3, 'LIST OF COURSES FOR 2ND SEM AY 25-26.xlsx'
from public.programs where code = 'FILIPINO'
on conflict on constraint course_offerings_unique_entry do nothing;
insert into public.course_offerings (program_id, academic_year, semester, year_level, course_code, course_description, units, source_document)
select id, '2025-2026', '2nd Semester', '2nd Year', 'FIL 107', 'Paghahanda at Ebalwasyon ng Kagamitang Panturo', 3, 'LIST OF COURSES FOR 2ND SEM AY 25-26.xlsx'
from public.programs where code = 'FILIPINO'
on conflict on constraint course_offerings_unique_entry do nothing;
insert into public.course_offerings (program_id, academic_year, semester, year_level, course_code, course_description, units, source_document)
select id, '2025-2026', '2nd Semester', '2nd Year', 'FIL 108', 'Introduksyon sa Pagsasalin', 3, 'LIST OF COURSES FOR 2ND SEM AY 25-26.xlsx'
from public.programs where code = 'FILIPINO'
on conflict on constraint course_offerings_unique_entry do nothing;
insert into public.course_offerings (program_id, academic_year, semester, year_level, course_code, course_description, units, source_document)
select id, '2025-2026', '2nd Semester', '2nd Year', 'EDUC 106', 'Assessment in Learning 2', 3, 'LIST OF COURSES FOR 2ND SEM AY 25-26.xlsx'
from public.programs where code = 'FILIPINO'
on conflict on constraint course_offerings_unique_entry do nothing;
insert into public.course_offerings (program_id, academic_year, semester, year_level, course_code, course_description, units, source_document)
select id, '2025-2026', '2nd Semester', '2nd Year', 'LIT 103', 'Sanaysay at Talumpati', 3, 'LIST OF COURSES FOR 2ND SEM AY 25-26.xlsx'
from public.programs where code = 'FILIPINO'
on conflict on constraint course_offerings_unique_entry do nothing;
insert into public.course_offerings (program_id, academic_year, semester, year_level, course_code, course_description, units, source_document)
select id, '2025-2026', '2nd Semester', '2nd Year', 'PATHFIT 4', 'Sports', 2, 'LIST OF COURSES FOR 2ND SEM AY 25-26.xlsx'
from public.programs where code = 'FILIPINO'
on conflict on constraint course_offerings_unique_entry do nothing;
insert into public.course_offerings (program_id, academic_year, semester, year_level, course_code, course_description, units, source_document)
select id, '2025-2026', '2nd Semester', '3rd Year', 'HUM 3', 'Art Appreciation', 3, 'LIST OF COURSES FOR 2ND SEM AY 25-26.xlsx'
from public.programs where code = 'FILIPINO'
on conflict on constraint course_offerings_unique_entry do nothing;
insert into public.course_offerings (program_id, academic_year, semester, year_level, course_code, course_description, units, source_document)
select id, '2025-2026', '2nd Semester', '3rd Year', 'TTL 2', 'Technology for Teaching and Learning 2', 3, 'LIST OF COURSES FOR 2ND SEM AY 25-26.xlsx'
from public.programs where code = 'FILIPINO'
on conflict on constraint course_offerings_unique_entry do nothing;
insert into public.course_offerings (program_id, academic_year, semester, year_level, course_code, course_description, units, source_document)
select id, '2025-2026', '2nd Semester', '3rd Year', 'EDUC 110', 'Building and Enhancing New Literacies Across the Curriculum', 3, 'LIST OF COURSES FOR 2ND SEM AY 25-26.xlsx'
from public.programs where code = 'FILIPINO'
on conflict on constraint course_offerings_unique_entry do nothing;
insert into public.course_offerings (program_id, academic_year, semester, year_level, course_code, course_description, units, source_document)
select id, '2025-2026', '2nd Semester', '3rd Year', 'FIL 111', 'Barayti at Baryasyo ng Wika', 3, 'LIST OF COURSES FOR 2ND SEM AY 25-26.xlsx'
from public.programs where code = 'FILIPINO'
on conflict on constraint course_offerings_unique_entry do nothing;
insert into public.course_offerings (program_id, academic_year, semester, year_level, course_code, course_description, units, source_document)
select id, '2025-2026', '2nd Semester', '3rd Year', 'FIL 112', 'Mga Natatanging Diskurso sa Wika at Panitikan', 3, 'LIST OF COURSES FOR 2ND SEM AY 25-26.xlsx'
from public.programs where code = 'FILIPINO'
on conflict on constraint course_offerings_unique_entry do nothing;
insert into public.course_offerings (program_id, academic_year, semester, year_level, course_code, course_description, units, source_document)
select id, '2025-2026', '2nd Semester', '3rd Year', 'LIT 106', 'Panulaang Filipino', 3, 'LIST OF COURSES FOR 2ND SEM AY 25-26.xlsx'
from public.programs where code = 'FILIPINO'
on conflict on constraint course_offerings_unique_entry do nothing;
insert into public.course_offerings (program_id, academic_year, semester, year_level, course_code, course_description, units, source_document)
select id, '2025-2026', '2nd Semester', '3rd Year', 'LIT 107', 'Dulang Filipino', 3, 'LIST OF COURSES FOR 2ND SEM AY 25-26.xlsx'
from public.programs where code = 'FILIPINO'
on conflict on constraint course_offerings_unique_entry do nothing;
insert into public.course_offerings (program_id, academic_year, semester, year_level, course_code, course_description, units, source_document)
select id, '2025-2026', '2nd Semester', '3rd Year', 'ELEC 1', 'Pagsasalin sa Iba''t-Ibang Disiplijna', 3, 'LIST OF COURSES FOR 2ND SEM AY 25-26.xlsx'
from public.programs where code = 'FILIPINO'
on conflict on constraint course_offerings_unique_entry do nothing;
insert into public.course_offerings (program_id, academic_year, semester, year_level, course_code, course_description, units, source_document)
select id, '2025-2026', '2nd Semester', '4th Year', 'EDUC 111', 'Teaching Internship', 6, 'LIST OF COURSES FOR 2ND SEM AY 25-26.xlsx'
from public.programs where code = 'FILIPINO'
on conflict on constraint course_offerings_unique_entry do nothing;
insert into public.course_offerings (program_id, academic_year, semester, year_level, course_code, course_description, units, source_document)
select id, '2025-2026', '2nd Semester', '1st Year', 'SOC SCI 1', 'Readings in the Philippine History', 3, 'LIST OF COURSES FOR 2ND SEM AY 25-26.xlsx'
from public.programs where code = 'MATH'
on conflict on constraint course_offerings_unique_entry do nothing;
insert into public.course_offerings (program_id, academic_year, semester, year_level, course_code, course_description, units, source_document)
select id, '2025-2026', '2nd Semester', '1st Year', 'SOC SCI 2', 'Science, Technology and Society', 3, 'LIST OF COURSES FOR 2ND SEM AY 25-26.xlsx'
from public.programs where code = 'MATH'
on conflict on constraint course_offerings_unique_entry do nothing;
insert into public.course_offerings (program_id, academic_year, semester, year_level, course_code, course_description, units, source_document)
select id, '2025-2026', '2nd Semester', '1st Year', 'EDUC 101', 'Child and Adolescent Learners & Learning Principles', 3, 'LIST OF COURSES FOR 2ND SEM AY 25-26.xlsx'
from public.programs where code = 'MATH'
on conflict on constraint course_offerings_unique_entry do nothing;
insert into public.course_offerings (program_id, academic_year, semester, year_level, course_code, course_description, units, source_document)
select id, '2025-2026', '2nd Semester', '1st Year', 'PATHFIT 2', 'Exercise-Bases Fitness Activities', 2, 'LIST OF COURSES FOR 2ND SEM AY 25-26.xlsx'
from public.programs where code = 'MATH'
on conflict on constraint course_offerings_unique_entry do nothing;
insert into public.course_offerings (program_id, academic_year, semester, year_level, course_code, course_description, units, source_document)
select id, '2025-2026', '2nd Semester', '1st Year', 'NSTP 2', 'National Service Training Program', 3, 'LIST OF COURSES FOR 2ND SEM AY 25-26.xlsx'
from public.programs where code = 'MATH'
on conflict on constraint course_offerings_unique_entry do nothing;
insert into public.course_offerings (program_id, academic_year, semester, year_level, course_code, course_description, units, source_document)
select id, '2025-2026', '2nd Semester', '1st Year', 'MATH 103', 'Trigonometry', 3, 'LIST OF COURSES FOR 2ND SEM AY 25-26.xlsx'
from public.programs where code = 'MATH'
on conflict on constraint course_offerings_unique_entry do nothing;
insert into public.course_offerings (program_id, academic_year, semester, year_level, course_code, course_description, units, source_document)
select id, '2025-2026', '2nd Semester', '1st Year', 'MATH 104', 'Plane and Solid Geometry', 3, 'LIST OF COURSES FOR 2ND SEM AY 25-26.xlsx'
from public.programs where code = 'MATH'
on conflict on constraint course_offerings_unique_entry do nothing;
insert into public.course_offerings (program_id, academic_year, semester, year_level, course_code, course_description, units, source_document)
select id, '2025-2026', '2nd Semester', '1st Year', 'Math 105', 'Mathematics of Investment', 3, 'LIST OF COURSES FOR 2ND SEM AY 25-26.xlsx'
from public.programs where code = 'MATH'
on conflict on constraint course_offerings_unique_entry do nothing;
insert into public.course_offerings (program_id, academic_year, semester, year_level, course_code, course_description, units, source_document)
select id, '2025-2026', '2nd Semester', '2nd Year', 'GE ELEC 3', 'Arts and Humanities', 3, 'LIST OF COURSES FOR 2ND SEM AY 25-26.xlsx'
from public.programs where code = 'MATH'
on conflict on constraint course_offerings_unique_entry do nothing;
insert into public.course_offerings (program_id, academic_year, semester, year_level, course_code, course_description, units, source_document)
select id, '2025-2026', '2nd Semester', '2nd Year', 'EDUC 104', 'Facilitating Learner-Centered Teaching', 3, 'LIST OF COURSES FOR 2ND SEM AY 25-26.xlsx'
from public.programs where code = 'MATH'
on conflict on constraint course_offerings_unique_entry do nothing;
insert into public.course_offerings (program_id, academic_year, semester, year_level, course_code, course_description, units, source_document)
select id, '2025-2026', '2nd Semester', '2nd Year', 'EDUC 105', 'The Teacher and the Community, School Culture and Organizational Leadership', 3, 'LIST OF COURSES FOR 2ND SEM AY 25-26.xlsx'
from public.programs where code = 'MATH'
on conflict on constraint course_offerings_unique_entry do nothing;
insert into public.course_offerings (program_id, academic_year, semester, year_level, course_code, course_description, units, source_document)
select id, '2025-2026', '2nd Semester', '2nd Year', 'EDUC 106', 'Assessment in Learning 2', 3, 'LIST OF COURSES FOR 2ND SEM AY 25-26.xlsx'
from public.programs where code = 'MATH'
on conflict on constraint course_offerings_unique_entry do nothing;
insert into public.course_offerings (program_id, academic_year, semester, year_level, course_code, course_description, units, source_document)
select id, '2025-2026', '2nd Semester', '2nd Year', 'MATH 108', 'Calculus II', 4, 'LIST OF COURSES FOR 2ND SEM AY 25-26.xlsx'
from public.programs where code = 'MATH'
on conflict on constraint course_offerings_unique_entry do nothing;
insert into public.course_offerings (program_id, academic_year, semester, year_level, course_code, course_description, units, source_document)
select id, '2025-2026', '2nd Semester', '2nd Year', 'MATH 109', 'Number Theory', 3, 'LIST OF COURSES FOR 2ND SEM AY 25-26.xlsx'
from public.programs where code = 'MATH'
on conflict on constraint course_offerings_unique_entry do nothing;
insert into public.course_offerings (program_id, academic_year, semester, year_level, course_code, course_description, units, source_document)
select id, '2025-2026', '2nd Semester', '2nd Year', 'MATH 110', 'Advance Statistics', 3, 'LIST OF COURSES FOR 2ND SEM AY 25-26.xlsx'
from public.programs where code = 'MATH'
on conflict on constraint course_offerings_unique_entry do nothing;
insert into public.course_offerings (program_id, academic_year, semester, year_level, course_code, course_description, units, source_document)
select id, '2025-2026', '2nd Semester', '2nd Year', 'PATHFIT 4', 'Sports', 2, 'LIST OF COURSES FOR 2ND SEM AY 25-26.xlsx'
from public.programs where code = 'MATH'
on conflict on constraint course_offerings_unique_entry do nothing;
insert into public.course_offerings (program_id, academic_year, semester, year_level, course_code, course_description, units, source_document)
select id, '2025-2026', '2nd Semester', '3rd Year', 'HUM 3', 'Art Appreciation', 3, 'LIST OF COURSES FOR 2ND SEM AY 25-26.xlsx'
from public.programs where code = 'MATH'
on conflict on constraint course_offerings_unique_entry do nothing;
insert into public.course_offerings (program_id, academic_year, semester, year_level, course_code, course_description, units, source_document)
select id, '2025-2026', '2nd Semester', '3rd Year', 'EDUC 110', 'Building and Enhancing New Literacies Across the Curriculum', 3, 'LIST OF COURSES FOR 2ND SEM AY 25-26.xlsx'
from public.programs where code = 'MATH'
on conflict on constraint course_offerings_unique_entry do nothing;
insert into public.course_offerings (program_id, academic_year, semester, year_level, course_code, course_description, units, source_document)
select id, '2025-2026', '2nd Semester', '3rd Year', 'MATH 114', 'Principles and Strategies in Teaching Mathermatics', 3, 'LIST OF COURSES FOR 2ND SEM AY 25-26.xlsx'
from public.programs where code = 'MATH'
on conflict on constraint course_offerings_unique_entry do nothing;
insert into public.course_offerings (program_id, academic_year, semester, year_level, course_code, course_description, units, source_document)
select id, '2025-2026', '2nd Semester', '3rd Year', 'MATH 115', 'Abstract Algebra', 3, 'LIST OF COURSES FOR 2ND SEM AY 25-26.xlsx'
from public.programs where code = 'MATH'
on conflict on constraint course_offerings_unique_entry do nothing;
insert into public.course_offerings (program_id, academic_year, semester, year_level, course_code, course_description, units, source_document)
select id, '2025-2026', '2nd Semester', '3rd Year', 'MATH 116', 'Problem Solving Mathematical Investigation and Modelling', 3, 'LIST OF COURSES FOR 2ND SEM AY 25-26.xlsx'
from public.programs where code = 'MATH'
on conflict on constraint course_offerings_unique_entry do nothing;
insert into public.course_offerings (program_id, academic_year, semester, year_level, course_code, course_description, units, source_document)
select id, '2025-2026', '2nd Semester', '3rd Year', 'MATH 117 TTL2', 'Technology for Teaching and Learning 2', 3, 'LIST OF COURSES FOR 2ND SEM AY 25-26.xlsx'
from public.programs where code = 'MATH'
on conflict on constraint course_offerings_unique_entry do nothing;
insert into public.course_offerings (program_id, academic_year, semester, year_level, course_code, course_description, units, source_document)
select id, '2025-2026', '2nd Semester', '3rd Year', 'MATH 118', 'Assessment and Evaluation in Mathematics', 3, 'LIST OF COURSES FOR 2ND SEM AY 25-26.xlsx'
from public.programs where code = 'MATH'
on conflict on constraint course_offerings_unique_entry do nothing;
insert into public.course_offerings (program_id, academic_year, semester, year_level, course_code, course_description, units, source_document)
select id, '2025-2026', '2nd Semester', '3rd Year', 'MATH 119', 'Linear Algebra', 3, 'LIST OF COURSES FOR 2ND SEM AY 25-26.xlsx'
from public.programs where code = 'MATH'
on conflict on constraint course_offerings_unique_entry do nothing;
insert into public.course_offerings (program_id, academic_year, semester, year_level, course_code, course_description, units, source_document)
select id, '2025-2026', '2nd Semester', '4th Year', 'EDUC 111', 'Teaching Internship', 6, 'LIST OF COURSES FOR 2ND SEM AY 25-26.xlsx'
from public.programs where code = 'MATH'
on conflict on constraint course_offerings_unique_entry do nothing;
insert into public.course_offerings (program_id, academic_year, semester, year_level, course_code, course_description, units, source_document)
select id, '2025-2026', '2nd Semester', '1st Year', 'SOC SCI 1', 'Readings in the Philippine History', 3, 'LIST OF COURSES FOR 2ND SEM AY 25-26.xlsx'
from public.programs where code = 'SS'
on conflict on constraint course_offerings_unique_entry do nothing;
insert into public.course_offerings (program_id, academic_year, semester, year_level, course_code, course_description, units, source_document)
select id, '2025-2026', '2nd Semester', '1st Year', 'SOC SCI 2', 'Science, Technology and Society', 3, 'LIST OF COURSES FOR 2ND SEM AY 25-26.xlsx'
from public.programs where code = 'SS'
on conflict on constraint course_offerings_unique_entry do nothing;
insert into public.course_offerings (program_id, academic_year, semester, year_level, course_code, course_description, units, source_document)
select id, '2025-2026', '2nd Semester', '1st Year', 'EDUC 101', 'Child and Adolescent Learners & Learning Principles', 3, 'LIST OF COURSES FOR 2ND SEM AY 25-26.xlsx'
from public.programs where code = 'SS'
on conflict on constraint course_offerings_unique_entry do nothing;
insert into public.course_offerings (program_id, academic_year, semester, year_level, course_code, course_description, units, source_document)
select id, '2025-2026', '2nd Semester', '1st Year', 'SS5', 'Geography 2', 3, 'LIST OF COURSES FOR 2ND SEM AY 25-26.xlsx'
from public.programs where code = 'SS'
on conflict on constraint course_offerings_unique_entry do nothing;
insert into public.course_offerings (program_id, academic_year, semester, year_level, course_code, course_description, units, source_document)
select id, '2025-2026', '2nd Semester', '1st Year', 'SS6', 'Micro Economics', 3, 'LIST OF COURSES FOR 2ND SEM AY 25-26.xlsx'
from public.programs where code = 'SS'
on conflict on constraint course_offerings_unique_entry do nothing;
insert into public.course_offerings (program_id, academic_year, semester, year_level, course_code, course_description, units, source_document)
select id, '2025-2026', '2nd Semester', '1st Year', 'SS7', 'World History 1', 3, 'LIST OF COURSES FOR 2ND SEM AY 25-26.xlsx'
from public.programs where code = 'SS'
on conflict on constraint course_offerings_unique_entry do nothing;
insert into public.course_offerings (program_id, academic_year, semester, year_level, course_code, course_description, units, source_document)
select id, '2025-2026', '2nd Semester', '1st Year', 'Pathfit 2', 'Exercise-Based Fitness Activities', 2, 'LIST OF COURSES FOR 2ND SEM AY 25-26.xlsx'
from public.programs where code = 'SS'
on conflict on constraint course_offerings_unique_entry do nothing;
insert into public.course_offerings (program_id, academic_year, semester, year_level, course_code, course_description, units, source_document)
select id, '2025-2026', '2nd Semester', '1st Year', 'NSTP 2', 'National Service Training Program', 3, 'LIST OF COURSES FOR 2ND SEM AY 25-26.xlsx'
from public.programs where code = 'SS'
on conflict on constraint course_offerings_unique_entry do nothing;
insert into public.course_offerings (program_id, academic_year, semester, year_level, course_code, course_description, units, source_document)
select id, '2025-2026', '2nd Semester', '2nd Year', 'GE ELEC 3', 'Arts and Humanities', 3, 'LIST OF COURSES FOR 2ND SEM AY 25-26.xlsx'
from public.programs where code = 'SS'
on conflict on constraint course_offerings_unique_entry do nothing;
insert into public.course_offerings (program_id, academic_year, semester, year_level, course_code, course_description, units, source_document)
select id, '2025-2026', '2nd Semester', '2nd Year', 'EDUC 104', 'Facilitating Learner-Centered Teaching', 3, 'LIST OF COURSES FOR 2ND SEM AY 25-26.xlsx'
from public.programs where code = 'SS'
on conflict on constraint course_offerings_unique_entry do nothing;
insert into public.course_offerings (program_id, academic_year, semester, year_level, course_code, course_description, units, source_document)
select id, '2025-2026', '2nd Semester', '2nd Year', 'EDUC 105', 'The Teacher and the Community, School Culture and Organizational Leadership', 3, 'LIST OF COURSES FOR 2ND SEM AY 25-26.xlsx'
from public.programs where code = 'SS'
on conflict on constraint course_offerings_unique_entry do nothing;
insert into public.course_offerings (program_id, academic_year, semester, year_level, course_code, course_description, units, source_document)
select id, '2025-2026', '2nd Semester', '2nd Year', 'EDUC 106', 'Assessment in Learning 2', 3, 'LIST OF COURSES FOR 2ND SEM AY 25-26.xlsx'
from public.programs where code = 'SS'
on conflict on constraint course_offerings_unique_entry do nothing;
insert into public.course_offerings (program_id, academic_year, semester, year_level, course_code, course_description, units, source_document)
select id, '2025-2026', '2nd Semester', '2nd Year', 'SS10', 'World History 2', 3, 'LIST OF COURSES FOR 2ND SEM AY 25-26.xlsx'
from public.programs where code = 'SS'
on conflict on constraint course_offerings_unique_entry do nothing;
insert into public.course_offerings (program_id, academic_year, semester, year_level, course_code, course_description, units, source_document)
select id, '2025-2026', '2nd Semester', '2nd Year', 'SS11', 'Asian Studies', 3, 'LIST OF COURSES FOR 2ND SEM AY 25-26.xlsx'
from public.programs where code = 'SS'
on conflict on constraint course_offerings_unique_entry do nothing;
insert into public.course_offerings (program_id, academic_year, semester, year_level, course_code, course_description, units, source_document)
select id, '2025-2026', '2nd Semester', '2nd Year', 'SS12', 'Socio-Cultural Anthropology', 3, 'LIST OF COURSES FOR 2ND SEM AY 25-26.xlsx'
from public.programs where code = 'SS'
on conflict on constraint course_offerings_unique_entry do nothing;
insert into public.course_offerings (program_id, academic_year, semester, year_level, course_code, course_description, units, source_document)
select id, '2025-2026', '2nd Semester', '2nd Year', 'PATHFit 4', 'Sports', 2, 'LIST OF COURSES FOR 2ND SEM AY 25-26.xlsx'
from public.programs where code = 'SS'
on conflict on constraint course_offerings_unique_entry do nothing;
insert into public.course_offerings (program_id, academic_year, semester, year_level, course_code, course_description, units, source_document)
select id, '2025-2026', '2nd Semester', '3rd Year', 'HUM 3', 'Art Appreciation', 3, 'LIST OF COURSES FOR 2ND SEM AY 25-26.xlsx'
from public.programs where code = 'SS'
on conflict on constraint course_offerings_unique_entry do nothing;
insert into public.course_offerings (program_id, academic_year, semester, year_level, course_code, course_description, units, source_document)
select id, '2025-2026', '2nd Semester', '3rd Year', 'TTL 2', 'Technology for Teaching and Learning 2*', 3, 'LIST OF COURSES FOR 2ND SEM AY 25-26.xlsx'
from public.programs where code = 'SS'
on conflict on constraint course_offerings_unique_entry do nothing;
insert into public.course_offerings (program_id, academic_year, semester, year_level, course_code, course_description, units, source_document)
select id, '2025-2026', '2nd Semester', '3rd Year', 'EDUC 110', 'Building and Enhancing New Literacies Across the Curriculum', 3, 'LIST OF COURSES FOR 2ND SEM AY 25-26.xlsx'
from public.programs where code = 'SS'
on conflict on constraint course_offerings_unique_entry do nothing;
insert into public.course_offerings (program_id, academic_year, semester, year_level, course_code, course_description, units, source_document)
select id, '2025-2026', '2nd Semester', '3rd Year', 'SS17', 'Law Related Studies', 3, 'LIST OF COURSES FOR 2ND SEM AY 25-26.xlsx'
from public.programs where code = 'SS'
on conflict on constraint course_offerings_unique_entry do nothing;
insert into public.course_offerings (program_id, academic_year, semester, year_level, course_code, course_description, units, source_document)
select id, '2025-2026', '2nd Semester', '3rd Year', 'SS18', 'Integrative Methods in Teaching Social Science Discipline in Basic Education', 3, 'LIST OF COURSES FOR 2ND SEM AY 25-26.xlsx'
from public.programs where code = 'SS'
on conflict on constraint course_offerings_unique_entry do nothing;
insert into public.course_offerings (program_id, academic_year, semester, year_level, course_code, course_description, units, source_document)
select id, '2025-2026', '2nd Semester', '3rd Year', 'SS19', 'Production of Social Studies Instructional Materials', 3, 'LIST OF COURSES FOR 2ND SEM AY 25-26.xlsx'
from public.programs where code = 'SS'
on conflict on constraint course_offerings_unique_entry do nothing;
insert into public.course_offerings (program_id, academic_year, semester, year_level, course_code, course_description, units, source_document)
select id, '2025-2026', '2nd Semester', '3rd Year', 'SS20', 'Assessment and Evaluation in the Social Science', 3, 'LIST OF COURSES FOR 2ND SEM AY 25-26.xlsx'
from public.programs where code = 'SS'
on conflict on constraint course_offerings_unique_entry do nothing;
insert into public.course_offerings (program_id, academic_year, semester, year_level, course_code, course_description, units, source_document)
select id, '2025-2026', '2nd Semester', '3rd Year', 'Elective 1', 'Social Networking for Social Integration', 3, 'LIST OF COURSES FOR 2ND SEM AY 25-26.xlsx'
from public.programs where code = 'SS'
on conflict on constraint course_offerings_unique_entry do nothing;
insert into public.course_offerings (program_id, academic_year, semester, year_level, course_code, course_description, units, source_document)
select id, '2025-2026', '2nd Semester', '4th Year', 'EDUC 111', 'Teaching Internship*', 6, 'LIST OF COURSES FOR 2ND SEM AY 25-26.xlsx'
from public.programs where code = 'SS'
on conflict on constraint course_offerings_unique_entry do nothing;
insert into public.course_offerings (program_id, academic_year, semester, year_level, course_code, course_description, units, source_document)
select id, '2025-2026', '2nd Semester', '1st Year', 'SOC SCI 1', 'Readings in the Philippine History', 3, 'LIST OF COURSES FOR 2ND SEM AY 25-26.xlsx'
from public.programs where code = 'ACP'
on conflict on constraint course_offerings_unique_entry do nothing;
insert into public.course_offerings (program_id, academic_year, semester, year_level, course_code, course_description, units, source_document)
select id, '2025-2026', '2nd Semester', '1st Year', 'SOC SCI 2', 'Science, Technology and Society', 3, 'LIST OF COURSES FOR 2ND SEM AY 25-26.xlsx'
from public.programs where code = 'ACP'
on conflict on constraint course_offerings_unique_entry do nothing;
insert into public.course_offerings (program_id, academic_year, semester, year_level, course_code, course_description, units, source_document)
select id, '2025-2026', '2nd Semester', '1st Year', 'EDUC 101', 'Child and Adolescent Learners & Learning Principles', 3, 'LIST OF COURSES FOR 2ND SEM AY 25-26.xlsx'
from public.programs where code = 'ACP'
on conflict on constraint course_offerings_unique_entry do nothing;
insert into public.course_offerings (program_id, academic_year, semester, year_level, course_code, course_description, units, source_document)
select id, '2025-2026', '2nd Semester', '1st Year', 'AGRI CROPS 4', 'Field Crops and Cereal Productrion Management', 3, 'LIST OF COURSES FOR 2ND SEM AY 25-26.xlsx'
from public.programs where code = 'ACP'
on conflict on constraint course_offerings_unique_entry do nothing;
insert into public.course_offerings (program_id, academic_year, semester, year_level, course_code, course_description, units, source_document)
select id, '2025-2026', '2nd Semester', '1st Year', 'AGRI CROPS 5', 'Irrigation and Drainage', 3, 'LIST OF COURSES FOR 2ND SEM AY 25-26.xlsx'
from public.programs where code = 'ACP'
on conflict on constraint course_offerings_unique_entry do nothing;
insert into public.course_offerings (program_id, academic_year, semester, year_level, course_code, course_description, units, source_document)
select id, '2025-2026', '2nd Semester', '1st Year', 'TLE 2', 'Home Economics and Literacy', 3, 'LIST OF COURSES FOR 2ND SEM AY 25-26.xlsx'
from public.programs where code = 'ACP'
on conflict on constraint course_offerings_unique_entry do nothing;
insert into public.course_offerings (program_id, academic_year, semester, year_level, course_code, course_description, units, source_document)
select id, '2025-2026', '2nd Semester', '1st Year', 'TLE 3', 'Teaching ICT as an Exploratory Course', 3, 'LIST OF COURSES FOR 2ND SEM AY 25-26.xlsx'
from public.programs where code = 'ACP'
on conflict on constraint course_offerings_unique_entry do nothing;
insert into public.course_offerings (program_id, academic_year, semester, year_level, course_code, course_description, units, source_document)
select id, '2025-2026', '2nd Semester', '1st Year', 'PATHFIT 2', 'Exercise-Based Fitness Activites', 2, 'LIST OF COURSES FOR 2ND SEM AY 25-26.xlsx'
from public.programs where code = 'ACP'
on conflict on constraint course_offerings_unique_entry do nothing;
insert into public.course_offerings (program_id, academic_year, semester, year_level, course_code, course_description, units, source_document)
select id, '2025-2026', '2nd Semester', '1st Year', 'NSTP 2', 'National Service Training Program 2', 3, 'LIST OF COURSES FOR 2ND SEM AY 25-26.xlsx'
from public.programs where code = 'ACP'
on conflict on constraint course_offerings_unique_entry do nothing;
insert into public.course_offerings (program_id, academic_year, semester, year_level, course_code, course_description, units, source_document)
select id, '2025-2026', '2nd Semester', '2nd Year', 'GE ELEC 3', 'Arts and Humanities', 3, 'LIST OF COURSES FOR 2ND SEM AY 25-26.xlsx'
from public.programs where code = 'ACP'
on conflict on constraint course_offerings_unique_entry do nothing;
insert into public.course_offerings (program_id, academic_year, semester, year_level, course_code, course_description, units, source_document)
select id, '2025-2026', '2nd Semester', '2nd Year', 'EDUC 104', 'Facilitating Learner-Centered Teaching:The Learner-Centered Approaches with Emphasis on Trainers Methodology 1', 3, 'LIST OF COURSES FOR 2ND SEM AY 25-26.xlsx'
from public.programs where code = 'ACP'
on conflict on constraint course_offerings_unique_entry do nothing;
insert into public.course_offerings (program_id, academic_year, semester, year_level, course_code, course_description, units, source_document)
select id, '2025-2026', '2nd Semester', '2nd Year', 'EDUC 105', 'The Teacher and the Community, School Culture and Organizational Leadership with focus on the Philippine TVET System', 3, 'LIST OF COURSES FOR 2ND SEM AY 25-26.xlsx'
from public.programs where code = 'ACP'
on conflict on constraint course_offerings_unique_entry do nothing;
insert into public.course_offerings (program_id, academic_year, semester, year_level, course_code, course_description, units, source_document)
select id, '2025-2026', '2nd Semester', '2nd Year', 'TLE 4', 'Introduction to Agriculture and Fisheries', 3, 'LIST OF COURSES FOR 2ND SEM AY 25-26.xlsx'
from public.programs where code = 'ACP'
on conflict on constraint course_offerings_unique_entry do nothing;
insert into public.course_offerings (program_id, academic_year, semester, year_level, course_code, course_description, units, source_document)
select id, '2025-2026', '2nd Semester', '2nd Year', 'TLE 5', 'Entrepreneurship', 3, 'LIST OF COURSES FOR 2ND SEM AY 25-26.xlsx'
from public.programs where code = 'ACP'
on conflict on constraint course_offerings_unique_entry do nothing;
insert into public.course_offerings (program_id, academic_year, semester, year_level, course_code, course_description, units, source_document)
select id, '2025-2026', '2nd Semester', '2nd Year', 'EDUC 106', 'Assessment in Learning 2 with focus on Trainers Methodology I & II', 3, 'LIST OF COURSES FOR 2ND SEM AY 25-26.xlsx'
from public.programs where code = 'ACP'
on conflict on constraint course_offerings_unique_entry do nothing;
insert into public.course_offerings (program_id, academic_year, semester, year_level, course_code, course_description, units, source_document)
select id, '2025-2026', '2nd Semester', '2nd Year', 'AGRI CROPS 8', 'Agricultural Mechanics I', 3, 'LIST OF COURSES FOR 2ND SEM AY 25-26.xlsx'
from public.programs where code = 'ACP'
on conflict on constraint course_offerings_unique_entry do nothing;
insert into public.course_offerings (program_id, academic_year, semester, year_level, course_code, course_description, units, source_document)
select id, '2025-2026', '2nd Semester', '2nd Year', 'AGRI CROPS 9', 'Agricultural Crops Production Management', 3, 'LIST OF COURSES FOR 2ND SEM AY 25-26.xlsx'
from public.programs where code = 'ACP'
on conflict on constraint course_offerings_unique_entry do nothing;
insert into public.course_offerings (program_id, academic_year, semester, year_level, course_code, course_description, units, source_document)
select id, '2025-2026', '2nd Semester', '2nd Year', 'TLE 6', 'Teaching the Common Competence in 1A', 3, 'LIST OF COURSES FOR 2ND SEM AY 25-26.xlsx'
from public.programs where code = 'ACP'
on conflict on constraint course_offerings_unique_entry do nothing;
insert into public.course_offerings (program_id, academic_year, semester, year_level, course_code, course_description, units, source_document)
select id, '2025-2026', '2nd Semester', '2nd Year', 'PATHFit 4', 'Sports', 2, 'LIST OF COURSES FOR 2ND SEM AY 25-26.xlsx'
from public.programs where code = 'ACP'
on conflict on constraint course_offerings_unique_entry do nothing;
insert into public.course_offerings (program_id, academic_year, semester, year_level, course_code, course_description, units, source_document)
select id, '2025-2026', '2nd Semester', '3rd Year', 'HUM 3', 'Art Appreciation', 3, 'LIST OF COURSES FOR 2ND SEM AY 25-26.xlsx'
from public.programs where code = 'ACP'
on conflict on constraint course_offerings_unique_entry do nothing;
insert into public.course_offerings (program_id, academic_year, semester, year_level, course_code, course_description, units, source_document)
select id, '2025-2026', '2nd Semester', '3rd Year', 'EDUC 110', 'Building and Enhancing New Literacies Across the Curriculum', 3, 'LIST OF COURSES FOR 2ND SEM AY 25-26.xlsx'
from public.programs where code = 'ACP'
on conflict on constraint course_offerings_unique_entry do nothing;
insert into public.course_offerings (program_id, academic_year, semester, year_level, course_code, course_description, units, source_document)
select id, '2025-2026', '2nd Semester', '3rd Year', 'AGRI CROPS 7TTL 2', 'Technology for Teaching and Learning 2', 3, 'LIST OF COURSES FOR 2ND SEM AY 25-26.xlsx'
from public.programs where code = 'ACP'
on conflict on constraint course_offerings_unique_entry do nothing;
insert into public.course_offerings (program_id, academic_year, semester, year_level, course_code, course_description, units, source_document)
select id, '2025-2026', '2nd Semester', '3rd Year', 'AC 2', 'Technology Research 2', 3, 'LIST OF COURSES FOR 2ND SEM AY 25-26.xlsx'
from public.programs where code = 'ACP'
on conflict on constraint course_offerings_unique_entry do nothing;
insert into public.course_offerings (program_id, academic_year, semester, year_level, course_code, course_description, units, source_document)
select id, '2025-2026', '2nd Semester', '3rd Year', 'TLE 8', 'Teaching the Common Competencies in ICT', 3, 'LIST OF COURSES FOR 2ND SEM AY 25-26.xlsx'
from public.programs where code = 'ACP'
on conflict on constraint course_offerings_unique_entry do nothing;
insert into public.course_offerings (program_id, academic_year, semester, year_level, course_code, course_description, units, source_document)
select id, '2025-2026', '2nd Semester', '3rd Year', 'TLE 9', 'Teaching the Common Competencies in AFA', 3, 'LIST OF COURSES FOR 2ND SEM AY 25-26.xlsx'
from public.programs where code = 'ACP'
on conflict on constraint course_offerings_unique_entry do nothing;
insert into public.course_offerings (program_id, academic_year, semester, year_level, course_code, course_description, units, source_document)
select id, '2025-2026', '2nd Semester', '3rd Year', 'TLE 10', 'Supervised Industrial Training', 3, 'LIST OF COURSES FOR 2ND SEM AY 25-26.xlsx'
from public.programs where code = 'ACP'
on conflict on constraint course_offerings_unique_entry do nothing;
insert into public.course_offerings (program_id, academic_year, semester, year_level, course_code, course_description, units, source_document)
select id, '2025-2026', '2nd Semester', '3rd Year', 'AGRI CROPS 13', 'Crop Protection', 3, 'LIST OF COURSES FOR 2ND SEM AY 25-26.xlsx'
from public.programs where code = 'ACP'
on conflict on constraint course_offerings_unique_entry do nothing;
insert into public.course_offerings (program_id, academic_year, semester, year_level, course_code, course_description, units, source_document)
select id, '2025-2026', '2nd Semester', '4th Year', 'EDUC 111', 'Teaching Internship*', 6, 'LIST OF COURSES FOR 2ND SEM AY 25-26.xlsx'
from public.programs where code = 'ACP'
on conflict on constraint course_offerings_unique_entry do nothing;
insert into public.course_offerings (program_id, academic_year, semester, year_level, course_code, course_description, units, source_document)
select id, '2025-2026', '2nd Semester', '1st Year', 'SOC SCI 1', 'Readings in the Philippine History', 3, 'LIST OF COURSES FOR 2ND SEM AY 25-26.xlsx'
from public.programs where code = 'FSM'
on conflict on constraint course_offerings_unique_entry do nothing;
insert into public.course_offerings (program_id, academic_year, semester, year_level, course_code, course_description, units, source_document)
select id, '2025-2026', '2nd Semester', '1st Year', 'SOC SCI 2', 'Science, Technology and Society', 3, 'LIST OF COURSES FOR 2ND SEM AY 25-26.xlsx'
from public.programs where code = 'FSM'
on conflict on constraint course_offerings_unique_entry do nothing;
insert into public.course_offerings (program_id, academic_year, semester, year_level, course_code, course_description, units, source_document)
select id, '2025-2026', '2nd Semester', '1st Year', 'EDUC 101', 'Child and Adolescent Learners & Learning Principles', 3, 'LIST OF COURSES FOR 2ND SEM AY 25-26.xlsx'
from public.programs where code = 'FSM'
on conflict on constraint course_offerings_unique_entry do nothing;
insert into public.course_offerings (program_id, academic_year, semester, year_level, course_code, course_description, units, source_document)
select id, '2025-2026', '2nd Semester', '1st Year', 'FSM 4', 'Food Processing, Packaging and Labeling', 3, 'LIST OF COURSES FOR 2ND SEM AY 25-26.xlsx'
from public.programs where code = 'FSM'
on conflict on constraint course_offerings_unique_entry do nothing;
insert into public.course_offerings (program_id, academic_year, semester, year_level, course_code, course_description, units, source_document)
select id, '2025-2026', '2nd Semester', '1st Year', 'FSM 5', 'Basic Baking', 3, 'LIST OF COURSES FOR 2ND SEM AY 25-26.xlsx'
from public.programs where code = 'FSM'
on conflict on constraint course_offerings_unique_entry do nothing;
insert into public.course_offerings (program_id, academic_year, semester, year_level, course_code, course_description, units, source_document)
select id, '2025-2026', '2nd Semester', '1st Year', 'TLE 2', 'Home Economics and Literacy', 3, 'LIST OF COURSES FOR 2ND SEM AY 25-26.xlsx'
from public.programs where code = 'FSM'
on conflict on constraint course_offerings_unique_entry do nothing;
insert into public.course_offerings (program_id, academic_year, semester, year_level, course_code, course_description, units, source_document)
select id, '2025-2026', '2nd Semester', '1st Year', 'TLE 3', 'Teaching ICT as an Exploratory Course', 3, 'LIST OF COURSES FOR 2ND SEM AY 25-26.xlsx'
from public.programs where code = 'FSM'
on conflict on constraint course_offerings_unique_entry do nothing;
insert into public.course_offerings (program_id, academic_year, semester, year_level, course_code, course_description, units, source_document)
select id, '2025-2026', '2nd Semester', '1st Year', 'PATHFIT 2', 'Exercise-Based Fitness Activites', 2, 'LIST OF COURSES FOR 2ND SEM AY 25-26.xlsx'
from public.programs where code = 'FSM'
on conflict on constraint course_offerings_unique_entry do nothing;
insert into public.course_offerings (program_id, academic_year, semester, year_level, course_code, course_description, units, source_document)
select id, '2025-2026', '2nd Semester', '1st Year', 'NSTP 2', 'National Service Training Program 2', 3, 'LIST OF COURSES FOR 2ND SEM AY 25-26.xlsx'
from public.programs where code = 'FSM'
on conflict on constraint course_offerings_unique_entry do nothing;
insert into public.course_offerings (program_id, academic_year, semester, year_level, course_code, course_description, units, source_document)
select id, '2025-2026', '2nd Semester', '2nd Year', 'GE ELEC 3', 'Arts and Humanities', 3, 'LIST OF COURSES FOR 2ND SEM AY 25-26.xlsx'
from public.programs where code = 'FSM'
on conflict on constraint course_offerings_unique_entry do nothing;
insert into public.course_offerings (program_id, academic_year, semester, year_level, course_code, course_description, units, source_document)
select id, '2025-2026', '2nd Semester', '2nd Year', 'EDUC 104', 'Facilitating Learner-Centered Teaching:The Learner-Centered Approaches with Emphasis on Trainers Methodology 1', 3, 'LIST OF COURSES FOR 2ND SEM AY 25-26.xlsx'
from public.programs where code = 'FSM'
on conflict on constraint course_offerings_unique_entry do nothing;
insert into public.course_offerings (program_id, academic_year, semester, year_level, course_code, course_description, units, source_document)
select id, '2025-2026', '2nd Semester', '2nd Year', 'EDUC 105', 'The Teacher and the Community, School Culture and Organizational Leadership with focus on the Philippine TVET System', 3, 'LIST OF COURSES FOR 2ND SEM AY 25-26.xlsx'
from public.programs where code = 'FSM'
on conflict on constraint course_offerings_unique_entry do nothing;
insert into public.course_offerings (program_id, academic_year, semester, year_level, course_code, course_description, units, source_document)
select id, '2025-2026', '2nd Semester', '2nd Year', 'TLE 4', 'Introduction to Agriculture and Fisheries', 3, 'LIST OF COURSES FOR 2ND SEM AY 25-26.xlsx'
from public.programs where code = 'FSM'
on conflict on constraint course_offerings_unique_entry do nothing;
insert into public.course_offerings (program_id, academic_year, semester, year_level, course_code, course_description, units, source_document)
select id, '2025-2026', '2nd Semester', '2nd Year', 'TLE 5', 'Entrepreneurship', 3, 'LIST OF COURSES FOR 2ND SEM AY 25-26.xlsx'
from public.programs where code = 'FSM'
on conflict on constraint course_offerings_unique_entry do nothing;
insert into public.course_offerings (program_id, academic_year, semester, year_level, course_code, course_description, units, source_document)
select id, '2025-2026', '2nd Semester', '2nd Year', 'EDUC 106', 'Assessment in Learning 2 with focus on Trainers Methodology I & II', 3, 'LIST OF COURSES FOR 2ND SEM AY 25-26.xlsx'
from public.programs where code = 'FSM'
on conflict on constraint course_offerings_unique_entry do nothing;
insert into public.course_offerings (program_id, academic_year, semester, year_level, course_code, course_description, units, source_document)
select id, '2025-2026', '2nd Semester', '2nd Year', 'FSM 8', 'Quantity Cookery', 3, 'LIST OF COURSES FOR 2ND SEM AY 25-26.xlsx'
from public.programs where code = 'FSM'
on conflict on constraint course_offerings_unique_entry do nothing;
insert into public.course_offerings (program_id, academic_year, semester, year_level, course_code, course_description, units, source_document)
select id, '2025-2026', '2nd Semester', '2nd Year', 'FSM 9', 'Advbanced Baking', 3, 'LIST OF COURSES FOR 2ND SEM AY 25-26.xlsx'
from public.programs where code = 'FSM'
on conflict on constraint course_offerings_unique_entry do nothing;
insert into public.course_offerings (program_id, academic_year, semester, year_level, course_code, course_description, units, source_document)
select id, '2025-2026', '2nd Semester', '2nd Year', 'TLE 6', 'Teaching the Common Competence in 1A', 3, 'LIST OF COURSES FOR 2ND SEM AY 25-26.xlsx'
from public.programs where code = 'FSM'
on conflict on constraint course_offerings_unique_entry do nothing;
insert into public.course_offerings (program_id, academic_year, semester, year_level, course_code, course_description, units, source_document)
select id, '2025-2026', '2nd Semester', '2nd Year', 'PATHFit 4', 'Sports', 2, 'LIST OF COURSES FOR 2ND SEM AY 25-26.xlsx'
from public.programs where code = 'FSM'
on conflict on constraint course_offerings_unique_entry do nothing;
insert into public.course_offerings (program_id, academic_year, semester, year_level, course_code, course_description, units, source_document)
select id, '2025-2026', '2nd Semester', '3rd Year', 'HUM 3', 'Art Appreciation', 3, 'LIST OF COURSES FOR 2ND SEM AY 25-26.xlsx'
from public.programs where code = 'FSM'
on conflict on constraint course_offerings_unique_entry do nothing;
insert into public.course_offerings (program_id, academic_year, semester, year_level, course_code, course_description, units, source_document)
select id, '2025-2026', '2nd Semester', '3rd Year', 'EDUC 110', 'Building and Enhancing New Literacies Across the Curriculum with Emphasis on the 21st Centrury Skills', 3, 'LIST OF COURSES FOR 2ND SEM AY 25-26.xlsx'
from public.programs where code = 'FSM'
on conflict on constraint course_offerings_unique_entry do nothing;
insert into public.course_offerings (program_id, academic_year, semester, year_level, course_code, course_description, units, source_document)
select id, '2025-2026', '2nd Semester', '3rd Year', 'FSM 7 TTL 2', 'Technology for Teacing and Learning 2', 3, 'LIST OF COURSES FOR 2ND SEM AY 25-26.xlsx'
from public.programs where code = 'FSM'
on conflict on constraint course_offerings_unique_entry do nothing;
insert into public.course_offerings (program_id, academic_year, semester, year_level, course_code, course_description, units, source_document)
select id, '2025-2026', '2nd Semester', '3rd Year', 'AC 2', 'Technology Research 2', 3, 'LIST OF COURSES FOR 2ND SEM AY 25-26.xlsx'
from public.programs where code = 'FSM'
on conflict on constraint course_offerings_unique_entry do nothing;
insert into public.course_offerings (program_id, academic_year, semester, year_level, course_code, course_description, units, source_document)
select id, '2025-2026', '2nd Semester', '3rd Year', 'TLE 8', 'Teaching the Common Competencies in ICT', 3, 'LIST OF COURSES FOR 2ND SEM AY 25-26.xlsx'
from public.programs where code = 'FSM'
on conflict on constraint course_offerings_unique_entry do nothing;
insert into public.course_offerings (program_id, academic_year, semester, year_level, course_code, course_description, units, source_document)
select id, '2025-2026', '2nd Semester', '3rd Year', 'TLE 9', 'Teaching the Common Competencies in AFA', 3, 'LIST OF COURSES FOR 2ND SEM AY 25-26.xlsx'
from public.programs where code = 'FSM'
on conflict on constraint course_offerings_unique_entry do nothing;
insert into public.course_offerings (program_id, academic_year, semester, year_level, course_code, course_description, units, source_document)
select id, '2025-2026', '2nd Semester', '3rd Year', 'TLE 10', 'Supervised Industrial Training', 3, 'LIST OF COURSES FOR 2ND SEM AY 25-26.xlsx'
from public.programs where code = 'FSM'
on conflict on constraint course_offerings_unique_entry do nothing;
insert into public.course_offerings (program_id, academic_year, semester, year_level, course_code, course_description, units, source_document)
select id, '2025-2026', '2nd Semester', '3rd Year', 'FSM  13', 'Cafeteria and Catering Management', 3, 'LIST OF COURSES FOR 2ND SEM AY 25-26.xlsx'
from public.programs where code = 'FSM'
on conflict on constraint course_offerings_unique_entry do nothing;
insert into public.course_offerings (program_id, academic_year, semester, year_level, course_code, course_description, units, source_document)
select id, '2025-2026', '2nd Semester', '4th Year', 'EDUC 111', 'Teaching Internship*', 6, 'LIST OF COURSES FOR 2ND SEM AY 25-26.xlsx'
from public.programs where code = 'FSM'
on conflict on constraint course_offerings_unique_entry do nothing;
insert into public.course_offerings (program_id, academic_year, semester, year_level, course_code, course_description, units, source_document)
select id, '2025-2026', '2nd Semester', '1st Year', 'GE 4', 'Readings in Philippine History', 3, 'LIST OF COURSES FOR 2ND SEM AY 25-26.xlsx'
from public.programs where code = 'BSAIS'
on conflict on constraint course_offerings_unique_entry do nothing;
insert into public.course_offerings (program_id, academic_year, semester, year_level, course_code, course_description, units, source_document)
select id, '2025-2026', '2nd Semester', '1st Year', 'GE 5', 'Science, Technology and Society', 3, 'LIST OF COURSES FOR 2ND SEM AY 25-26.xlsx'
from public.programs where code = 'BSAIS'
on conflict on constraint course_offerings_unique_entry do nothing;
insert into public.course_offerings (program_id, academic_year, semester, year_level, course_code, course_description, units, source_document)
select id, '2025-2026', '2nd Semester', '1st Year', 'AE 3', 'Conceptual Framework and Accounting Standards', 3, 'LIST OF COURSES FOR 2ND SEM AY 25-26.xlsx'
from public.programs where code = 'BSAIS'
on conflict on constraint course_offerings_unique_entry do nothing;
insert into public.course_offerings (program_id, academic_year, semester, year_level, course_code, course_description, units, source_document)
select id, '2025-2026', '2nd Semester', '1st Year', 'AE 4', 'Cost Accounting and Control', 3, 'LIST OF COURSES FOR 2ND SEM AY 25-26.xlsx'
from public.programs where code = 'BSAIS'
on conflict on constraint course_offerings_unique_entry do nothing;
insert into public.course_offerings (program_id, academic_year, semester, year_level, course_code, course_description, units, source_document)
select id, '2025-2026', '2nd Semester', '1st Year', 'AE 5', 'Law on Obligations and contracts', 3, 'LIST OF COURSES FOR 2ND SEM AY 25-26.xlsx'
from public.programs where code = 'BSAIS'
on conflict on constraint course_offerings_unique_entry do nothing;
insert into public.course_offerings (program_id, academic_year, semester, year_level, course_code, course_description, units, source_document)
select id, '2025-2026', '2nd Semester', '1st Year', 'AE 6', 'Economic Development', 3, 'LIST OF COURSES FOR 2ND SEM AY 25-26.xlsx'
from public.programs where code = 'BSAIS'
on conflict on constraint course_offerings_unique_entry do nothing;
insert into public.course_offerings (program_id, academic_year, semester, year_level, course_code, course_description, units, source_document)
select id, '2025-2026', '2nd Semester', '1st Year', 'PE 2', 'Fitness Exercise for Specific Sports', 2, 'LIST OF COURSES FOR 2ND SEM AY 25-26.xlsx'
from public.programs where code = 'BSAIS'
on conflict on constraint course_offerings_unique_entry do nothing;
insert into public.course_offerings (program_id, academic_year, semester, year_level, course_code, course_description, units, source_document)
select id, '2025-2026', '2nd Semester', '1st Year', 'NSTP 2', 'National Srvice Training Program', 3, 'LIST OF COURSES FOR 2ND SEM AY 25-26.xlsx'
from public.programs where code = 'BSAIS'
on conflict on constraint course_offerings_unique_entry do nothing;
insert into public.course_offerings (program_id, academic_year, semester, year_level, course_code, course_description, units, source_document)
select id, '2025-2026', '2nd Semester', '2nd Year', 'GE Elec 1', 'BUSINESS LOGIC', 3, 'LIST OF COURSES FOR 2ND SEM AY 25-26.xlsx'
from public.programs where code = 'BSAIS'
on conflict on constraint course_offerings_unique_entry do nothing;
insert into public.course_offerings (program_id, academic_year, semester, year_level, course_code, course_description, units, source_document)
select id, '2025-2026', '2nd Semester', '2nd Year', 'AE 12', 'Introduction Accounting Information System', 3, 'LIST OF COURSES FOR 2ND SEM AY 25-26.xlsx'
from public.programs where code = 'BSAIS'
on conflict on constraint course_offerings_unique_entry do nothing;
insert into public.course_offerings (program_id, academic_year, semester, year_level, course_code, course_description, units, source_document)
select id, '2025-2026', '2nd Semester', '2nd Year', 'AE 13', 'Intermediate Accounting 2', 3, 'LIST OF COURSES FOR 2ND SEM AY 25-26.xlsx'
from public.programs where code = 'BSAIS'
on conflict on constraint course_offerings_unique_entry do nothing;
insert into public.course_offerings (program_id, academic_year, semester, year_level, course_code, course_description, units, source_document)
select id, '2025-2026', '2nd Semester', '2nd Year', 'AE 14', 'Business Taxation', 3, 'LIST OF COURSES FOR 2ND SEM AY 25-26.xlsx'
from public.programs where code = 'BSAIS'
on conflict on constraint course_offerings_unique_entry do nothing;
insert into public.course_offerings (program_id, academic_year, semester, year_level, course_code, course_description, units, source_document)
select id, '2025-2026', '2nd Semester', '2nd Year', 'AE 15', 'Regulatory Framework and Legal Issues in Business', 3, 'LIST OF COURSES FOR 2ND SEM AY 25-26.xlsx'
from public.programs where code = 'BSAIS'
on conflict on constraint course_offerings_unique_entry do nothing;
insert into public.course_offerings (program_id, academic_year, semester, year_level, course_code, course_description, units, source_document)
select id, '2025-2026', '2nd Semester', '2nd Year', 'AE 16', 'Financial Management', 3, 'LIST OF COURSES FOR 2ND SEM AY 25-26.xlsx'
from public.programs where code = 'BSAIS'
on conflict on constraint course_offerings_unique_entry do nothing;
insert into public.course_offerings (program_id, academic_year, semester, year_level, course_code, course_description, units, source_document)
select id, '2025-2026', '2nd Semester', '2nd Year', 'AE 17', 'Management Science', 3, 'LIST OF COURSES FOR 2ND SEM AY 25-26.xlsx'
from public.programs where code = 'BSAIS'
on conflict on constraint course_offerings_unique_entry do nothing;
insert into public.course_offerings (program_id, academic_year, semester, year_level, course_code, course_description, units, source_document)
select id, '2025-2026', '2nd Semester', '2nd Year', 'PE 4', 'Phusical Activities Towards Health and Fitness Sports', 2, 'LIST OF COURSES FOR 2ND SEM AY 25-26.xlsx'
from public.programs where code = 'BSAIS'
on conflict on constraint course_offerings_unique_entry do nothing;
insert into public.course_offerings (program_id, academic_year, semester, year_level, course_code, course_description, units, source_document)
select id, '2025-2026', '2nd Semester', '2nd Year', 'Ge Elec2', 'Social Science and Philisophy', 3, 'LIST OF COURSES FOR 2ND SEM AY 25-26.xlsx'
from public.programs where code = 'BSAIS'
on conflict on constraint course_offerings_unique_entry do nothing;
insert into public.course_offerings (program_id, academic_year, semester, year_level, course_code, course_description, units, source_document)
select id, '2025-2026', '2nd Semester', '3rd Year', 'PC 3', 'Managing Information and Technology', 3, 'LIST OF COURSES FOR 2ND SEM AY 25-26.xlsx'
from public.programs where code = 'BSAIS'
on conflict on constraint course_offerings_unique_entry do nothing;
insert into public.course_offerings (program_id, academic_year, semester, year_level, course_code, course_description, units, source_document)
select id, '2025-2026', '2nd Semester', '3rd Year', 'PC 4', 'Information System Operations and Maintenance', 3, 'LIST OF COURSES FOR 2ND SEM AY 25-26.xlsx'
from public.programs where code = 'BSAIS'
on conflict on constraint course_offerings_unique_entry do nothing;
insert into public.course_offerings (program_id, academic_year, semester, year_level, course_code, course_description, units, source_document)
select id, '2025-2026', '2nd Semester', '3rd Year', 'PC 5', 'Information Security and Management', 3, 'LIST OF COURSES FOR 2ND SEM AY 25-26.xlsx'
from public.programs where code = 'BSAIS'
on conflict on constraint course_offerings_unique_entry do nothing;
insert into public.course_offerings (program_id, academic_year, semester, year_level, course_code, course_description, units, source_document)
select id, '2025-2026', '2nd Semester', '3rd Year', 'AE 22', 'Statistical Analysis with Software Application', 3, 'LIST OF COURSES FOR 2ND SEM AY 25-26.xlsx'
from public.programs where code = 'BSAIS'
on conflict on constraint course_offerings_unique_entry do nothing;
insert into public.course_offerings (program_id, academic_year, semester, year_level, course_code, course_description, units, source_document)
select id, '2025-2026', '2nd Semester', '3rd Year', 'AE 23', 'International Business and Trade', 3, 'LIST OF COURSES FOR 2ND SEM AY 25-26.xlsx'
from public.programs where code = 'BSAIS'
on conflict on constraint course_offerings_unique_entry do nothing;
insert into public.course_offerings (program_id, academic_year, semester, year_level, course_code, course_description, units, source_document)
select id, '2025-2026', '2nd Semester', '3rd Year', 'AE 24', 'Governance, Business Ethics. Risk Managemetn', 3, 'LIST OF COURSES FOR 2ND SEM AY 25-26.xlsx'
from public.programs where code = 'BSAIS'
on conflict on constraint course_offerings_unique_entry do nothing;
insert into public.course_offerings (program_id, academic_year, semester, year_level, course_code, course_description, units, source_document)
select id, '2025-2026', '2nd Semester', '3rd Year', 'PC Elec 1', 'Financial Modelling', 3, 'LIST OF COURSES FOR 2ND SEM AY 25-26.xlsx'
from public.programs where code = 'BSAIS'
on conflict on constraint course_offerings_unique_entry do nothing;
insert into public.course_offerings (program_id, academic_year, semester, year_level, course_code, course_description, units, source_document)
select id, '2025-2026', '2nd Semester', '3rd Year', 'GE 9', 'Art Appreciation', 3, 'LIST OF COURSES FOR 2ND SEM AY 25-26.xlsx'
from public.programs where code = 'BSAIS'
on conflict on constraint course_offerings_unique_entry do nothing;
insert into public.course_offerings (program_id, academic_year, semester, year_level, course_code, course_description, units, source_document)
select id, '2025-2026', '2nd Semester', '1st Year', 'GE 4', 'Purposive Communication', 3, 'LIST OF COURSES FOR 2ND SEM AY 25-26.xlsx'
from public.programs where code = 'BSMA'
on conflict on constraint course_offerings_unique_entry do nothing;
insert into public.course_offerings (program_id, academic_year, semester, year_level, course_code, course_description, units, source_document)
select id, '2025-2026', '2nd Semester', '1st Year', 'GE 5', 'Science, Technology and Society', 3, 'LIST OF COURSES FOR 2ND SEM AY 25-26.xlsx'
from public.programs where code = 'BSMA'
on conflict on constraint course_offerings_unique_entry do nothing;
insert into public.course_offerings (program_id, academic_year, semester, year_level, course_code, course_description, units, source_document)
select id, '2025-2026', '2nd Semester', '1st Year', 'AE 3', 'Laws and Obligations and Contacts', 3, 'LIST OF COURSES FOR 2ND SEM AY 25-26.xlsx'
from public.programs where code = 'BSMA'
on conflict on constraint course_offerings_unique_entry do nothing;
insert into public.course_offerings (program_id, academic_year, semester, year_level, course_code, course_description, units, source_document)
select id, '2025-2026', '2nd Semester', '1st Year', 'AE 4', 'Conceptual Frameworks and Accounting Standards', 3, 'LIST OF COURSES FOR 2ND SEM AY 25-26.xlsx'
from public.programs where code = 'BSMA'
on conflict on constraint course_offerings_unique_entry do nothing;
insert into public.course_offerings (program_id, academic_year, semester, year_level, course_code, course_description, units, source_document)
select id, '2025-2026', '2nd Semester', '1st Year', 'CBME 1', 'Operations Management and TQM', 3, 'LIST OF COURSES FOR 2ND SEM AY 25-26.xlsx'
from public.programs where code = 'BSMA'
on conflict on constraint course_offerings_unique_entry do nothing;
insert into public.course_offerings (program_id, academic_year, semester, year_level, course_code, course_description, units, source_document)
select id, '2025-2026', '2nd Semester', '1st Year', 'PE 2', 'Fitness Exercise for Specific Sports', 2, 'LIST OF COURSES FOR 2ND SEM AY 25-26.xlsx'
from public.programs where code = 'BSMA'
on conflict on constraint course_offerings_unique_entry do nothing;
insert into public.course_offerings (program_id, academic_year, semester, year_level, course_code, course_description, units, source_document)
select id, '2025-2026', '2nd Semester', '1st Year', 'NSTP 1', 'National Srvice Training Program', 3, 'LIST OF COURSES FOR 2ND SEM AY 25-26.xlsx'
from public.programs where code = 'BSMA'
on conflict on constraint course_offerings_unique_entry do nothing;
insert into public.course_offerings (program_id, academic_year, semester, year_level, course_code, course_description, units, source_document)
select id, '2025-2026', '2nd Semester', '2nd Year', 'GE Elec1', 'Business Logic', 3, 'LIST OF COURSES FOR 2ND SEM AY 25-26.xlsx'
from public.programs where code = 'BSMA'
on conflict on constraint course_offerings_unique_entry do nothing;
insert into public.course_offerings (program_id, academic_year, semester, year_level, course_code, course_description, units, source_document)
select id, '2025-2026', '2nd Semester', '2nd Year', 'AE 10', 'Management Science', 3, 'LIST OF COURSES FOR 2ND SEM AY 25-26.xlsx'
from public.programs where code = 'BSMA'
on conflict on constraint course_offerings_unique_entry do nothing;
insert into public.course_offerings (program_id, academic_year, semester, year_level, course_code, course_description, units, source_document)
select id, '2025-2026', '2nd Semester', '2nd Year', 'AE 11', 'Regulatory Framework and Legal Issues in Business', 3, 'LIST OF COURSES FOR 2ND SEM AY 25-26.xlsx'
from public.programs where code = 'BSMA'
on conflict on constraint course_offerings_unique_entry do nothing;
insert into public.course_offerings (program_id, academic_year, semester, year_level, course_code, course_description, units, source_document)
select id, '2025-2026', '2nd Semester', '2nd Year', 'AE 12', 'Intemediate Accounting 2', 3, 'LIST OF COURSES FOR 2ND SEM AY 25-26.xlsx'
from public.programs where code = 'BSMA'
on conflict on constraint course_offerings_unique_entry do nothing;
insert into public.course_offerings (program_id, academic_year, semester, year_level, course_code, course_description, units, source_document)
select id, '2025-2026', '2nd Semester', '2nd Year', 'AE 13', 'Business Tax', 3, 'LIST OF COURSES FOR 2ND SEM AY 25-26.xlsx'
from public.programs where code = 'BSMA'
on conflict on constraint course_offerings_unique_entry do nothing;
insert into public.course_offerings (program_id, academic_year, semester, year_level, course_code, course_description, units, source_document)
select id, '2025-2026', '2nd Semester', '2nd Year', 'AE 14', 'Financial Markets', 3, 'LIST OF COURSES FOR 2ND SEM AY 25-26.xlsx'
from public.programs where code = 'BSMA'
on conflict on constraint course_offerings_unique_entry do nothing;
insert into public.course_offerings (program_id, academic_year, semester, year_level, course_code, course_description, units, source_document)
select id, '2025-2026', '2nd Semester', '2nd Year', 'AE 15', 'Economic Development', 3, 'LIST OF COURSES FOR 2ND SEM AY 25-26.xlsx'
from public.programs where code = 'BSMA'
on conflict on constraint course_offerings_unique_entry do nothing;
insert into public.course_offerings (program_id, academic_year, semester, year_level, course_code, course_description, units, source_document)
select id, '2025-2026', '2nd Semester', '2nd Year', 'PE 4', 'Phusical Activities Towards Health and Fitness Sports', 2, 'LIST OF COURSES FOR 2ND SEM AY 25-26.xlsx'
from public.programs where code = 'BSMA'
on conflict on constraint course_offerings_unique_entry do nothing;
insert into public.course_offerings (program_id, academic_year, semester, year_level, course_code, course_description, units, source_document)
select id, '2025-2026', '2nd Semester', '2nd Year', 'Ge Elec2', 'Social Science and Philisophy', 3, 'LIST OF COURSES FOR 2ND SEM AY 25-26.xlsx'
from public.programs where code = 'BSMA'
on conflict on constraint course_offerings_unique_entry do nothing;
insert into public.course_offerings (program_id, academic_year, semester, year_level, course_code, course_description, units, source_document)
select id, '2025-2026', '2nd Semester', '3rd Year', 'AE 20', 'Statistical Analysis with Software Application', 3, 'LIST OF COURSES FOR 2ND SEM AY 25-26.xlsx'
from public.programs where code = 'BSMA'
on conflict on constraint course_offerings_unique_entry do nothing;
insert into public.course_offerings (program_id, academic_year, semester, year_level, course_code, course_description, units, source_document)
select id, '2025-2026', '2nd Semester', '3rd Year', 'AE 21', 'International Business and Trade', 3, 'LIST OF COURSES FOR 2ND SEM AY 25-26.xlsx'
from public.programs where code = 'BSMA'
on conflict on constraint course_offerings_unique_entry do nothing;
insert into public.course_offerings (program_id, academic_year, semester, year_level, course_code, course_description, units, source_document)
select id, '2025-2026', '2nd Semester', '3rd Year', 'AE 22', 'Governance, Business Ethics, Risk Management', 3, 'LIST OF COURSES FOR 2ND SEM AY 25-26.xlsx'
from public.programs where code = 'BSMA'
on conflict on constraint course_offerings_unique_entry do nothing;
insert into public.course_offerings (program_id, academic_year, semester, year_level, course_code, course_description, units, source_document)
select id, '2025-2026', '2nd Semester', '3rd Year', 'AE 23', 'Accounting Information System', 3, 'LIST OF COURSES FOR 2ND SEM AY 25-26.xlsx'
from public.programs where code = 'BSMA'
on conflict on constraint course_offerings_unique_entry do nothing;
insert into public.course_offerings (program_id, academic_year, semester, year_level, course_code, course_description, units, source_document)
select id, '2025-2026', '2nd Semester', '3rd Year', 'Ae 24', 'Strategic Business Analysis', 3, 'LIST OF COURSES FOR 2ND SEM AY 25-26.xlsx'
from public.programs where code = 'BSMA'
on conflict on constraint course_offerings_unique_entry do nothing;
insert into public.course_offerings (program_id, academic_year, semester, year_level, course_code, course_description, units, source_document)
select id, '2025-2026', '2nd Semester', '3rd Year', 'PC 4', 'Project Management', 3, 'LIST OF COURSES FOR 2ND SEM AY 25-26.xlsx'
from public.programs where code = 'BSMA'
on conflict on constraint course_offerings_unique_entry do nothing;
insert into public.course_offerings (program_id, academic_year, semester, year_level, course_code, course_description, units, source_document)
select id, '2025-2026', '2nd Semester', '3rd Year', 'PC 5', 'Strategic Tax Management', 3, 'LIST OF COURSES FOR 2ND SEM AY 25-26.xlsx'
from public.programs where code = 'BSMA'
on conflict on constraint course_offerings_unique_entry do nothing;
insert into public.course_offerings (program_id, academic_year, semester, year_level, course_code, course_description, units, source_document)
select id, '2025-2026', '2nd Semester', '3rd Year', 'GE 9', 'Art Appreciation', 3, 'LIST OF COURSES FOR 2ND SEM AY 25-26.xlsx'
from public.programs where code = 'BSMA'
on conflict on constraint course_offerings_unique_entry do nothing;
insert into public.course_offerings (program_id, academic_year, semester, year_level, course_code, course_description, units, source_document)
select id, '2025-2026', '2nd Semester', '1st Year', 'SOC SCI 1', 'Readings in the Philippine History', 3, 'LIST OF COURSES FOR 2ND SEM AY 25-26.xlsx'
from public.programs where code = 'CRIM'
on conflict on constraint course_offerings_unique_entry do nothing;
insert into public.course_offerings (program_id, academic_year, semester, year_level, course_code, course_description, units, source_document)
select id, '2025-2026', '2nd Semester', '1st Year', 'SOC SCI 2', 'Science, Technology and Society', 3, 'LIST OF COURSES FOR 2ND SEM AY 25-26.xlsx'
from public.programs where code = 'CRIM'
on conflict on constraint course_offerings_unique_entry do nothing;
insert into public.course_offerings (program_id, academic_year, semester, year_level, course_code, course_description, units, source_document)
select id, '2025-2026', '2nd Semester', '1st Year', 'AdGE', 'General Chemistry (Organic)', 3, 'LIST OF COURSES FOR 2ND SEM AY 25-26.xlsx'
from public.programs where code = 'CRIM'
on conflict on constraint course_offerings_unique_entry do nothing;
insert into public.course_offerings (program_id, academic_year, semester, year_level, course_code, course_description, units, source_document)
select id, '2025-2026', '2nd Semester', '1st Year', 'Criminology 2', 'Theoriues of Crime Causation', 3, 'LIST OF COURSES FOR 2ND SEM AY 25-26.xlsx'
from public.programs where code = 'CRIM'
on conflict on constraint course_offerings_unique_entry do nothing;
insert into public.course_offerings (program_id, academic_year, semester, year_level, course_code, course_description, units, source_document)
select id, '2025-2026', '2nd Semester', '1st Year', 'CDI 2', 'Specialized Crime Invesetigation 1 with Legal Medicine', 3, 'LIST OF COURSES FOR 2ND SEM AY 25-26.xlsx'
from public.programs where code = 'CRIM'
on conflict on constraint course_offerings_unique_entry do nothing;
insert into public.course_offerings (program_id, academic_year, semester, year_level, course_code, course_description, units, source_document)
select id, '2025-2026', '2nd Semester', '1st Year', 'CLJ 2', 'Human Rights Education', 3, 'LIST OF COURSES FOR 2ND SEM AY 25-26.xlsx'
from public.programs where code = 'CRIM'
on conflict on constraint course_offerings_unique_entry do nothing;
insert into public.course_offerings (program_id, academic_year, semester, year_level, course_code, course_description, units, source_document)
select id, '2025-2026', '2nd Semester', '1st Year', 'PE 2', 'Arnis and Disarming Technique', 2, 'LIST OF COURSES FOR 2ND SEM AY 25-26.xlsx'
from public.programs where code = 'CRIM'
on conflict on constraint course_offerings_unique_entry do nothing;
insert into public.course_offerings (program_id, academic_year, semester, year_level, course_code, course_description, units, source_document)
select id, '2025-2026', '2nd Semester', '1st Year', 'ROTC 2', 'Reserve Officers Training Corps', 3, 'LIST OF COURSES FOR 2ND SEM AY 25-26.xlsx'
from public.programs where code = 'CRIM'
on conflict on constraint course_offerings_unique_entry do nothing;
insert into public.course_offerings (program_id, academic_year, semester, year_level, course_code, course_description, units, source_document)
select id, '2025-2026', '2nd Semester', '2nd Year', 'GE ELEC 3', 'Great Books', 3, 'LIST OF COURSES FOR 2ND SEM AY 25-26.xlsx'
from public.programs where code = 'CRIM'
on conflict on constraint course_offerings_unique_entry do nothing;
insert into public.course_offerings (program_id, academic_year, semester, year_level, course_code, course_description, units, source_document)
select id, '2025-2026', '2nd Semester', '2nd Year', 'LEA 2', 'Comparative Models in Policing', 3, 'LIST OF COURSES FOR 2ND SEM AY 25-26.xlsx'
from public.programs where code = 'CRIM'
on conflict on constraint course_offerings_unique_entry do nothing;
insert into public.course_offerings (program_id, academic_year, semester, year_level, course_code, course_description, units, source_document)
select id, '2025-2026', '2nd Semester', '2nd Year', 'CDI 3', 'Specialized Crime Investigation 2 with Simulation on Interrogation and Interview', 3, 'LIST OF COURSES FOR 2ND SEM AY 25-26.xlsx'
from public.programs where code = 'CRIM'
on conflict on constraint course_offerings_unique_entry do nothing;
insert into public.course_offerings (program_id, academic_year, semester, year_level, course_code, course_description, units, source_document)
select id, '2025-2026', '2nd Semester', '2nd Year', 'CLJ 4', 'Criminal Law (Book 2)', 4, 'LIST OF COURSES FOR 2ND SEM AY 25-26.xlsx'
from public.programs where code = 'CRIM'
on conflict on constraint course_offerings_unique_entry do nothing;
insert into public.course_offerings (program_id, academic_year, semester, year_level, course_code, course_description, units, source_document)
select id, '2025-2026', '2nd Semester', '2nd Year', 'Criminology 4', 'Professional Conduct and Ethical Standards', 3, 'LIST OF COURSES FOR 2ND SEM AY 25-26.xlsx'
from public.programs where code = 'CRIM'
on conflict on constraint course_offerings_unique_entry do nothing;
insert into public.course_offerings (program_id, academic_year, semester, year_level, course_code, course_description, units, source_document)
select id, '2025-2026', '2nd Semester', '2nd Year', 'CA 1', 'Institutional Corrections', 3, 'LIST OF COURSES FOR 2ND SEM AY 25-26.xlsx'
from public.programs where code = 'CRIM'
on conflict on constraint course_offerings_unique_entry do nothing;
insert into public.course_offerings (program_id, academic_year, semester, year_level, course_code, course_description, units, source_document)
select id, '2025-2026', '2nd Semester', '2nd Year', 'Forensic 1', 'Forensic Photography', 3, 'LIST OF COURSES FOR 2ND SEM AY 25-26.xlsx'
from public.programs where code = 'CRIM'
on conflict on constraint course_offerings_unique_entry do nothing;
insert into public.course_offerings (program_id, academic_year, semester, year_level, course_code, course_description, units, source_document)
select id, '2025-2026', '2nd Semester', '2nd Year', 'PE 4', 'Fundamentals of Markmanship', 2, 'LIST OF COURSES FOR 2ND SEM AY 25-26.xlsx'
from public.programs where code = 'CRIM'
on conflict on constraint course_offerings_unique_entry do nothing;
