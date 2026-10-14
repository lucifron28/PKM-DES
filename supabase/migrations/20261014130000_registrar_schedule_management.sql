alter table public.enrollment_subjects
  add column if not exists day text,
  add column if not exists time text,
  add column if not exists room text,
  add constraint enrollment_subjects_schedule_fingerprint_safe check (
    (day is null or (
      position('|' in day) = 0 and position(chr(10) in day) = 0 and position(chr(13) in day) = 0
    ))
    and (time is null or (
      position('|' in time) = 0 and position(chr(10) in time) = 0 and position(chr(13) in time) = 0
    ))
    and (room is null or (
      position('|' in room) = 0 and position(chr(10) in room) = 0 and position(chr(13) in room) = 0
    ))
  );

create or replace function private.guard_enrollment_subject_mutation()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_status text;
begin
  if tg_op = 'DELETE'
     and coalesce(current_setting('pkm.demo_reset', true), 'false') = 'true' then
    return old;
  end if;

  if tg_op = 'DELETE' then
    select e.status into v_status
    from public.enrollments e
    where e.id = old.enrollment_id
    for update;
  else
    if tg_op = 'UPDATE' then
      if new.enrollment_id is distinct from old.enrollment_id then
        raise exception 'An enrollment subject cannot be moved to another enrollment.'
          using errcode = '55000';
      end if;
      select e.status into v_status
      from public.enrollments e
      where e.id = old.enrollment_id
      for update;
      if v_status is distinct from 'PENDING' then
        raise exception 'Enrollment subjects may only be changed while the enrollment is pending.'
          using errcode = '55000';
      end if;
    end if;
    select e.status into v_status
    from public.enrollments e
    where e.id = new.enrollment_id
    for update;
  end if;

  if v_status is distinct from 'PENDING' then
    raise exception 'Enrollment subjects may only be changed while the enrollment is pending.'
      using errcode = '55000';
  end if;

  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

revoke all on function private.guard_enrollment_subject_mutation() from public, anon, authenticated;

drop trigger if exists guard_enrollment_subject_mutation on public.enrollment_subjects;
create trigger guard_enrollment_subject_mutation
before insert or update or delete on public.enrollment_subjects
for each row execute function private.guard_enrollment_subject_mutation();

create or replace function public.registrar_create_irregular_enrollment(
  p_student_id uuid,
  p_course_offering_ids uuid[]
)
returns table (outcome text, enrollment_id uuid, subject_count integer)
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  v_student public.students%rowtype;
  v_academic_year text;
  v_semester text;
  v_enrollment_id uuid;
  v_count integer;
  v_total_units integer;
begin
  if auth.uid() is null or not private.has_registrar_access() then
    return query select 'unauthorized'::text, null::uuid, 0;
    return;
  end if;

  if p_student_id is null
    or p_course_offering_ids is null
    or cardinality(p_course_offering_ids) < 1
    or cardinality(p_course_offering_ids) > 100
    or array_position(p_course_offering_ids, null) is not null
    or cardinality(p_course_offering_ids) <> (select count(distinct id) from unnest(p_course_offering_ids) as ids(id)) then
    return query select 'invalid_request'::text, null::uuid, 0;
    return;
  end if;

  select s.* into v_student
  from public.students s
  where s.id = p_student_id
  for update;

  if not found then
    return query select 'student_not_found'::text, null::uuid, 0;
    return;
  end if;
  if v_student.student_type <> 'Irregular Student' then
    return query select 'registrar_managed_load_required'::text, null::uuid, 0;
    return;
  end if;

  select et.academic_year, et.semester
  into v_academic_year, v_semester
  from public.enrollment_terms et
  where et.is_active = true
  limit 1;

  if not found or v_academic_year is null or v_semester is null then
    return query select 'term_unavailable'::text, null::uuid, 0;
    return;
  end if;

  if exists (
    select 1 from public.enrollments e
    where e.student_id = v_student.id
      and e.academic_year = v_academic_year
      and e.semester = v_semester
  ) then
    return query select 'duplicate'::text, null::uuid, 0;
    return;
  end if;

  perform pg_advisory_xact_lock_shared(hashtextextended('pkm.standard-load-configuration', 0));

  select count(*)::integer, coalesce(sum(co.units), 0)::integer
  into v_count, v_total_units
  from public.course_offerings co
  where co.id = any(p_course_offering_ids)
    and co.program_id = v_student.program_id
    and co.academic_year = v_academic_year
    and co.semester = v_semester
    and nullif(btrim(co.course_code), '') is not null
    and nullif(btrim(co.course_description), '') is not null
    and co.units between 1 and 30;

  if v_count <> cardinality(p_course_offering_ids)
    or v_total_units < 1
    or v_total_units > 60
    or exists (
      select 1 from public.course_offerings co
      where co.id = any(p_course_offering_ids)
      group by upper(btrim(co.course_code))
      having count(*) > 1
    ) then
    return query select 'invalid_enrollment_load'::text, null::uuid, 0;
    return;
  end if;

  insert into public.enrollments (
    student_id, program_id, year_level, academic_year, semester, status
  )
  values (
    v_student.id, v_student.program_id, v_student.year_level,
    v_academic_year, v_semester, 'PENDING'
  )
  returning id into v_enrollment_id;

  insert into public.enrollment_subjects (
    enrollment_id, subject_id, course_offering_id,
    course_code, course_description, units
  )
  select
    v_enrollment_id, null, co.id,
    co.course_code, co.course_description, co.units
  from public.course_offerings co
  where co.id = any(p_course_offering_ids);

  perform private.reconcile_health_requirement_for_student(v_student.id);
  perform private.sync_student_enrollment_status(v_student.id);
  insert into public.audit_logs (actor_profile_id, action, target_table, target_id)
  values (auth.uid(), 'CREATE_IRREGULAR_ENROLLMENT', 'enrollments', v_enrollment_id);

  return query select 'created'::text, v_enrollment_id, v_count;
