create table if not exists public.official_student_records (
  id uuid primary key default gen_random_uuid(),
  student_id_number text,
  first_name text not null,
  last_name text not null,
  email text not null,
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
  birthdate date,
  gender_sex text,
  address text,
  contact_number text,
  guardian text,
  emergency_contact_person text,
  nationality text,
  civil_status text,
  previous_school_information text,
  admission_status text,
  enrollment_status text not null default 'NOT ENROLLED' check (enrollment_status in ('NOT ENROLLED', 'PENDING', 'ENROLLED')),
  created_by uuid references public.profiles(id),
  updated_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists official_student_records_student_id_unique
on public.official_student_records (student_id_number)
where student_id_number is not null;

create unique index if not exists official_student_records_email_unique
on public.official_student_records (lower(email));

drop trigger if exists set_official_student_records_updated_at on public.official_student_records;

create trigger set_official_student_records_updated_at
before update on public.official_student_records
for each row execute function public.set_updated_at();

alter table public.official_student_records enable row level security;

create policy "official_student_records_select_admin"
on public.official_student_records for select
to authenticated
using (private.is_admin());

create policy "official_student_records_insert_admin"
on public.official_student_records for insert
to authenticated
with check (private.is_admin());

create policy "official_student_records_update_admin"
on public.official_student_records for update
to authenticated
using (private.is_admin())
with check (private.is_admin());
