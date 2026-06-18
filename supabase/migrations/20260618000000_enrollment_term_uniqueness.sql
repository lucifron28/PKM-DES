drop index if exists public.enrollments_student_active_term_unique;

create unique index if not exists enrollments_student_term_unique
on public.enrollments (student_id, academic_year, semester);
