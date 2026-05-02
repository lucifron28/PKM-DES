create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('student', 'admin')),
  first_name text not null,
  last_name text not null,
  email text not null,
  account_status text not null default 'PENDING' check (account_status in ('ACTIVE', 'PENDING')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.programs (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  code text,
  created_at timestamptz not null default now(),
  unique (code)
);

create table if not exists public.students (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null unique references public.profiles(id) on delete cascade,
  student_id_number text,
  program_id uuid not null references public.programs(id),
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
  enrollment_status text not null default 'NOT ENROLLED' check (
    enrollment_status in ('NOT ENROLLED', 'PENDING', 'ENROLLED')
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.subjects (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.programs(id) on delete cascade,
  course_code text not null,
  course_description text not null,
  units integer not null check (units > 0),
  year_level text not null check (year_level in ('1st Year', '2nd Year', '3rd Year', '4th Year')),
  semester text not null check (semester in ('1st Semester', '2nd Semester')),
  created_at timestamptz not null default now(),
  unique (program_id, course_code, year_level, semester)
);

create table if not exists public.enrollments (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  program_id uuid not null references public.programs(id),
  year_level text not null check (year_level in ('1st Year', '2nd Year', '3rd Year', '4th Year')),
  academic_year text not null,
  semester text not null check (semester in ('1st Semester', '2nd Semester')),
  status text not null default 'PENDING' check (status in ('PENDING', 'APPROVED', 'REJECTED')),
  submitted_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references public.profiles(id),
  remarks text
);

create table if not exists public.enrollment_subjects (
  id uuid primary key default gen_random_uuid(),
  enrollment_id uuid not null references public.enrollments(id) on delete cascade,
  subject_id uuid not null references public.subjects(id) on delete cascade,
  unique (enrollment_id, subject_id)
);

create table if not exists public.grades (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  subject_id uuid not null references public.subjects(id) on delete cascade,
  grade text,
  remarks text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (student_id, subject_id)
);

create table if not exists public.class_schedules (
  id uuid primary key default gen_random_uuid(),
  subject_id uuid not null references public.subjects(id) on delete cascade,
  day text,
  time text,
  room text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.balances (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  fee_description text not null,
  amount numeric not null default 0,
  payment_status text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_profile_id uuid references public.profiles(id),
  action text not null,
  target_table text not null,
  target_id uuid,
  created_at timestamptz not null default now()
);

create trigger set_profiles_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create trigger set_students_updated_at
before update on public.students
for each row execute function public.set_updated_at();

create trigger set_grades_updated_at
before update on public.grades
for each row execute function public.set_updated_at();

create trigger set_class_schedules_updated_at
before update on public.class_schedules
for each row execute function public.set_updated_at();

create trigger set_balances_updated_at
before update on public.balances
for each row execute function public.set_updated_at();

create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'admin'
      and account_status = 'ACTIVE'
  );
$$;

create or replace function public.mark_own_enrollment_pending(target_student_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.students
  set enrollment_status = 'PENDING'
  where id = target_student_id
    and profile_id = auth.uid();
end;
$$;

grant execute on function public.mark_own_enrollment_pending(uuid) to authenticated;

alter table public.profiles enable row level security;
alter table public.programs enable row level security;
alter table public.students enable row level security;
alter table public.subjects enable row level security;
alter table public.enrollments enable row level security;
alter table public.enrollment_subjects enable row level security;
alter table public.grades enable row level security;
alter table public.class_schedules enable row level security;
alter table public.balances enable row level security;
alter table public.audit_logs enable row level security;

create policy "profiles_select_own_or_admin"
on public.profiles for select
to authenticated
using (id = auth.uid() or public.is_admin());

create policy "profiles_insert_own"
on public.profiles for insert
to authenticated
with check (id = auth.uid());

create policy "profiles_update_admin"
on public.profiles for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "programs_select_authenticated"
on public.programs for select
to authenticated
using (true);

create policy "programs_manage_admin"
on public.programs for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "students_select_own_or_admin"
on public.students for select
to authenticated
using (profile_id = auth.uid() or public.is_admin());

create policy "students_insert_own"
on public.students for insert
to authenticated
with check (profile_id = auth.uid());

create policy "students_update_admin"
on public.students for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "subjects_select_authenticated"
on public.subjects for select
to authenticated
using (true);

create policy "subjects_manage_admin"
on public.subjects for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "enrollments_select_own_or_admin"
on public.enrollments for select
to authenticated
using (
  public.is_admin()
  or exists (
    select 1
    from public.students
    where students.id = enrollments.student_id
      and students.profile_id = auth.uid()
  )
);

create policy "enrollments_insert_own"
on public.enrollments for insert
to authenticated
with check (
  exists (
    select 1
    from public.students
    where students.id = enrollments.student_id
      and students.profile_id = auth.uid()
  )
);

create policy "enrollments_update_admin"
on public.enrollments for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "enrollment_subjects_select_own_or_admin"
on public.enrollment_subjects for select
to authenticated
using (
  public.is_admin()
  or exists (
    select 1
    from public.enrollments
    join public.students on students.id = enrollments.student_id
    where enrollments.id = enrollment_subjects.enrollment_id
      and students.profile_id = auth.uid()
  )
);

create policy "enrollment_subjects_manage_admin"
on public.enrollment_subjects for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "grades_select_own_or_admin"
on public.grades for select
to authenticated
using (
  public.is_admin()
  or exists (
    select 1
    from public.students
    where students.id = grades.student_id
      and students.profile_id = auth.uid()
  )
);

create policy "grades_manage_admin"
on public.grades for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "class_schedules_select_authenticated"
on public.class_schedules for select
to authenticated
using (true);

create policy "class_schedules_manage_admin"
on public.class_schedules for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "balances_select_own_or_admin"
on public.balances for select
to authenticated
using (
  public.is_admin()
  or exists (
    select 1
    from public.students
    where students.id = balances.student_id
      and students.profile_id = auth.uid()
  )
);

create policy "balances_manage_admin"
on public.balances for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "audit_logs_select_admin"
on public.audit_logs for select
to authenticated
using (public.is_admin());

create policy "audit_logs_insert_admin"
on public.audit_logs for insert
to authenticated
with check (public.is_admin());
