-- Authenticated, role-scoped electronic signatures for enrollment clearances.
-- Official signing authority is intentionally separate from the generic admin
-- profile role. An admin profile must have an active official_role_assignments
-- row before it can sign a clearance.

create table if not exists public.official_role_assignments (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete restrict,
  official_role text not null check (
    official_role in ('LIBRARIAN', 'NURSE', 'PROGRAM_CHAIR', 'ACCOUNTANT', 'DEAN')
  ),
  program_id uuid references public.programs(id) on delete restrict,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint official_role_assignments_profile_role_program_key
    unique (profile_id, official_role, program_id)
);

create unique index if not exists official_role_assignments_global_role_key
  on public.official_role_assignments (profile_id, official_role)
  where program_id is null;

create index if not exists official_role_assignments_active_role_idx
  on public.official_role_assignments (official_role, active)
  where active = true;

drop trigger if exists set_official_role_assignments_updated_at on public.official_role_assignments;
create trigger set_official_role_assignments_updated_at
before update on public.official_role_assignments
for each row execute function public.set_updated_at();

alter table public.official_role_assignments enable row level security;
revoke all on table public.official_role_assignments from public, anon, authenticated;
grant select on table public.official_role_assignments to authenticated;
grant all on table public.official_role_assignments to service_role;

drop policy if exists "official_role_assignments_select_own_or_admin" on public.official_role_assignments;
create policy "official_role_assignments_select_own_or_admin"
on public.official_role_assignments for select
to authenticated
using (profile_id = auth.uid() or private.is_admin());

-- Assignments are provisioned by a controlled administrative/deployment path.
-- No authenticated client receives direct insert/update/delete privileges.

create or replace function private.has_official_role(p_official_role text)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.profiles p
    join public.official_role_assignments a on a.profile_id = p.id
    where p.id = auth.uid()
      and p.role = 'admin'
      and p.account_status = 'ACTIVE'
      and a.official_role = p_official_role
      and a.active = true
  );
$$;

revoke all on function private.has_official_role(text) from public;
grant execute on function private.has_official_role(text) to authenticated;

create or replace function private.has_official_role_for_program(
  p_official_role text,
  p_program_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.profiles p
    join public.official_role_assignments a on a.profile_id = p.id
    where p.id = auth.uid()
      and p.role = 'admin'
      and p.account_status = 'ACTIVE'
      and a.official_role = p_official_role
      and a.active = true
      and (a.program_id is null or a.program_id = p_program_id)
  );
$$;

revoke all on function private.has_official_role_for_program(text, uuid) from public;
grant execute on function private.has_official_role_for_program(text, uuid) to authenticated;

