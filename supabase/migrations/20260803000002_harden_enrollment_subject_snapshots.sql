-- Enrollment-subject attachments are immutable snapshots.
-- Students may read their own attachments, admins may manage them through the
-- existing admin predicate, and only the trusted enrollment RPC may create
-- offering-backed rows for a student submission.

alter table public.enrollment_subjects
  drop constraint if exists enrollment_subjects_subject_id_fkey;

alter table public.enrollment_subjects
  add constraint enrollment_subjects_subject_id_fkey
  foreign key (subject_id)
  references public.subjects(id)
  on delete restrict;

drop policy if exists "enrollment_subjects_manage_admin" on public.enrollment_subjects;
drop policy if exists "enrollment_subjects_insert_own_pending_matching_subject" on public.enrollment_subjects;

create policy "enrollment_subjects_manage_admin"
  on public.enrollment_subjects
  for all
  to authenticated
  using (private.is_admin())
  with check (private.is_admin());

revoke all on table public.enrollment_subjects from public, anon;
grant select, insert, update, delete on table public.enrollment_subjects to authenticated;
grant select, insert, update, delete on table public.enrollment_subjects to service_role;
