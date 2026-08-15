-- Keep database fingerprint material byte-for-byte aligned with the server
-- implementation. The previous functions used '\n' in standard-conforming
-- PostgreSQL strings, which produced a literal backslash-n instead of a line
-- break and rejected otherwise valid signatures.

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
            chr(10)
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
        'HEALTH_RECORD' || chr(10) ||
        'enrollment_id=%s' || chr(10) ||
        'student_id=%s' || chr(10) ||
        'academic_year=%s' || chr(10) ||
        'semester=%s' || chr(10) ||
        'requirement_code=HEALTH_RECORD_UPDATE' || chr(10) ||
        'applicability=%s' || chr(10) ||
        'status=%s' || chr(10) ||
        'signer_role=NURSE' || chr(10) ||
        'clearance_type=HEALTH_CLEARANCE' || chr(10) ||
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
