alter table public.enrollments add column medical_document_version integer
  check (medical_document_version is null or medical_document_version > 0);

create table public.enrollment_medical_documents (
  id uuid primary key default gen_random_uuid(),
  enrollment_id uuid not null references public.enrollments(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  revision integer not null check (revision > 0),
  storage_path text not null unique,
  original_file_name text not null check (char_length(original_file_name) between 1 and 180),
  content_type text not null check (content_type in ('application/pdf', 'image/jpeg', 'image/png')),
  file_size integer not null check (file_size between 1 and 1048576),
  content_hash text not null check (content_hash ~ '^[0-9a-f]{64}$'),
  uploaded_by uuid not null references public.profiles(id),
  uploaded_at timestamptz not null default now(),
  unique (enrollment_id, revision)
);
alter table public.enrollment_medical_documents enable row level security;
revoke all on public.enrollment_medical_documents from public, anon, authenticated;
grant select on public.enrollment_medical_documents to authenticated;
grant all on public.enrollment_medical_documents to service_role;

create function private.can_read_medical_documents(p_enrollment_id uuid)
returns boolean language sql stable security definer set search_path = public, pg_temp as $$
  select auth.uid() is not null and exists (
    select 1 from public.enrollments e join public.students s on s.id = e.student_id
    where e.id = p_enrollment_id and (s.profile_id = auth.uid()
      or private.has_official_role_for_program('NURSE', e.program_id))
  );
$$;
revoke all on function private.can_read_medical_documents(uuid) from public, anon;
grant execute on function private.can_read_medical_documents(uuid) to authenticated;
create policy medical_documents_read on public.enrollment_medical_documents for select to authenticated
using (private.can_read_medical_documents(enrollment_id));

create function private.guard_medical_document_history()
returns trigger language plpgsql set search_path = public, pg_temp as $$
begin
  if tg_op = 'DELETE' and coalesce(current_setting('pkm.demo_reset', true), 'false') = 'true' then return old; end if;
  raise exception 'Medical document history is immutable.' using errcode = '55000';
end;
$$;
revoke all on function private.guard_medical_document_history() from public, anon, authenticated;
create trigger guard_medical_document_history before update or delete on public.enrollment_medical_documents
for each row execute function private.guard_medical_document_history();

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('enrollment-medical-documents', 'enrollment-medical-documents', false, 1048576,
  array['application/pdf', 'image/jpeg', 'image/png']);

create function private.can_upload_medical_object(p_name text)
returns boolean language sql stable security definer set search_path = public, pg_temp as $$
  select auth.uid() is not null and exists (
    select 1 from public.enrollments e join public.students s on s.id = e.student_id
    join public.profiles p on p.id = s.profile_id
    where p.id = auth.uid() and p.role = 'student' and p.account_status = 'ACTIVE'
      and e.status = 'PENDING' and split_part(p_name, '/', 1) = e.id::text
      and split_part(p_name, '/', 2) = auth.uid()::text
      and p_name ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}/[0-9a-f-]{36}\.(pdf|jpg|png)$'
  );
$$;
revoke all on function private.can_upload_medical_object(text) from public, anon;
grant execute on function private.can_upload_medical_object(text) to authenticated;
create policy medical_object_upload on storage.objects for insert to authenticated
with check (bucket_id = 'enrollment-medical-documents' and private.can_upload_medical_object(name));
create policy medical_object_read on storage.objects for select to authenticated
using (bucket_id = 'enrollment-medical-documents' and exists (
  select 1 from public.enrollment_medical_documents d where d.storage_path = storage.objects.name
));

create function public.record_student_medical_document_upload(
  p_enrollment_id uuid, p_storage_path text, p_original_file_name text,
  p_content_type text, p_file_size integer, p_content_hash text
)
returns table(outcome text, document_id uuid, revision integer)
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_enrollment public.enrollments%rowtype; v_revision integer; v_id uuid;
begin
  if auth.uid() is null then return query select 'unauthorized'::text, null::uuid, null::integer; return; end if;
  select e.* into v_enrollment from public.enrollments e join public.students s on s.id = e.student_id
  where e.id = p_enrollment_id and s.profile_id = auth.uid() for update of e;
  if not found then return query select 'not_found'::text, null::uuid, null::integer; return; end if;
  if v_enrollment.status <> 'PENDING' then return query select 'not_editable'::text, null::uuid, null::integer; return; end if;
  if p_storage_path is null or not private.can_upload_medical_object(p_storage_path)
    or split_part(p_storage_path, '/', 1) <> p_enrollment_id::text
    or p_original_file_name is null or char_length(p_original_file_name) not between 1 and 180
    or p_content_type is null or p_content_type not in ('application/pdf', 'image/jpeg', 'image/png')
    or p_file_size is null or p_file_size not between 1 and 1048576
    or p_content_hash is null or p_content_hash !~ '^[0-9a-f]{64}$'
    or not exists (select 1 from storage.objects o where o.bucket_id = 'enrollment-medical-documents'
      and o.name = p_storage_path and o.metadata->>'mimetype' = p_content_type
      and o.metadata->>'size' = p_file_size::text) then
    return query select 'invalid_request'::text, null::uuid, null::integer; return;
  end if;
  v_revision := coalesce(v_enrollment.medical_document_version, 0) + 1;
  insert into public.enrollment_medical_documents(enrollment_id, student_id, revision, storage_path,
    original_file_name, content_type, file_size, content_hash, uploaded_by)
  values (v_enrollment.id, v_enrollment.student_id, v_revision, p_storage_path,
    p_original_file_name, p_content_type, p_file_size, p_content_hash, auth.uid()) returning id into v_id;
  update public.enrollments set medical_document_version = v_revision where id = v_enrollment.id;
  perform private.invalidate_enrollment_clearances(v_enrollment.id, 'HEALTH_CLEARANCE');
  insert into public.audit_logs(actor_profile_id, action, target_table, target_id)
  values (auth.uid(), 'UPLOAD_MEDICAL_DOCUMENT', 'enrollment_medical_documents', v_id);
  return query select 'saved'::text, v_id, v_revision;
