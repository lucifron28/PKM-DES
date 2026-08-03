-- Secure the multi-program standard-load data path.
--
-- The application reads standard_load_sets and course_offerings through the
-- Supabase Data API. Keep table grants explicit and use RLS for row-level
-- authorization.

revoke all on table public.standard_load_sets from public, anon;
grant select, insert, update, delete on table public.standard_load_sets to authenticated;
grant select on table public.standard_load_sets to service_role;

revoke all on table public.course_offerings from public, anon;
grant select on table public.course_offerings to authenticated, service_role;

revoke all on table public.enrollment_terms from public, anon;
grant select on table public.enrollment_terms to authenticated, service_role;

drop trigger if exists set_standard_load_sets_updated_at on public.standard_load_sets;
create trigger set_standard_load_sets_updated_at
before update on public.standard_load_sets
for each row execute function public.set_updated_at();

-- Serialize standard-load and active-term changes with standard-load
-- submissions. The transaction lock prevents validation and attachment from
-- observing different configuration states during one enrollment request.
create or replace function private.lock_standard_load_configuration()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, pg_temp
as $$
begin
  perform pg_advisory_xact_lock(
    pg_catalog.hashtextextended('pkm.standard-load-configuration', 0::bigint)
  );

  if tg_op = 'DELETE' then
    return old;
  end if;

  return new;
end;
$$;

revoke all on function private.lock_standard_load_configuration() from public;
grant execute on function private.lock_standard_load_configuration() to authenticated, service_role;

drop trigger if exists lock_standard_load_sets_configuration on public.standard_load_sets;
create trigger lock_standard_load_sets_configuration
before insert or update or delete on public.standard_load_sets
for each row execute function private.lock_standard_load_configuration();

drop trigger if exists lock_course_offerings_configuration on public.course_offerings;
create trigger lock_course_offerings_configuration
before insert or update or delete on public.course_offerings
for each row execute function private.lock_standard_load_configuration();

drop trigger if exists lock_enrollment_terms_configuration on public.enrollment_terms;
create trigger lock_enrollment_terms_configuration
before insert or update or delete on public.enrollment_terms
for each row execute function private.lock_standard_load_configuration();

-- Keep the existing implementation private. The public wrapper below acquires
-- the configuration lock before the implementation reads its term, load-set,
-- and offering rows.
alter function public.submit_standard_student_enrollment(text, text)
  rename to submit_standard_student_enrollment_unlocked;

alter function public.submit_standard_student_enrollment_unlocked(text, text)
  set schema private;

revoke all on function private.submit_standard_student_enrollment_unlocked(text, text) from public;
revoke execute on function private.submit_standard_student_enrollment_unlocked(text, text) from anon, authenticated;

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

  perform pg_advisory_xact_lock(
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
