create unique index if not exists enrollments_student_active_term_unique
on public.enrollments (student_id, academic_year, semester)
where status in ('PENDING', 'APPROVED');

create policy "enrollment_subjects_insert_own_pending_matching_subject"
on public.enrollment_subjects for insert
to authenticated
with check (
  exists (
    select 1
    from public.enrollments
    join public.students on students.id = enrollments.student_id
    join public.subjects on subjects.id = enrollment_subjects.subject_id
    where enrollments.id = enrollment_subjects.enrollment_id
      and students.profile_id = auth.uid()
      and enrollments.status = 'PENDING'
      and subjects.program_id = enrollments.program_id
      and subjects.year_level = enrollments.year_level
      and subjects.semester = enrollments.semester
  )
);

create policy "enrollments_delete_own_pending_without_subjects"
on public.enrollments for delete
to authenticated
using (
  status = 'PENDING'
  and exists (
    select 1
    from public.students
    where students.id = enrollments.student_id
      and students.profile_id = auth.uid()
  )
  and not exists (
    select 1
    from public.enrollment_subjects
    where enrollment_subjects.enrollment_id = enrollments.id
  )
);

create or replace function public.refresh_student_status_after_enrollment_delete()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  update public.students
  set enrollment_status = case
    when exists (
      select 1
      from public.enrollments
      where enrollments.student_id = old.student_id
        and enrollments.status = 'APPROVED'
    ) then 'ENROLLED'
    when exists (
      select 1
      from public.enrollments
      where enrollments.student_id = old.student_id
        and enrollments.status = 'PENDING'
    ) then 'PENDING'
    else 'NOT ENROLLED'
  end
  where students.id = old.student_id;

  return old;
end;
$$;

revoke all on function public.refresh_student_status_after_enrollment_delete() from public;
revoke execute on function public.refresh_student_status_after_enrollment_delete() from anon;
revoke execute on function public.refresh_student_status_after_enrollment_delete() from authenticated;

drop trigger if exists refresh_student_status_after_enrollment_delete on public.enrollments;

create trigger refresh_student_status_after_enrollment_delete
after delete on public.enrollments
for each row execute function public.refresh_student_status_after_enrollment_delete();