end;
$$;
revoke all on function public.record_student_medical_document_upload(uuid, text, text, text, integer, text) from public, anon;
grant execute on function public.record_student_medical_document_upload(uuid, text, text, text, integer, text) to authenticated;

alter function private.enrollment_document_hash(uuid, text, text, text) rename to enrollment_document_hash_before_medical;
create function private.enrollment_document_hash(p_enrollment_id uuid, p_signer_role text, p_clearance_type text, p_document_type text)
returns text language sql stable security definer set search_path = public, pg_temp as $$
  select case when p_signer_role = 'NURSE' and p_clearance_type = 'HEALTH_CLEARANCE'
    and p_document_type = 'ENROLLMENT_CLEARANCE' and e.medical_document_version > 0
    then encode(extensions.digest(private.enrollment_document_hash_before_medical(e.id, p_signer_role, p_clearance_type, p_document_type)
      || chr(10) || 'medical_document_version=' || e.medical_document_version::text, 'sha256'), 'hex')
    else private.enrollment_document_hash_before_medical(e.id, p_signer_role, p_clearance_type, p_document_type) end
  from public.enrollments e where e.id = p_enrollment_id;
$$;
revoke all on function private.enrollment_document_hash(uuid, text, text, text) from public, anon, authenticated;
alter function private.health_record_document_hash(uuid, uuid, text, text, text, text) rename to health_record_document_hash_before_medical;
create function private.health_record_document_hash(p_enrollment_id uuid, p_student_id uuid, p_academic_year text, p_semester text, p_applicability text, p_status text)
returns text language sql stable security definer set search_path = public, pg_temp as $$
  select case when e.medical_document_version > 0 then encode(extensions.digest(
    private.health_record_document_hash_before_medical(p_enrollment_id, p_student_id, p_academic_year, p_semester, p_applicability, p_status)
    || chr(10) || 'medical_document_version=' || e.medical_document_version::text, 'sha256'), 'hex')
    else private.health_record_document_hash_before_medical(p_enrollment_id, p_student_id, p_academic_year, p_semester, p_applicability, p_status) end
  from public.enrollments e where e.id = p_enrollment_id;
$$;
revoke all on function private.health_record_document_hash(uuid, uuid, text, text, text, text) from public, anon, authenticated;

create function private.guard_enrollment_status_history()
returns trigger language plpgsql set search_path = public, pg_temp as $$
begin
  if tg_op = 'DELETE' and coalesce(current_setting('pkm.demo_reset', true), 'false') = 'true' then return old; end if;
  raise exception 'Enrollment status history is immutable.' using errcode = '55000';
end;
$$;
revoke all on function private.guard_enrollment_status_history() from public, anon, authenticated;
create trigger guard_enrollment_status_history before update or delete on public.enrollment_status_events
for each row execute function private.guard_enrollment_status_history();

alter function public.reset_demo_student_data() rename to reset_demo_student_data_before_workflows;
revoke all on function public.reset_demo_student_data_before_workflows() from public, anon, authenticated, service_role;
create function public.reset_demo_student_data()
returns table(student_account_count integer, student_record_count integer, official_record_count integer,
  enrollment_count integer, signature_count integer, requirement_count integer)
language plpgsql security definer set search_path = public, private, pg_temp as $$
declare v_previous_reset text := coalesce(current_setting('pkm.demo_reset', true), 'false');
begin
  if coalesce(current_setting('request.jwt.claim.role', true), 'service_role') <> 'service_role' then
    raise exception 'This reset is available only through the server-side service role.' using errcode = '42501';
  end if;
  perform set_config('pkm.demo_reset', 'true', true);
  insert into public.audit_logs(actor_profile_id, action, target_table, target_id)
  select auth.uid(), 'DEMO_RESET_REMOVE_STATUS_EVENT', 'enrollment_status_events', ev.id
  from public.enrollment_status_events ev join public.enrollments e on e.id = ev.enrollment_id
  join public.students s on s.id = e.student_id join public.profiles p on p.id = s.profile_id
  where p.role = 'student';
  delete from public.enrollment_status_events ev using public.enrollments e, public.students s, public.profiles p
  where ev.enrollment_id = e.id and e.student_id = s.id and s.profile_id = p.id and p.role = 'student';
  return query select * from public.reset_demo_student_data_before_workflows();
  perform set_config('pkm.demo_reset', v_previous_reset, true);
end;
$$;
revoke all on function public.reset_demo_student_data() from public, anon, authenticated;
grant execute on function public.reset_demo_student_data() to service_role;