create table if not exists public.enrollment_clearances (
  id uuid primary key default gen_random_uuid(),
  enrollment_id uuid not null references public.enrollments(id) on delete restrict,
  clearance_type text not null check (
    clearance_type in (
      'LIBRARY_CLEARANCE',
      'HEALTH_CLEARANCE',
      'PROGRAM_CLEARANCE',
      'ACCOUNTING_CLEARANCE',
      'DEAN_CLEARANCE',
      'STUDENT_ENROLLMENT_SIGNATURE'
    )
  ),
  status text not null default 'PENDING' check (
    status in ('PENDING', 'SIGNED', 'NOT_APPLICABLE', 'INVALIDATED')
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint enrollment_clearances_enrollment_type_key unique (enrollment_id, clearance_type),
  constraint enrollment_clearances_not_applicable_health_only check (
    status <> 'NOT_APPLICABLE' or clearance_type = 'HEALTH_CLEARANCE'
  )
);

create index if not exists enrollment_clearances_status_idx
  on public.enrollment_clearances (clearance_type, status);

drop trigger if exists set_enrollment_clearances_updated_at on public.enrollment_clearances;
create trigger set_enrollment_clearances_updated_at
before update on public.enrollment_clearances
for each row execute function public.set_updated_at();

alter table public.enrollment_clearances enable row level security;
revoke all on table public.enrollment_clearances from public, anon, authenticated;
grant select on table public.enrollment_clearances to authenticated;
grant all on table public.enrollment_clearances to service_role;

drop policy if exists "enrollment_clearances_select_own_or_admin" on public.enrollment_clearances;
create policy "enrollment_clearances_select_own_or_admin"
on public.enrollment_clearances for select
to authenticated
using (
  private.is_admin()
  or exists (
    select 1
    from public.enrollments e
    join public.students s on s.id = e.student_id
    where e.id = enrollment_clearances.enrollment_id
      and s.profile_id = auth.uid()
  )
);

create or replace function private.invalidate_enrollment_clearances(
  p_enrollment_id uuid,
  p_clearance_type text default null
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  with changed as (
    update public.enrollment_clearances
    set status = 'INVALIDATED', updated_at = now()
    where enrollment_id = p_enrollment_id
      and status = 'SIGNED'
      and (p_clearance_type is null or clearance_type = p_clearance_type)
    returning id
  )
  insert into public.audit_logs (actor_profile_id, action, target_table, target_id)
  select auth.uid(), 'INVALIDATE_ENROLLMENT_SIGNATURE', 'enrollment_clearances', id
  from changed;
end;
$$;

revoke all on function private.invalidate_enrollment_clearances(uuid, text) from public;

create or replace function private.invalidate_non_health_clearances(p_enrollment_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  with changed as (
    update public.enrollment_clearances
    set status = 'INVALIDATED', updated_at = now()
    where enrollment_id = p_enrollment_id
      and clearance_type <> 'HEALTH_CLEARANCE'
      and status = 'SIGNED'
    returning id
  )
  insert into public.audit_logs (actor_profile_id, action, target_table, target_id)
  select auth.uid(), 'INVALIDATE_ENROLLMENT_SIGNATURE', 'enrollment_clearances', id
  from changed;
end;
$$;

revoke all on function private.invalidate_non_health_clearances(uuid) from public;

create or replace function private.invalidate_enrollment_clearances_on_enrollment_change()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if tg_op = 'UPDATE'
     and (
       old.student_id is distinct from new.student_id
       or old.academic_year is distinct from new.academic_year
       or old.semester is distinct from new.semester
     ) then
    perform private.invalidate_enrollment_clearances(new.id);
  else
    perform private.invalidate_non_health_clearances(coalesce(new.id, old.id));
  end if;
  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

drop trigger if exists invalidate_enrollment_clearances_after_enrollment_change on public.enrollments;
create trigger invalidate_enrollment_clearances_after_enrollment_change
after update of student_id, program_id, year_level, academic_year, semester on public.enrollments
for each row execute function private.invalidate_enrollment_clearances_on_enrollment_change();

create or replace function private.invalidate_enrollment_clearances_on_subject_change()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  perform private.invalidate_non_health_clearances(coalesce(new.enrollment_id, old.enrollment_id));
  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

drop trigger if exists invalidate_enrollment_clearances_after_subject_change on public.enrollment_subjects;
create trigger invalidate_enrollment_clearances_after_subject_change
after insert or update or delete on public.enrollment_subjects
for each row execute function private.invalidate_enrollment_clearances_on_subject_change();

create or replace function private.invalidate_health_clearance_on_requirement_change()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.requirement_code = 'HEALTH_RECORD_UPDATE'
     and (
       old.status is distinct from new.status
       or old.applicability is distinct from new.applicability
       or old.academic_year is distinct from new.academic_year
       or old.semester is distinct from new.semester
     ) then
    update public.enrollment_clearances ec
    set status = 'INVALIDATED', updated_at = now()
    from public.enrollments e
    where ec.enrollment_id = e.id
      and ec.clearance_type = 'HEALTH_CLEARANCE'
      and ec.status = 'SIGNED'
      and e.student_id = new.student_id
      and e.academic_year = new.academic_year
      and e.semester = new.semester;
  end if;
  return new;
end;
$$;

drop trigger if exists invalidate_health_clearance_after_requirement_change on public.student_requirements;
create trigger invalidate_health_clearance_after_requirement_change
after update of status, applicability, academic_year, semester on public.student_requirements
for each row execute function private.invalidate_health_clearance_on_requirement_change();

create or replace function private.invalidate_health_clearance_on_official_record_change()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  update public.enrollment_clearances ec
  set status = 'INVALIDATED', updated_at = now()
  from public.enrollments e
  join public.students s on s.id = e.student_id
  where ec.enrollment_id = e.id
    and ec.clearance_type = 'HEALTH_CLEARANCE'
    and ec.status = 'SIGNED'
    and (
      s.student_id_number = new.student_id_number
      or s.student_id_number = old.student_id_number
    );
  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

drop trigger if exists invalidate_health_clearance_after_official_record_change on public.official_student_records;
create trigger invalidate_health_clearance_after_official_record_change
after update of student_id_number, gender_sex on public.official_student_records
for each row execute function private.invalidate_health_clearance_on_official_record_change();

create or replace function private.seed_enrollment_clearances()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_health_applicability text;
begin
  select case
    when s.student_type = 'Incoming 1st Year Student'
      and lower(btrim(coalesce(osr.gender_sex, ''))) = 'female'
      then 'APPLICABLE'
    else 'NOT_APPLICABLE'
  end
  into v_health_applicability
  from public.students s
  left join public.official_student_records osr
    on osr.student_id_number = s.student_id_number
  where s.id = new.student_id;

  insert into public.enrollment_clearances (enrollment_id, clearance_type, status)
  values
    (new.id, 'LIBRARY_CLEARANCE', 'PENDING'),
    (new.id, 'PROGRAM_CLEARANCE', 'PENDING'),
    (new.id, 'ACCOUNTING_CLEARANCE', 'PENDING'),
    (new.id, 'DEAN_CLEARANCE', 'PENDING'),
    (new.id, 'STUDENT_ENROLLMENT_SIGNATURE', 'PENDING'),
    (new.id, 'HEALTH_CLEARANCE', case when v_health_applicability = 'APPLICABLE' then 'PENDING' else 'NOT_APPLICABLE' end)
  on conflict (enrollment_id, clearance_type) do nothing;

  return new;
end;
$$;

revoke all on function private.seed_enrollment_clearances() from public;

drop trigger if exists seed_enrollment_clearances_after_insert on public.enrollments;
create trigger seed_enrollment_clearances_after_insert
after insert on public.enrollments
for each row execute function private.seed_enrollment_clearances();

-- Backfill rows for enrollments created before this migration.
insert into public.enrollment_clearances (enrollment_id, clearance_type, status)
select e.id, clearance.clearance_type,
  case
    when clearance.clearance_type = 'HEALTH_CLEARANCE'
      and not (
        s.student_type = 'Incoming 1st Year Student'
        and lower(btrim(coalesce(osr.gender_sex, ''))) = 'female'
      ) then 'NOT_APPLICABLE'
    else 'PENDING'
  end
from public.enrollments e
join public.students s on s.id = e.student_id
left join public.official_student_records osr on osr.student_id_number = s.student_id_number
cross join (
  values
    ('LIBRARY_CLEARANCE'::text),
    ('HEALTH_CLEARANCE'::text),
    ('PROGRAM_CLEARANCE'::text),
    ('ACCOUNTING_CLEARANCE'::text),
    ('DEAN_CLEARANCE'::text),
    ('STUDENT_ENROLLMENT_SIGNATURE'::text)
) as clearance(clearance_type)
on conflict (enrollment_id, clearance_type) do nothing;

create table if not exists public.enrollment_signatures (
  id uuid primary key default gen_random_uuid(),
  enrollment_id uuid not null references public.enrollments(id) on delete restrict,
  student_id uuid not null references public.students(id) on delete restrict,
  signer_profile_id uuid not null references public.profiles(id) on delete restrict,
  signer_role text not null check (
    signer_role in ('STUDENT', 'LIBRARIAN', 'NURSE', 'PROGRAM_CHAIR', 'ACCOUNTANT', 'DEAN')
  ),
  clearance_type text not null check (
    clearance_type in (
      'STUDENT_ENROLLMENT_SIGNATURE',
      'LIBRARY_CLEARANCE',
      'HEALTH_CLEARANCE',
      'PROGRAM_CLEARANCE',
      'ACCOUNTING_CLEARANCE',
      'DEAN_CLEARANCE'
    )
  ),
  document_type text not null check (
    document_type in ('ENROLLMENT_REGISTRATION', 'ENROLLMENT_CLEARANCE', 'HEALTH_RECORD')
  ),
  signer_name_snapshot text not null check (char_length(btrim(signer_name_snapshot)) between 1 and 200),
  signature_storage_path text not null,
  signature_hash text not null check (signature_hash ~ '^[0-9a-f]{64}$'),
  document_hash text not null check (document_hash ~ '^[0-9a-f]{64}$'),
  signed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint enrollment_signatures_storage_path_key unique (signature_storage_path),
  constraint enrollment_signatures_role_clearance_document_check check (
    (signer_role = 'STUDENT'
      and clearance_type = 'STUDENT_ENROLLMENT_SIGNATURE'
      and document_type = 'ENROLLMENT_REGISTRATION')
    or (signer_role = 'LIBRARIAN'
      and clearance_type = 'LIBRARY_CLEARANCE'
      and document_type = 'ENROLLMENT_CLEARANCE')
    or (signer_role = 'NURSE'
      and clearance_type = 'HEALTH_CLEARANCE'
      and document_type = 'HEALTH_RECORD')
    or (signer_role = 'PROGRAM_CHAIR'
      and clearance_type = 'PROGRAM_CLEARANCE'
      and document_type = 'ENROLLMENT_CLEARANCE')
    or (signer_role = 'ACCOUNTANT'
      and clearance_type = 'ACCOUNTING_CLEARANCE'
      and document_type = 'ENROLLMENT_CLEARANCE')
    or (signer_role = 'DEAN'
      and clearance_type = 'DEAN_CLEARANCE'
      and document_type = 'ENROLLMENT_CLEARANCE')
  ),
  constraint enrollment_signatures_storage_path_check check (
    signature_storage_path = enrollment_id::text || '/' || signer_role || '/' || id::text || '.png'
  )
);

-- Historical rows are retained so an invalidated signature can be audited and
-- a later re-sign can be stored as a new immutable row.
alter table public.enrollment_signatures
  drop constraint if exists enrollment_signatures_enrollment_clearance_key;

create index if not exists enrollment_signatures_student_idx
  on public.enrollment_signatures (student_id, clearance_type);

drop trigger if exists set_enrollment_signatures_updated_at on public.enrollment_signatures;
create trigger set_enrollment_signatures_updated_at
before update on public.enrollment_signatures
for each row execute function public.set_updated_at();

create or replace function private.prevent_enrollment_signature_mutation()
returns trigger
language plpgsql
as $$
begin
  raise exception 'Enrollment signatures are immutable; use a controlled invalidation and re-sign workflow.';
end;
$$;

drop trigger if exists prevent_enrollment_signature_mutation on public.enrollment_signatures;
create trigger prevent_enrollment_signature_mutation
before update or delete on public.enrollment_signatures
for each row execute function private.prevent_enrollment_signature_mutation();

alter table public.enrollment_signatures enable row level security;
revoke all on table public.enrollment_signatures from public, anon, authenticated;
grant select on table public.enrollment_signatures to authenticated;
grant all on table public.enrollment_signatures to service_role;

drop policy if exists "enrollment_signatures_select_own_or_admin" on public.enrollment_signatures;
create policy "enrollment_signatures_select_own_or_admin"
on public.enrollment_signatures for select
to authenticated
using (
  private.is_admin()
  or exists (
    select 1
    from public.students s
    where s.id = enrollment_signatures.student_id
      and s.profile_id = auth.uid()
  )
);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'enrollment-signatures',
  'enrollment-signatures',
  false,
  262144,
  array['image/png']::text[]
)
on conflict (id) do update set
  name = excluded.name,
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "enrollment_signature_objects_select_authorized" on storage.objects;
create policy "enrollment_signature_objects_select_authorized"
on storage.objects for select
to authenticated
using (
  bucket_id = 'enrollment-signatures'
  and (
    private.is_admin()
    or exists (
      select 1
      from public.enrollment_signatures es
      join public.students s on s.id = es.student_id
      where es.signature_storage_path = storage.objects.name
        and s.profile_id = auth.uid()
    )
  )
);

-- These helpers deliberately use a simple line-oriented canonical form so the
-- server action and the database review gate can independently reproduce it.
create or replace function private.enrollment_document_hash(
  p_enrollment_id uuid,
  p_signer_role text,
  p_clearance_type text,
  p_document_type text
)
returns text
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  with enrollment_data as (
    select
      e.id,
      e.academic_year,
      e.semester,
      e.program_id,
      e.year_level,
      coalesce(
        (
          select string_agg(
            format('%s|%s|%s', es.course_code, es.course_description, es.units::text),
            E'\n'
            order by es.course_code, es.course_description, es.units
          )
          from public.enrollment_subjects es
          where es.enrollment_id = e.id
        ),
        ''
      ) as subject_material,
      coalesce((select sum(es.units) from public.enrollment_subjects es where es.enrollment_id = e.id), 0)::text as total_units
    from public.enrollments e
    where e.id = p_enrollment_id
  )
  select encode(
    extensions.digest(
      format(
        'ENROLLMENT\n' ||
        'enrollment_id=%s\n' ||
        'academic_year=%s\n' ||
        'semester=%s\n' ||
        'program_id=%s\n' ||
        'year_level=%s\n' ||
        'subjects=%s\n' ||
        'total_units=%s\n' ||
        'signer_role=%s\n' ||
        'clearance_type=%s\n' ||
        'document_type=%s',
        id,
        academic_year,
        semester,
        program_id,
        year_level,
        subject_material,
        total_units,
        p_signer_role,
        p_clearance_type,
        p_document_type
      ),
      'sha256'
    ),
    'hex'
  )
  from enrollment_data;
$$;

create or replace function private.health_record_document_hash(
  p_enrollment_id uuid,
  p_student_id uuid,
  p_academic_year text,
  p_semester text,
  p_applicability text,
  p_status text
)
returns text
language sql
immutable
security definer
set search_path = public, pg_temp
as $$
  select encode(
    extensions.digest(
      format(
        'HEALTH_RECORD\n' ||
        'enrollment_id=%s\n' ||
        'student_id=%s\n' ||
        'academic_year=%s\n' ||
        'semester=%s\n' ||
        'requirement_code=HEALTH_RECORD_UPDATE\n' ||
        'applicability=%s\n' ||
        'status=%s\n' ||
        'signer_role=NURSE\n' ||
        'clearance_type=HEALTH_CLEARANCE\n' ||
        'document_type=HEALTH_RECORD',
        p_enrollment_id,
        p_student_id,
        p_academic_year,
        p_semester,
        p_applicability,
        p_status
      ),
      'sha256'
    ),
    'hex'
  );
$$;

revoke all on function private.enrollment_document_hash(uuid, text, text, text) from public;
revoke all on function private.health_record_document_hash(uuid, uuid, text, text, text, text) from public;

create or replace function private.health_clearance_is_current(p_enrollment_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.enrollments e
    join public.students s on s.id = e.student_id
    join public.student_requirements sr
      on sr.student_id = s.id
      and sr.requirement_code = 'HEALTH_RECORD_UPDATE'
      and sr.academic_year = e.academic_year
      and sr.semester = e.semester
    join public.enrollment_signatures es
      on es.enrollment_id = e.id
      and es.student_id = s.id
      and es.signer_role = 'NURSE'
      and es.clearance_type = 'HEALTH_CLEARANCE'
      and es.document_type = 'HEALTH_RECORD'
    join public.enrollment_clearances ec
      on ec.enrollment_id = e.id
      and ec.clearance_type = 'HEALTH_CLEARANCE'
      and ec.status = 'SIGNED'
    where e.id = p_enrollment_id
      and sr.applicability = 'APPLICABLE'
      and sr.status = 'VERIFIED'
      and es.document_hash = private.health_record_document_hash(
        e.id,
        s.id,
        e.academic_year,
        e.semester,
        sr.applicability,
        sr.status::text
      )
  );
$$;

revoke all on function private.health_clearance_is_current(uuid) from public;

-- Only the dedicated Nurse transaction may transition the health requirement
-- to VERIFIED. Registrar/admin status actions can still reset or reject it.
create or replace function private.prevent_unscoped_health_requirement_verification()
returns trigger
language plpgsql
as $$
begin
  if new.requirement_code = 'HEALTH_RECORD_UPDATE'
    and new.status = 'VERIFIED'
    and coalesce(current_setting('pkm.nurse_health_verification', true), 'false') <> 'true' then
    raise exception 'Health Record Update verification requires a Nurse signature transaction.';
  end if;
  return new;
end;
$$;

drop trigger if exists prevent_unscoped_health_requirement_verification on public.student_requirements;
create trigger prevent_unscoped_health_requirement_verification
before insert or update on public.student_requirements
for each row execute function private.prevent_unscoped_health_requirement_verification();

create or replace function public.record_student_enrollment_signature(
  p_enrollment_id uuid,
  p_signature_id uuid,
  p_signature_storage_path text,
  p_signature_hash text,
  p_document_hash text
)
returns table (outcome text, signature_id uuid, signed_at timestamptz)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_enrollment public.enrollments%rowtype;
  v_student public.students%rowtype;
  v_profile public.profiles%rowtype;
  v_expected_document_hash text;
  v_clearance_status text;
  v_signed_at timestamptz := now();
begin
  if auth.uid() is null then
    return query select 'unauthorized'::text, null::uuid, null::timestamptz;
    return;
  end if;

  if p_enrollment_id is null
    or p_signature_id is null
    or p_signature_storage_path is null
    or p_signature_hash is null
    or p_signature_hash !~ '^[0-9a-f]{64}$'
    or p_document_hash is null
    or p_document_hash !~ '^[0-9a-f]{64}$'
    or p_signature_storage_path <> format('%s/STUDENT/%s.png', p_enrollment_id, p_signature_id) then
    return query select 'invalid_request'::text, null::uuid, null::timestamptz;
    return;
  end if;

  select e.*
  into v_enrollment
  from public.enrollments e
  join public.students s on s.id = e.student_id
  join public.profiles p on p.id = s.profile_id
  where e.id = p_enrollment_id
    and s.profile_id = auth.uid()
    and p.role = 'student'
    and p.account_status = 'ACTIVE'
  for update of e;

  if not found then
    return query select 'unauthorized'::text, null::uuid, null::timestamptz;
    return;
  end if;

  select s.* into v_student
  from public.students s
  where s.id = v_enrollment.student_id;
  select p.* into v_profile
  from public.profiles p
  where p.id = v_student.profile_id;

  if v_enrollment.status not in ('PENDING', 'APPROVED') then
    return query select 'not_signable'::text, null::uuid, null::timestamptz;
    return;
  end if;

  v_expected_document_hash := private.enrollment_document_hash(
    v_enrollment.id,
    'STUDENT',
    'STUDENT_ENROLLMENT_SIGNATURE',
    'ENROLLMENT_REGISTRATION'
  );

  if p_document_hash <> v_expected_document_hash then
    return query select 'fingerprint_mismatch'::text, null::uuid, null::timestamptz;
    return;
  end if;

  select ec.status
  into v_clearance_status
  from public.enrollment_clearances ec
  where ec.enrollment_id = v_enrollment.id
    and ec.clearance_type = 'STUDENT_ENROLLMENT_SIGNATURE'
  for update;

  if v_clearance_status = 'SIGNED'
     and exists (
       select 1 from public.enrollment_signatures es
       where es.enrollment_id = v_enrollment.id
         and es.clearance_type = 'STUDENT_ENROLLMENT_SIGNATURE'
         and es.document_hash = v_expected_document_hash
     ) then
    return query select 'duplicate'::text, null::uuid, null::timestamptz;
    return;
  end if;

  if v_clearance_status = 'SIGNED' then
    update public.enrollment_clearances
    set status = 'INVALIDATED', updated_at = now()
    where enrollment_id = v_enrollment.id
      and clearance_type = 'STUDENT_ENROLLMENT_SIGNATURE';
  end if;

  insert into public.enrollment_signatures (
    id, enrollment_id, student_id, signer_profile_id, signer_role,
    clearance_type, document_type, signer_name_snapshot,
    signature_storage_path, signature_hash, document_hash, signed_at
  )
  values (
    p_signature_id,
    v_enrollment.id,
    v_student.id,
    auth.uid(),
    'STUDENT',
    'STUDENT_ENROLLMENT_SIGNATURE',
    'ENROLLMENT_REGISTRATION',
    btrim(concat_ws(' ', v_profile.first_name, v_profile.last_name)),
    p_signature_storage_path,
    p_signature_hash,
    p_document_hash,
    v_signed_at
  );

  insert into public.enrollment_clearances (enrollment_id, clearance_type, status)
  values (v_enrollment.id, 'STUDENT_ENROLLMENT_SIGNATURE', 'SIGNED')
  on conflict (enrollment_id, clearance_type) do update set status = 'SIGNED', updated_at = now();

  insert into public.audit_logs (actor_profile_id, action, target_table, target_id)
  values (auth.uid(), 'APPLY_STUDENT_SIGNATURE', 'enrollment_signatures', p_signature_id);

  return query select 'signed'::text, p_signature_id, v_signed_at;
exception
  when unique_violation then
    return query select 'duplicate'::text, null::uuid, null::timestamptz;
end;
$$;

revoke all on function public.record_student_enrollment_signature(uuid, uuid, text, text, text) from public;
revoke execute on function public.record_student_enrollment_signature(uuid, uuid, text, text, text) from anon;
grant execute on function public.record_student_enrollment_signature(uuid, uuid, text, text, text) to authenticated;

create or replace function public.record_official_clearance_signature(
  p_enrollment_id uuid,
  p_clearance_type text,
  p_signature_id uuid,
  p_signature_storage_path text,
  p_signature_hash text,
  p_document_hash text
)
returns table (outcome text, signature_id uuid, signed_at timestamptz)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_enrollment public.enrollments%rowtype;
  v_student public.students%rowtype;
  v_profile public.profiles%rowtype;
  v_signer_role text;
  v_expected_document_hash text;
  v_clearance_status text;
  v_signed_at timestamptz := now();
begin
  if auth.uid() is null then
    return query select 'unauthorized'::text, null::uuid, null::timestamptz;
    return;
  end if;

  v_signer_role := case p_clearance_type
    when 'LIBRARY_CLEARANCE' then 'LIBRARIAN'
    when 'PROGRAM_CLEARANCE' then 'PROGRAM_CHAIR'
    when 'ACCOUNTING_CLEARANCE' then 'ACCOUNTANT'
    when 'DEAN_CLEARANCE' then 'DEAN'
    else null
  end;

  if v_signer_role is null
    or p_enrollment_id is null
    or p_signature_id is null
    or p_signature_storage_path is null
    or p_signature_hash is null
    or p_signature_hash !~ '^[0-9a-f]{64}$'
    or p_document_hash is null
    or p_document_hash !~ '^[0-9a-f]{64}$'
    or p_signature_storage_path <> format('%s/%s/%s.png', p_enrollment_id, v_signer_role, p_signature_id) then
    return query select 'unauthorized'::text, null::uuid, null::timestamptz;
    return;
  end if;

  select e.*
  into v_enrollment
  from public.enrollments e
  join public.students s on s.id = e.student_id
  join public.profiles p on p.id = auth.uid()
  where e.id = p_enrollment_id
  for update of e;

  if not found then
    return query select 'not_found'::text, null::uuid, null::timestamptz;
    return;
  end if;

  select s.* into v_student
  from public.students s
  where s.id = v_enrollment.student_id;
  select p.* into v_profile
  from public.profiles p
  where p.id = auth.uid();

  if not private.has_official_role_for_program(v_signer_role, v_enrollment.program_id) then
    return query select 'unauthorized'::text, null::uuid, null::timestamptz;
    return;
  end if;

  if v_enrollment.status not in ('PENDING', 'APPROVED') then
    return query select 'not_signable'::text, null::uuid, null::timestamptz;
    return;
  end if;

  v_expected_document_hash := private.enrollment_document_hash(
    v_enrollment.id,
    v_signer_role,
    p_clearance_type,
    'ENROLLMENT_CLEARANCE'
  );

  if p_document_hash <> v_expected_document_hash then
    return query select 'fingerprint_mismatch'::text, null::uuid, null::timestamptz;
    return;
  end if;

  select ec.status
  into v_clearance_status
  from public.enrollment_clearances ec
  where ec.enrollment_id = v_enrollment.id
    and ec.clearance_type = p_clearance_type
  for update;

  if v_clearance_status = 'SIGNED'
     and exists (
       select 1 from public.enrollment_signatures es
       where es.enrollment_id = v_enrollment.id
         and es.clearance_type = p_clearance_type
         and es.document_hash = v_expected_document_hash
     ) then
    return query select 'duplicate'::text, null::uuid, null::timestamptz;
    return;
  end if;

  if v_clearance_status = 'SIGNED' then
    update public.enrollment_clearances
    set status = 'INVALIDATED', updated_at = now()
    where enrollment_id = v_enrollment.id
      and clearance_type = p_clearance_type;
  end if;

  insert into public.enrollment_signatures (
    id, enrollment_id, student_id, signer_profile_id, signer_role,
    clearance_type, document_type, signer_name_snapshot,
    signature_storage_path, signature_hash, document_hash, signed_at
  )
  values (
    p_signature_id,
    v_enrollment.id,
    v_student.id,
    auth.uid(),
    v_signer_role,
    p_clearance_type,
    'ENROLLMENT_CLEARANCE',
    btrim(concat_ws(' ', v_profile.first_name, v_profile.last_name)),
    p_signature_storage_path,
    p_signature_hash,
    p_document_hash,
    v_signed_at
  );

  insert into public.enrollment_clearances (enrollment_id, clearance_type, status)
  values (v_enrollment.id, p_clearance_type, 'SIGNED')
  on conflict (enrollment_id, clearance_type) do update set status = 'SIGNED', updated_at = now();

  insert into public.audit_logs (actor_profile_id, action, target_table, target_id)
  values (
    auth.uid(),
    case p_clearance_type
      when 'LIBRARY_CLEARANCE' then 'SIGN_LIBRARY_CLEARANCE'
      when 'PROGRAM_CLEARANCE' then 'SIGN_PROGRAM_CLEARANCE'
      when 'ACCOUNTING_CLEARANCE' then 'SIGN_ACCOUNTING_CLEARANCE'
      else 'SIGN_DEAN_CLEARANCE'
    end,
    'enrollment_signatures',
    p_signature_id
  );

  return query select 'signed'::text, p_signature_id, v_signed_at;
exception
  when unique_violation then
    return query select 'duplicate'::text, null::uuid, null::timestamptz;
end;
$$;

revoke all on function public.record_official_clearance_signature(uuid, text, uuid, text, text, text) from public;
revoke execute on function public.record_official_clearance_signature(uuid, text, uuid, text, text, text) from anon;
grant execute on function public.record_official_clearance_signature(uuid, text, uuid, text, text, text) to authenticated;

create or replace function public.verify_health_requirement_with_signature(
  p_enrollment_id uuid,
  p_signature_id uuid,
  p_signature_storage_path text,
  p_signature_hash text,
  p_document_hash text
)
returns table (outcome text, requirement_id uuid, signature_id uuid, signed_at timestamptz)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_enrollment public.enrollments%rowtype;
  v_student public.students%rowtype;
  v_profile public.profiles%rowtype;
  v_requirement public.student_requirements%rowtype;
  v_applicability text;
  v_expected_document_hash text;
  v_clearance_status text;
  v_signed_at timestamptz := now();
begin
  if auth.uid() is null or not private.has_official_role('NURSE') then
    return query select 'unauthorized'::text, null::uuid, null::uuid, null::timestamptz;
    return;
  end if;

  if p_enrollment_id is null
    or p_signature_id is null
    or p_signature_storage_path is null
    or p_signature_hash is null
    or p_signature_hash !~ '^[0-9a-f]{64}$'
    or p_document_hash is null
    or p_document_hash !~ '^[0-9a-f]{64}$'
    or p_signature_storage_path <> format('%s/NURSE/%s.png', p_enrollment_id, p_signature_id) then
    return query select 'invalid_request'::text, null::uuid, null::uuid, null::timestamptz;
    return;
  end if;

  select e.*
  into v_enrollment
  from public.enrollments e
  join public.students s on s.id = e.student_id
  join public.profiles p on p.id = auth.uid()
  where e.id = p_enrollment_id
  for update of e;

  if not found then
    return query select 'not_found'::text, null::uuid, null::uuid, null::timestamptz;
    return;
  end if;

  select s.* into v_student
  from public.students s
  where s.id = v_enrollment.student_id;
  select p.* into v_profile
  from public.profiles p
  where p.id = auth.uid();

  if not private.has_official_role_for_program('NURSE', v_enrollment.program_id) then
    return query select 'unauthorized'::text, null::uuid, null::uuid, null::timestamptz;
    return;
  end if;

  if v_enrollment.status <> 'PENDING' then
    return query select 'not_signable'::text, null::uuid, null::uuid, null::timestamptz;
    return;
  end if;

  select case
    when v_student.student_type = 'Incoming 1st Year Student'
      and lower(btrim(coalesce(osr.gender_sex, ''))) = 'female'
      then 'APPLICABLE'
    else 'NOT_APPLICABLE'
  end
  into v_applicability
  from public.official_student_records osr
  where osr.student_id_number = v_student.student_id_number;

  v_applicability := coalesce(v_applicability, 'NOT_APPLICABLE');

  if v_applicability <> 'APPLICABLE' then
    return query select 'not_applicable'::text, null::uuid, null::uuid, null::timestamptz;
    return;
  end if;

  select * into v_requirement
  from public.student_requirements sr
  where sr.student_id = v_student.id
    and sr.requirement_code = 'HEALTH_RECORD_UPDATE'
    and sr.academic_year = v_enrollment.academic_year
    and sr.semester = v_enrollment.semester
  for update;

  if not found or v_requirement.applicability <> 'APPLICABLE' then
    return query select 'requirement_unavailable'::text, null::uuid, null::uuid, null::timestamptz;
    return;
  end if;

  if v_requirement.status not in ('PENDING', 'VERIFIED') then
    return query select case when v_requirement.status = 'REJECTED' then 'not_signable' else 'already_verified' end::text, v_requirement.id, null::uuid, null::timestamptz;
    return;
  end if;

  v_expected_document_hash := private.health_record_document_hash(
    v_enrollment.id,
    v_student.id,
    v_enrollment.academic_year,
    v_enrollment.semester,
    'APPLICABLE',
    'VERIFIED'
  );

  if p_document_hash <> v_expected_document_hash then
    return query select 'fingerprint_mismatch'::text, v_requirement.id, null::uuid, null::timestamptz;
    return;
  end if;

  select ec.status
  into v_clearance_status
  from public.enrollment_clearances ec
  where ec.enrollment_id = v_enrollment.id
    and ec.clearance_type = 'HEALTH_CLEARANCE'
  for update;

  if v_clearance_status = 'SIGNED' then
    return query select case when v_requirement.status = 'VERIFIED' then 'already_verified' else 'duplicate' end::text, v_requirement.id, null::uuid, null::timestamptz;
    return;
  end if;

  perform set_config('pkm.nurse_health_verification', 'true', true);

  update public.student_requirements
  set
    status = 'VERIFIED',
    verified_at = v_signed_at,
    verified_by = auth.uid(),
    updated_at = v_signed_at
  where id = v_requirement.id;

  insert into public.enrollment_signatures (
    id, enrollment_id, student_id, signer_profile_id, signer_role,
    clearance_type, document_type, signer_name_snapshot,
    signature_storage_path, signature_hash, document_hash, signed_at
  )
  values (
    p_signature_id,
    v_enrollment.id,
    v_student.id,
    auth.uid(),
    'NURSE',
    'HEALTH_CLEARANCE',
    'HEALTH_RECORD',
    btrim(concat_ws(' ', v_profile.first_name, v_profile.last_name)),
    p_signature_storage_path,
    p_signature_hash,
    p_document_hash,
    v_signed_at
  );

  insert into public.enrollment_clearances (enrollment_id, clearance_type, status)
  values (v_enrollment.id, 'HEALTH_CLEARANCE', 'SIGNED')
  on conflict (enrollment_id, clearance_type) do update set status = 'SIGNED', updated_at = now();

  insert into public.audit_logs (actor_profile_id, action, target_table, target_id)
  values (auth.uid(), 'NURSE_VERIFY_HEALTH_REQUIREMENT', 'student_requirements', v_requirement.id);

  return query select 'signed'::text, v_requirement.id, p_signature_id, v_signed_at;
exception
  when unique_violation then
    return query select 'duplicate'::text, null::uuid, null::uuid, null::timestamptz;
end;
$$;

revoke all on function public.verify_health_requirement_with_signature(uuid, uuid, text, text, text) from public;
revoke execute on function public.verify_health_requirement_with_signature(uuid, uuid, text, text, text) from anon;
grant execute on function public.verify_health_requirement_with_signature(uuid, uuid, text, text, text) to authenticated;

-- Minimal Nurse worklist: status-only requirement data plus signature metadata.
create or replace function private.nurse_health_requirement_rows(p_enrollment_id uuid default null)
returns table (
  enrollment_id uuid,
  enrollment_status text,
  student_id uuid,
  student_id_number text,
  student_name text,
  academic_year text,
  semester text,
  requirement_id uuid,
  requirement_status text,
  requirement_applicability text,
  verified_at timestamptz,
  verified_by uuid,
  nurse_signature_id uuid,
  nurse_signature_name text,
  nurse_signature_signed_at timestamptz,
  nurse_signature_storage_path text,
  nurse_signature_document_hash text,
  nurse_signature_is_current boolean
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    e.id,
    e.status,
    s.id,
    s.student_id_number,
    btrim(concat_ws(' ', student_profile.first_name, student_profile.last_name)),
    e.academic_year,
    e.semester,
    sr.id,
    sr.status::text,
    sr.applicability,
    sr.verified_at,
    sr.verified_by,
    es.id,
    es.signer_name_snapshot,
    es.signed_at,
    es.signature_storage_path,
    es.document_hash,
    coalesce((
      sr.status = 'VERIFIED'
      and ec.status = 'SIGNED'
      and es.document_hash = private.health_record_document_hash(
        e.id,
        s.id,
        e.academic_year,
        e.semester,
        sr.applicability,
        sr.status::text
      )
    ), false)
  from public.enrollments e
  join public.students s on s.id = e.student_id
  join public.profiles student_profile on student_profile.id = s.profile_id
  join public.student_requirements sr
    on sr.student_id = s.id
    and sr.requirement_code = 'HEALTH_RECORD_UPDATE'
    and sr.academic_year = e.academic_year
    and sr.semester = e.semester
  left join public.enrollment_clearances ec
    on ec.enrollment_id = e.id
    and ec.clearance_type = 'HEALTH_CLEARANCE'
  left join lateral (
    select es.*
    from public.enrollment_signatures es
    where es.enrollment_id = e.id
      and es.clearance_type = 'HEALTH_CLEARANCE'
      and es.signer_role = 'NURSE'
    order by es.signed_at desc, es.id desc
    limit 1
  ) es on true
  left join public.official_student_records osr
    on osr.student_id_number = s.student_id_number
  where private.has_official_role_for_program('NURSE', e.program_id)
    and (p_enrollment_id is null or e.id = p_enrollment_id)
    and e.status in ('PENDING', 'APPROVED')
    and sr.applicability = 'APPLICABLE'
    and s.student_type = 'Incoming 1st Year Student'
    and lower(btrim(coalesce(osr.gender_sex, ''))) = 'female';
$$;

revoke all on function private.nurse_health_requirement_rows(uuid) from public;

create or replace function public.list_nurse_health_requirements()
returns table (
  enrollment_id uuid,
  enrollment_status text,
  student_id uuid,
  student_id_number text,
  student_name text,
  academic_year text,
  semester text,
  requirement_id uuid,
  requirement_status text,
  requirement_applicability text,
  verified_at timestamptz,
  verified_by uuid,
  nurse_signature_id uuid,
  nurse_signature_name text,
  nurse_signature_signed_at timestamptz,
  nurse_signature_storage_path text,
  nurse_signature_document_hash text,
  nurse_signature_is_current boolean
)
language sql
security definer
set search_path = public, pg_temp
as $$
  select * from private.nurse_health_requirement_rows(null);
$$;

create or replace function public.get_nurse_health_requirement(p_enrollment_id uuid)
returns table (
  enrollment_id uuid,
  enrollment_status text,
  student_id uuid,
  student_id_number text,
  student_name text,
  academic_year text,
  semester text,
  requirement_id uuid,
  requirement_status text,
  requirement_applicability text,
  verified_at timestamptz,
  verified_by uuid,
  nurse_signature_id uuid,
  nurse_signature_name text,
  nurse_signature_signed_at timestamptz,
  nurse_signature_storage_path text,
  nurse_signature_document_hash text,
  nurse_signature_is_current boolean
)
language sql
security definer
set search_path = public, pg_temp
as $$
  select * from private.nurse_health_requirement_rows(p_enrollment_id);
$$;

revoke all on function public.list_nurse_health_requirements() from public;
revoke execute on function public.list_nurse_health_requirements() from anon;
grant execute on function public.list_nurse_health_requirements() to authenticated;
revoke all on function public.get_nurse_health_requirement(uuid) from public;
revoke execute on function public.get_nurse_health_requirement(uuid) from anon;
grant execute on function public.get_nurse_health_requirement(uuid) to authenticated;

-- Extend the final approval gate so VERIFIED without a current Nurse signature
-- can never approve an applicable health requirement.
create or replace function public.review_pending_enrollment(
  p_enrollment_id uuid,
  p_decision text,
  p_remarks text
)
returns table (
  outcome text,
  enrollment_id uuid,
  review_status text,
  student_enrollment_status text
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_enrollment public.enrollments%rowtype;
  v_student public.students%rowtype;
  v_remarks text;
  v_student_status text;
  v_health_requirement_applies boolean;
  v_subject_count integer;
  v_invalid_subject_count integer;
  v_total_units numeric;
  v_recipient_email text;
begin
  if auth.uid() is null or not private.is_admin() then
    return query select 'unauthorized'::text, null::uuid, null::text, null::text;
    return;
  end if;

  if p_enrollment_id is null
    or p_decision is null
    or p_decision not in ('APPROVED', 'REJECTED') then
    return query select 'invalid_request'::text, null::uuid, null::text, null::text;
    return;
  end if;

  select * into v_enrollment
  from public.enrollments
  where id = p_enrollment_id
  for update;

  if not found then
    return query select 'not_found'::text, null::uuid, null::text, null::text;
    return;
  end if;

  if v_enrollment.status <> 'PENDING' then
    return query select 'already_reviewed'::text, v_enrollment.id, v_enrollment.status, null::text;
    return;
  end if;

  select * into v_student
  from public.students
  where id = v_enrollment.student_id
  for update;

  if not found then
    return query select 'invalid_request'::text, null::uuid, null::text, null::text;
    return;
  end if;

  if p_decision = 'APPROVED' then
    select
      count(*)::integer,
      count(*) filter (
        where nullif(btrim(es.course_code), '') is null
           or nullif(btrim(es.course_description), '') is null
           or es.units is null
           or es.units < 0
      )::integer,
      coalesce(sum(es.units), 0)::numeric
    into v_subject_count, v_invalid_subject_count, v_total_units
    from public.enrollment_subjects es
    where es.enrollment_id = v_enrollment.id;

    if v_subject_count < 1
      or v_invalid_subject_count > 0
      or v_total_units <= 0 then
      return query select 'invalid_enrollment_load'::text, v_enrollment.id, v_enrollment.status, null::text;
      return;
    end if;
  end if;

  select exists (
    select 1
    from public.official_student_records osr
    where osr.student_id_number = v_student.student_id_number
      and v_student.student_type = 'Incoming 1st Year Student'
      and lower(btrim(coalesce(osr.gender_sex, ''))) = 'female'
  ) into v_health_requirement_applies;

  if p_decision = 'APPROVED'
    and v_health_requirement_applies
    and not private.health_clearance_is_current(v_enrollment.id) then
    return query select 'unverified_requirements'::text, v_enrollment.id, v_enrollment.status, null::text;
    return;
  end if;

  v_remarks := case
    when p_decision = 'REJECTED' then nullif(btrim(coalesce(p_remarks, '')), '')
    else null
  end;

  update public.enrollments
  set
    status = p_decision,
    reviewed_at = now(),
    reviewed_by = auth.uid(),
    remarks = v_remarks
  where id = v_enrollment.id;

  select case
    when exists (select 1 from public.enrollments e where e.student_id = v_student.id and e.status = 'APPROVED') then 'ENROLLED'
    when exists (select 1 from public.enrollments e where e.student_id = v_student.id and e.status = 'PENDING') then 'PENDING'
    else 'NOT ENROLLED'
  end into v_student_status;

  update public.students
  set enrollment_status = v_student_status
  where id = v_student.id;

  insert into public.audit_logs (actor_profile_id, action, target_table, target_id)
  values (
    auth.uid(),
    case when p_decision = 'APPROVED' then 'APPROVE_ENROLLMENT' else 'REJECT_ENROLLMENT' end,
    'enrollments',
    v_enrollment.id
  );

  select btrim(coalesce(p.email, '')) into v_recipient_email
  from public.profiles p
  where p.id = v_student.profile_id;

  insert into public.enrollment_decision_notifications (
    enrollment_id, decision, recipient_email, academic_year, semester,
    status, attempt_count, last_error_code, reserved_at, reservation_token, sent_at
  )
  values (
    v_enrollment.id, p_decision, coalesce(v_recipient_email, ''),
    v_enrollment.academic_year, v_enrollment.semester, 'PENDING', 0,
    null, null, null, null
  )
  on conflict (enrollment_id, decision) do nothing;

  return query select lower(p_decision), v_enrollment.id, p_decision, v_student_status;
end;
$$;

revoke all on function public.review_pending_enrollment(uuid, text, text) from public;
revoke execute on function public.review_pending_enrollment(uuid, text, text) from anon;
grant execute on function public.review_pending_enrollment(uuid, text, text) to authenticated;
