-- Student submissions share the configuration lock. Configuration writes use
-- the exclusive form, allowing different students to enroll concurrently while
-- preventing a configuration change between validation and attachment.

create or replace function public.submit_standard_student_enrollment(
  p_academic_year text,
  p_semester text
)
returns table (
  outcome text,
  enrollment_id uuid,
  attached_subject_count integer
)
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
begin
  if auth.uid() is null then
    return query select 'invalid_student_record'::text, null::uuid, 0;
    return;
  end if;

  perform pg_advisory_xact_lock_shared(
    pg_catalog.hashtextextended('pkm.standard-load-configuration', 0::bigint)
  );

  return query
  select *
  from private.submit_standard_student_enrollment_unlocked(
    p_academic_year,
    p_semester
  );
end;
$$;

revoke all on function public.submit_standard_student_enrollment(text, text) from public;
revoke execute on function public.submit_standard_student_enrollment(text, text) from anon;
grant execute on function public.submit_standard_student_enrollment(text, text) to authenticated;