end;
$$;

revoke all on function public.registrar_create_irregular_enrollment(uuid, uuid[]) from public, anon;
grant execute on function public.registrar_create_irregular_enrollment(uuid, uuid[]) to authenticated;

drop function if exists public.registrar_set_irregular_enrollment_offerings(uuid, uuid[]);
create or replace function public.registrar_set_irregular_enrollment_offerings(
  p_enrollment_id uuid,
  p_course_offering_ids uuid[],
  p_legacy_subject_ids uuid[] default null
)
returns table (outcome text, enrollment_id uuid, added_count integer, removed_count integer)
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  v_enrollment public.enrollments%rowtype;
  v_student public.students%rowtype;
  v_count integer;
  v_total_units integer;
  v_added integer;
  v_removed integer;
  v_legacy_removed integer;
  v_load_valid boolean;
begin
  if auth.uid() is null or not private.has_registrar_access() then
    return query select 'unauthorized'::text, null::uuid, 0, 0;
    return;
  end if;

  if p_enrollment_id is null
    or p_course_offering_ids is null
    or cardinality(p_course_offering_ids) > 100
    or array_position(p_course_offering_ids, null) is not null
    or cardinality(p_course_offering_ids) <> (select count(distinct id) from unnest(p_course_offering_ids) as ids(id)) then
    return query select 'invalid_request'::text, p_enrollment_id, 0, 0;
    return;
  end if;

  select e.* into v_enrollment
  from public.enrollments e
  where e.id = p_enrollment_id
  for update;

  if not found then
    return query select 'not_found'::text, p_enrollment_id, 0, 0;
    return;
  end if;
  if v_enrollment.status <> 'PENDING' then
    return query select 'enrollment_not_pending'::text, v_enrollment.id, 0, 0;
    return;
  end if;

  select s.* into v_student
  from public.students s
  where s.id = v_enrollment.student_id;

  if not found or v_student.student_type <> 'Irregular Student' then
    return query select 'irregular_student_required'::text, v_enrollment.id, 0, 0;
    return;
  end if;

  if p_legacy_subject_ids is not null and (
    cardinality(p_legacy_subject_ids) > 100
    or array_position(p_legacy_subject_ids, null) is not null
    or cardinality(p_legacy_subject_ids) <> (select count(distinct id) from unnest(p_legacy_subject_ids) as ids(id))
    or cardinality(p_legacy_subject_ids) <> (
      select count(*) from public.enrollment_subjects es
      where es.enrollment_id = v_enrollment.id and es.subject_id is not null
        and es.id = any(p_legacy_subject_ids)
    )
  ) then
    return query select 'invalid_request'::text, v_enrollment.id, 0, 0;
    return;
  end if;

  perform pg_advisory_xact_lock_shared(hashtextextended('pkm.standard-load-configuration', 0));

  if exists (
    select 1
    from public.course_offerings co
    where co.id = any(p_course_offering_ids)
      and (
        co.program_id <> v_enrollment.program_id
        or co.academic_year <> v_enrollment.academic_year
        or co.semester <> v_enrollment.semester
        or nullif(btrim(co.course_code), '') is null
        or nullif(btrim(co.course_description), '') is null
        or co.units not between 1 and 30
      )
  ) or (
    select count(*) from public.course_offerings co
    where co.id = any(p_course_offering_ids)
  ) <> cardinality(p_course_offering_ids) then
    return query select 'invalid_course_offering'::text, v_enrollment.id, 0, 0;
    return;
  end if;

  with prospective as (
    select es.course_code, es.course_description, es.units
    from public.enrollment_subjects es
    where es.enrollment_id = v_enrollment.id
      and es.subject_id is not null
      and (p_legacy_subject_ids is null or es.id = any(p_legacy_subject_ids))
    union all
    select coalesce(existing.course_code, co.course_code),
      coalesce(existing.course_description, co.course_description),
      coalesce(existing.units, co.units)
    from public.course_offerings co
    left join public.enrollment_subjects existing
      on existing.enrollment_id = v_enrollment.id
      and existing.course_offering_id = co.id
    where co.id = any(p_course_offering_ids)
  )
  select count(*)::integer, coalesce(sum(units), 0)::integer,
    bool_and(units between 1 and 30 and nullif(btrim(course_code), '') is not null
      and nullif(btrim(course_description), '') is not null)
  into v_count, v_total_units, v_load_valid
  from prospective;

  if v_count < 1 or v_total_units not between 1 and 60 or v_load_valid is distinct from true
    or exists (
      with prospective as (
        select upper(btrim(es.course_code)) as course_code
        from public.enrollment_subjects es
        where es.enrollment_id = v_enrollment.id
          and es.subject_id is not null
          and (p_legacy_subject_ids is null or es.id = any(p_legacy_subject_ids))
        union all
        select upper(btrim(coalesce(existing.course_code, co.course_code)))
        from public.course_offerings co
        left join public.enrollment_subjects existing
          on existing.enrollment_id = v_enrollment.id
          and existing.course_offering_id = co.id
        where co.id = any(p_course_offering_ids)
      )
      select 1 from prospective
      group by course_code
      having count(*) > 1
    ) then
    return query select 'invalid_enrollment_load'::text, v_enrollment.id, 0, 0;
    return;
  end if;

  delete from public.enrollment_subjects es
  where es.enrollment_id = v_enrollment.id
    and es.course_offering_id is not null
    and not (es.course_offering_id = any(p_course_offering_ids));
  get diagnostics v_removed = row_count;

  if p_legacy_subject_ids is not null then
    delete from public.enrollment_subjects es
    where es.enrollment_id = v_enrollment.id and es.subject_id is not null
      and not (es.id = any(p_legacy_subject_ids));
    get diagnostics v_legacy_removed = row_count;
    v_removed := v_removed + v_legacy_removed;
  end if;

  insert into public.enrollment_subjects (
    enrollment_id, subject_id, course_offering_id,
    course_code, course_description, units
  )
  select
    v_enrollment.id, null, co.id,
    co.course_code, co.course_description, co.units
  from public.course_offerings co
  where co.id = any(p_course_offering_ids)
    and not exists (
      select 1 from public.enrollment_subjects existing
      where existing.enrollment_id = v_enrollment.id
        and existing.course_offering_id = co.id
    );
  get diagnostics v_added = row_count;

  if v_added > 0 or v_removed > 0 then
    insert into public.audit_logs (actor_profile_id, action, target_table, target_id)
    values (auth.uid(), 'UPDATE_IRREGULAR_ENROLLMENT_LOAD', 'enrollments', v_enrollment.id);
  end if;

  return query select
    case when v_added > 0 or v_removed > 0 then 'updated' else 'unchanged' end,
    v_enrollment.id, v_added, v_removed;
