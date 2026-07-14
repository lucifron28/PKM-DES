-- Normalize claim identifiers and prevent duplicate student-account identities.
-- Existing normalized duplicates must be resolved manually before this migration can continue.

update public.profiles
set email = lower(btrim(email))
where email is distinct from lower(btrim(email));

update public.students
set student_id_number = nullif(btrim(student_id_number), '')
where student_id_number is distinct from nullif(btrim(student_id_number), '');

update public.official_student_records
set email = lower(btrim(email))
where email is distinct from lower(btrim(email));

update public.official_student_records
set student_id_number = nullif(btrim(student_id_number), '')
where student_id_number is distinct from nullif(btrim(student_id_number), '');

do $$
begin
  if exists (
    select 1
    from public.profiles
    group by lower(email)
    having count(*) > 1
  ) then
    raise exception 'Cannot add profiles email uniqueness: normalized duplicate profile emails exist.';
  end if;

  if exists (
    select 1
    from public.students
    where student_id_number is not null
    group by student_id_number
    having count(*) > 1
  ) then
    raise exception 'Cannot add student ID uniqueness: duplicate normalized student IDs exist.';
  end if;

  if exists (
    select 1
    from public.official_student_records
    group by lower(email)
    having count(*) > 1
  ) then
    raise exception 'Cannot preserve official-record email uniqueness: normalized duplicate emails exist.';
  end if;

  if exists (
    select 1
    from public.official_student_records
    where student_id_number is not null
    group by student_id_number
    having count(*) > 1
  ) then
    raise exception 'Cannot preserve official-record Student ID uniqueness: duplicate normalized Student IDs exist.';
  end if;
end;
$$;

create unique index if not exists profiles_email_unique
on public.profiles (lower(email));

create unique index if not exists students_student_id_number_unique
on public.students (student_id_number)
where student_id_number is not null;
