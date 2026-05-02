create schema if not exists private;

grant usage on schema private to authenticated;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function private.is_admin()
returns boolean
language sql
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'admin'
      and account_status = 'ACTIVE'
  );
$$;

revoke all on function private.is_admin() from public;
grant execute on function private.is_admin() to authenticated;

alter policy "profiles_select_own_or_admin"
on public.profiles
using (id = auth.uid() or private.is_admin());

alter policy "profiles_update_admin"
on public.profiles
using (private.is_admin())
with check (private.is_admin());

alter policy "programs_manage_admin"
on public.programs
using (private.is_admin())
with check (private.is_admin());

alter policy "students_select_own_or_admin"
on public.students
using (profile_id = auth.uid() or private.is_admin());

alter policy "students_update_admin"
on public.students
using (private.is_admin())
with check (private.is_admin());

alter policy "subjects_manage_admin"
on public.subjects
using (private.is_admin())
with check (private.is_admin());

alter policy "enrollments_select_own_or_admin"
on public.enrollments
using (
  private.is_admin()
  or exists (
    select 1
    from public.students
    where students.id = enrollments.student_id
      and students.profile_id = auth.uid()
  )
);

alter policy "enrollments_update_admin"
on public.enrollments
using (private.is_admin())
with check (private.is_admin());

alter policy "enrollment_subjects_select_own_or_admin"
on public.enrollment_subjects
using (
  private.is_admin()
  or exists (
    select 1
    from public.enrollments
    join public.students on students.id = enrollments.student_id
    where enrollments.id = enrollment_subjects.enrollment_id
      and students.profile_id = auth.uid()
  )
);

alter policy "enrollment_subjects_manage_admin"
on public.enrollment_subjects
using (private.is_admin())
with check (private.is_admin());

alter policy "grades_select_own_or_admin"
on public.grades
using (
  private.is_admin()
  or exists (
    select 1
    from public.students
    where students.id = grades.student_id
      and students.profile_id = auth.uid()
  )
);

alter policy "grades_manage_admin"
on public.grades
using (private.is_admin())
with check (private.is_admin());

alter policy "class_schedules_manage_admin"
on public.class_schedules
using (private.is_admin())
with check (private.is_admin());

alter policy "balances_select_own_or_admin"
on public.balances
using (
  private.is_admin()
  or exists (
    select 1
    from public.students
    where students.id = balances.student_id
      and students.profile_id = auth.uid()
  )
);

alter policy "balances_manage_admin"
on public.balances
using (private.is_admin())
with check (private.is_admin());

alter policy "audit_logs_select_admin"
on public.audit_logs
using (private.is_admin());

alter policy "audit_logs_insert_admin"
on public.audit_logs
with check (private.is_admin());

drop function if exists public.is_admin();
drop function if exists public.mark_own_enrollment_pending(uuid);

create or replace function public.mark_student_pending_after_enrollment()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.status = 'PENDING' then
    update public.students
    set enrollment_status = 'PENDING'
    where id = new.student_id;
  end if;

  return new;
end;
$$;

revoke all on function public.mark_student_pending_after_enrollment() from public;
revoke execute on function public.mark_student_pending_after_enrollment() from anon;
revoke execute on function public.mark_student_pending_after_enrollment() from authenticated;

drop trigger if exists mark_student_pending_on_enrollment on public.enrollments;

create trigger mark_student_pending_on_enrollment
after insert on public.enrollments
for each row execute function public.mark_student_pending_after_enrollment();
