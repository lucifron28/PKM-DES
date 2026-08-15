-- Students need the linked official Gender/Sex value to evaluate their own
-- current-term Health Record Update requirement. This exposes only the row
-- linked to the authenticated student's own account; administrative writes
-- remain restricted to admin policies.

drop policy if exists "official_student_records_select_own" on public.official_student_records;
create policy "official_student_records_select_own"
on public.official_student_records for select
to authenticated
using (
  exists (
    select 1
    from public.students s
    where s.official_record_id = official_student_records.id
      and s.profile_id = auth.uid()
  )
);
