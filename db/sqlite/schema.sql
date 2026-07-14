pragma foreign_keys = on;

create table if not exists programs (
  id text primary key,
  name text not null,
  code text unique,
  created_at text not null default current_timestamp
);

create table if not exists profiles (
  id text primary key,
  role text not null check (role in ('student', 'admin')),
  first_name text not null,
  last_name text not null,
  email text not null unique,
  account_status text not null default 'PENDING' check (account_status in ('ACTIVE', 'PENDING')),
  created_at text not null default current_timestamp,
  updated_at text not null default current_timestamp
);

create table if not exists students (
  id text primary key,
  profile_id text not null unique references profiles(id) on delete cascade,
  student_id_number text,
  program_id text not null references programs(id),
  year_level text not null check (year_level in ('1st Year', '2nd Year', '3rd Year', '4th Year')),
  student_type text not null check (
    student_type in (
      'Incoming 1st Year Student',
      'Transferee',
      'Old Student',
      'Continuing Student',
      'Regular Student',
      'Irregular Student'
    )
  ),
  enrollment_status text not null default 'NOT ENROLLED' check (enrollment_status in ('NOT ENROLLED', 'PENDING', 'ENROLLED')),
  created_at text not null default current_timestamp,
  updated_at text not null default current_timestamp
);

create unique index if not exists profiles_email_normalized_unique
on profiles (lower(email));

create unique index if not exists students_student_id_number_unique
on students (student_id_number)
where student_id_number is not null;

create table if not exists subjects (
  id text primary key,
  program_id text not null references programs(id) on delete cascade,
  course_code text not null,
  course_description text not null,
  units integer not null,
  year_level text not null check (year_level in ('1st Year', '2nd Year', '3rd Year', '4th Year')),
  semester text not null check (semester in ('1st Semester', '2nd Semester')),
  created_at text not null default current_timestamp,
  unique (program_id, course_code, year_level, semester)
);

create table if not exists official_student_records (
  id text primary key,
  student_id_number text unique,
  first_name text not null,
  last_name text not null,
  email text not null unique,
  program_id text not null references programs(id),
  year_level text not null check (year_level in ('1st Year', '2nd Year', '3rd Year', '4th Year')),
  student_type text not null,
  birthdate text,
  gender_sex text,
  address text,
  contact_number text,
  guardian text,
  emergency_contact_person text,
  nationality text,
  civil_status text,
  previous_school_information text,
  admission_status text,
  enrollment_status text not null default 'NOT ENROLLED',
  created_by text references profiles(id),
  updated_by text references profiles(id),
  created_at text not null default current_timestamp,
  updated_at text not null default current_timestamp
);

create unique index if not exists official_student_records_email_normalized_unique
on official_student_records (lower(email));

create table if not exists enrollments (
  id text primary key,
  student_id text not null references students(id) on delete cascade,
  program_id text not null references programs(id),
  year_level text not null,
  academic_year text not null,
  semester text not null,
  status text not null default 'PENDING' check (status in ('PENDING', 'APPROVED', 'REJECTED')),
  submitted_at text not null default current_timestamp,
  reviewed_at text,
  reviewed_by text references profiles(id),
  remarks text
);

drop index if exists enrollments_student_active_term_unique;

create unique index if not exists enrollments_student_term_unique
on enrollments (student_id, academic_year, semester);

create table if not exists enrollment_subjects (
  id text primary key,
  enrollment_id text not null references enrollments(id) on delete cascade,
  subject_id text not null references subjects(id),
  unique (enrollment_id, subject_id)
);

create table if not exists grades (
  id text primary key,
  student_id text not null references students(id) on delete cascade,
  subject_id text not null references subjects(id),
  grade text,
  remarks text,
  created_at text not null default current_timestamp,
  updated_at text not null default current_timestamp,
  unique (student_id, subject_id)
);

create table if not exists class_schedules (
  id text primary key,
  subject_id text not null references subjects(id) on delete cascade,
  day text,
  time text,
  room text,
  created_at text not null default current_timestamp,
  updated_at text not null default current_timestamp
);

create table if not exists balances (
  id text primary key,
  student_id text not null references students(id) on delete cascade,
  fee_description text not null,
  amount numeric not null default 0,
  payment_status text not null,
  created_at text not null default current_timestamp,
  updated_at text not null default current_timestamp
);

create table if not exists audit_logs (
  id text primary key,
  actor_profile_id text references profiles(id),
  action text not null,
  target_table text not null,
  target_id text,
  created_at text not null default current_timestamp
);