end;
$$;

revoke all on function public.registrar_set_irregular_enrollment_offerings(uuid, uuid[], uuid[]) from public, anon;
grant execute on function public.registrar_set_irregular_enrollment_offerings(uuid, uuid[], uuid[]) to authenticated;

create or replace function public.registrar_update_pending_enrollment_schedule(
  p_enrollment_id uuid,
  p_subjects jsonb
)
returns table (outcome text, enrollment_id uuid, updated_subject_count integer)
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  v_enrollment public.enrollments%rowtype;
  v_existing_count integer;
  v_total_units integer;
  v_updated_count integer;
begin
  if auth.uid() is null or not private.has_registrar_access() then
    return query select 'unauthorized'::text, null::uuid, 0;
    return;
  end if;

  if p_enrollment_id is null or p_subjects is null or jsonb_typeof(p_subjects) <> 'array'
    or jsonb_array_length(p_subjects) < 1 or jsonb_array_length(p_subjects) > 100 then
    return query select 'invalid_request'::text, p_enrollment_id, 0;
    return;
  end if;

  if exists (
    select 1 from jsonb_array_elements(p_subjects) item
    where position('|' in coalesce(item->>'day', '')) > 0
      or position(chr(10) in coalesce(item->>'day', '')) > 0
      or position(chr(13) in coalesce(item->>'day', '')) > 0
      or position('|' in coalesce(item->>'time', '')) > 0
      or position(chr(10) in coalesce(item->>'time', '')) > 0
      or position(chr(13) in coalesce(item->>'time', '')) > 0
      or position('|' in coalesce(item->>'room', '')) > 0
      or position(chr(10) in coalesce(item->>'room', '')) > 0
      or position(chr(13) in coalesce(item->>'room', '')) > 0
  ) then
    return query select 'invalid_schedule_text'::text, v_enrollment.id, 0;
    return;
  end if;

  select e.* into v_enrollment
  from public.enrollments e
  where e.id = p_enrollment_id
  for update;

  if not found then
    return query select 'not_found'::text, p_enrollment_id, 0;
    return;
  end if;
  if v_enrollment.status <> 'PENDING' then
    return query select 'enrollment_not_pending'::text, v_enrollment.id, 0;
    return;
  end if;

  select count(*)::integer into v_existing_count
  from public.enrollment_subjects es
  where es.enrollment_id = v_enrollment.id;

  if v_existing_count <> jsonb_array_length(p_subjects)
    or exists (
      select 1
      from jsonb_array_elements(p_subjects) item
      where jsonb_typeof(item) <> 'object'
        or jsonb_typeof(item->'id') <> 'string'
        or coalesce(item->>'id', '') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        or jsonb_typeof(item->'units') <> 'number'
        or case
          when jsonb_typeof(item->'units') = 'number'
            then (item->>'units')::numeric < 1
              or (item->>'units')::numeric > 30
              or trunc((item->>'units')::numeric) <> (item->>'units')::numeric
          else true
        end
        or (item ? 'day' and jsonb_typeof(item->'day') not in ('string', 'null'))
        or (item ? 'time' and jsonb_typeof(item->'time') not in ('string', 'null'))
        or (item ? 'room' and jsonb_typeof(item->'room') not in ('string', 'null'))
        or char_length(coalesce(item->>'day', '')) > 80
        or char_length(coalesce(item->>'time', '')) > 80
        or char_length(coalesce(item->>'room', '')) > 120
    ) then
    return query select 'invalid_enrollment_load'::text, v_enrollment.id, 0;
    return;
  end if;

  if (
      select count(distinct item->>'id')
      from jsonb_array_elements(p_subjects) item
    ) <> jsonb_array_length(p_subjects)
    or exists (
      select 1
      from jsonb_array_elements(p_subjects) item
      left join public.enrollment_subjects es
        on es.id = (item->>'id')::uuid
       and es.enrollment_id = v_enrollment.id
      where es.id is null
    )
    or exists (
      select 1 from public.enrollment_subjects es
      where es.enrollment_id = v_enrollment.id
      group by upper(btrim(es.course_code))
      having count(*) > 1
    ) then
    return query select 'invalid_enrollment_load'::text, v_enrollment.id, 0;
    return;
  end if;

  select coalesce(sum((item->>'units')::integer), 0)::integer into v_total_units
  from jsonb_array_elements(p_subjects) item;

  if v_total_units < 1 or v_total_units > 60 then
    return query select 'invalid_enrollment_load'::text, v_enrollment.id, 0;
    return;
  end if;

  update public.enrollment_subjects es
  set units = (item->>'units')::integer,
      day = nullif(btrim(item->>'day'), ''),
      time = nullif(btrim(item->>'time'), ''),
      room = nullif(btrim(item->>'room'), '')
  from jsonb_array_elements(p_subjects) item
  where es.id = (item->>'id')::uuid
    and es.enrollment_id = v_enrollment.id
    and (
      es.units is distinct from (item->>'units')::integer
      or es.day is distinct from nullif(btrim(item->>'day'), '')
      or es.time is distinct from nullif(btrim(item->>'time'), '')
      or es.room is distinct from nullif(btrim(item->>'room'), '')
    );
  get diagnostics v_updated_count = row_count;

  if v_updated_count > 0 then
    insert into public.audit_logs (actor_profile_id, action, target_table, target_id)
    values (auth.uid(), 'UPDATE_ENROLLMENT_SCHEDULE', 'enrollments', v_enrollment.id);
  end if;

  return query select
    case when v_updated_count > 0 then 'updated' else 'unchanged' end,
    v_enrollment.id, v_updated_count;
end;
$$;

revoke all on function public.registrar_update_pending_enrollment_schedule(uuid, jsonb) from public, anon;
grant execute on function public.registrar_update_pending_enrollment_schedule(uuid, jsonb) to authenticated;

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
      e.registration_pledge_version,
      coalesce(
        (
          select string_agg(
            format('%s|%s|%s', es.course_code, es.course_description, es.units::text),
            chr(10)
            order by es.course_code, es.course_description, es.units
          )
          from public.enrollment_subjects es
          where es.enrollment_id = e.id
        ),
        ''
      ) as subject_material,
      case when exists (
        select 1
        from public.enrollment_subjects es
        where es.enrollment_id = e.id
          and (
            nullif(btrim(es.day), '') is not null
            or nullif(btrim(es.time), '') is not null
            or nullif(btrim(es.room), '') is not null
          )
      ) then (
        select string_agg(
          format(
            '%s|%s|%s|%s|%s|%s',
            es.course_code,
            es.course_description,
            es.units::text,
            coalesce(nullif(btrim(es.day), ''), ''),
            coalesce(nullif(btrim(es.time), ''), ''),
            coalesce(nullif(btrim(es.room), ''), '')
          ),
          chr(10)
          order by es.course_code, es.course_description, es.units,
            coalesce(nullif(btrim(es.day), ''), ''),
            coalesce(nullif(btrim(es.time), ''), ''),
            coalesce(nullif(btrim(es.room), ''), '')
        )
        from public.enrollment_subjects es
        where es.enrollment_id = e.id
      ) else null end as schedule_material,
      coalesce((select sum(es.units) from public.enrollment_subjects es where es.enrollment_id = e.id), 0)::text as total_units
    from public.enrollments e
    where e.id = p_enrollment_id
  ),
  fingerprint_material as (
    select
      case
        when p_signer_role = 'STUDENT'
          and p_clearance_type = 'STUDENT_ENROLLMENT_SIGNATURE'
          and p_document_type = 'ENROLLMENT_REGISTRATION'
          and registration_pledge_version is not null
          and registration_pledge_version <> 'pledge-v1'
          then null
        else format(
          'ENROLLMENT' || chr(10) ||
          'enrollment_id=%s' || chr(10) ||
          'academic_year=%s' || chr(10) ||
          'semester=%s' || chr(10) ||
          'program_id=%s' || chr(10) ||
          'year_level=%s' || chr(10) ||
          'subjects=%s' || chr(10) ||
          'total_units=%s' || chr(10) ||
          'signer_role=%s' || chr(10) ||
          'clearance_type=%s' || chr(10) ||
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
        ) || case
          when schedule_material is not null
          then chr(10) || 'subject_schedules=' || schedule_material
          else ''
        end || case
          when p_signer_role = 'STUDENT'
            and p_clearance_type = 'STUDENT_ENROLLMENT_SIGNATURE'
            and p_document_type = 'ENROLLMENT_REGISTRATION'
            and registration_pledge_version = 'pledge-v1'
          then chr(10) || 'pledge_policy_version=pledge-v1'
          else ''
        end
      end as material
    from enrollment_data
  )
  select encode(extensions.digest(material, 'sha256'), 'hex')
  from fingerprint_material;
$$;

revoke all on function private.enrollment_document_hash(uuid, text, text, text) from public;
