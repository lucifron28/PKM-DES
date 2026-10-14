import { execFileSync } from "node:child_process";
import test from "node:test";

const dbUrl = process.env.PKM_LOCAL_SUPABASE_TEST_DB_URL;
if (!dbUrl) {
  throw new Error("Set PKM_LOCAL_SUPABASE_TEST_DB_URL to an isolated local PostgreSQL database.");
}
const parsedDbUrl = new URL(dbUrl);
if (parsedDbUrl.protocol !== "postgresql:" || parsedDbUrl.hostname !== "127.0.0.1") {
  throw new Error("Integration tests require a local PostgreSQL URL on 127.0.0.1.");
}

test("assigned officials cannot bypass guarded registrar writes through table UPDATE", () => {
  const sql = `
    begin;

    insert into public.programs (id, name, code)
    values ('10000000-0000-4000-8000-000000000019', 'BSAIS', 'BSAIS')
    on conflict (code) do nothing;

    insert into auth.users (
      id, aud, role, email, encrypted_password, raw_app_meta_data, raw_user_meta_data, created_at, updated_at
    ) values (
      '00000000-0000-4000-8000-000000000019', 'authenticated', 'authenticated',
      'assigned.official.dbverify@example.test', 'not-used', '{}'::jsonb, '{}'::jsonb, now(), now()
    );
    insert into public.profiles (id, role, first_name, last_name, email, account_status)
    values (
      '00000000-0000-4000-8000-000000000019', 'admin', 'Assigned', 'Official',
      'assigned.official.dbverify@example.test', 'ACTIVE'
    );
    insert into public.official_role_assignments (profile_id, official_role, program_id, active)
    values ('00000000-0000-4000-8000-000000000019', 'NURSE', null, true);
    insert into public.students (id, profile_id, student_id_number, program_id, year_level, student_type)
    select
      '20000000-0000-4000-8000-000000000019',
      '00000000-0000-4000-8000-000000000019',
      'DBVERIFY-ASSIGNED-OFFICIAL', p.id, '1st Year', 'Old Student'
    from public.programs p where p.code = 'BSAIS';
    insert into public.course_offerings (
      id, program_id, academic_year, semester, year_level,
      course_code, course_description, units, source_document
    )
    select
      '30000000-0000-4000-8000-000000000019', p.id, '2098-2099', '2nd Semester', '1st Year',
      'DBVERIFY-101', 'Database verification course', 3, 'database-verification.xlsx'
    from public.programs p where p.code = 'BSAIS';
    insert into public.standard_load_sets (
      id, program_id, academic_year, semester, year_level, status,
      expected_course_count, expected_total_units, source_document
    )
    select
      '31000000-0000-4000-8000-000000000019', p.id, '2098-2099', '2nd Semester', '1st Year',
      'DRAFT', 1, 3, 'database-verification.xlsx'
    from public.programs p where p.code = 'BSAIS';
    insert into public.enrollments (
      id, student_id, program_id, year_level, academic_year, semester, status
    )
    select
      '40000000-0000-4000-8000-000000000019', s.id, p.id, '1st Year', '2098-2099', '2nd Semester', 'PENDING'
    from public.students s cross join public.programs p
    where s.id = '20000000-0000-4000-8000-000000000019' and p.code = 'BSAIS';
    insert into public.enrollment_subjects (
      id, enrollment_id, subject_id, course_offering_id, course_code, course_description, units
    ) values (
      '50000000-0000-4000-8000-000000000019',
      '40000000-0000-4000-8000-000000000019', null,
      '30000000-0000-4000-8000-000000000019',
      'DBVERIFY-101', 'Database verification course', 3
    );

    set local role authenticated;
    select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000019', true);

    do $verify$
    declare
      v_table text;
      v_table_name text;
      v_affected integer;
      v_bypassed text[] := '{}'::text[];
      v_unguarded_grants text[] := '{}'::text[];
      v_broad_policies text[];
    begin
      if auth.uid() <> '00000000-0000-4000-8000-000000000019'::uuid
        or private.is_admin() is distinct from true
        or private.has_registrar_access() is distinct from false then
        raise exception 'Fixture did not model an assigned official with the shared admin role.';
      end if;

      begin
        update public.enrollments set remarks = 'direct bypass' where id = '40000000-0000-4000-8000-000000000019';
        get diagnostics v_affected = row_count;
        if v_affected <> 0 then v_bypassed := array_append(v_bypassed, 'enrollments'); end if;
      exception when insufficient_privilege then null;
      end;

      begin
        update public.enrollment_subjects set units = units + 1 where id = '50000000-0000-4000-8000-000000000019';
        get diagnostics v_affected = row_count;
        if v_affected <> 0 then v_bypassed := array_append(v_bypassed, 'enrollment_subjects'); end if;
      exception when insufficient_privilege then null;
      end;

      begin
        update public.course_offerings set course_description = 'direct bypass'
        where id = '30000000-0000-4000-8000-000000000019';
        get diagnostics v_affected = row_count;
        if v_affected <> 0 then v_bypassed := array_append(v_bypassed, 'course_offerings'); end if;
      exception when insufficient_privilege then null;
      end;

      begin
        update public.standard_load_sets set source_document = 'direct bypass'
        where id = '31000000-0000-4000-8000-000000000019';
        get diagnostics v_affected = row_count;
        if v_affected <> 0 then v_bypassed := array_append(v_bypassed, 'standard_load_sets'); end if;
      exception when insufficient_privilege then null;
      end;

      foreach v_table in array array[
        'public.enrollments',
        'public.enrollment_subjects',
        'public.course_offerings',
        'public.standard_load_sets'
      ] loop
        v_table_name := split_part(v_table, '.', 2);
        if not (select c.relrowsecurity from pg_class c where c.oid = v_table::regclass) then
          raise exception 'RLS is disabled on %.', v_table;
        end if;
        if has_table_privilege(current_user, v_table, 'UPDATE')
          or has_any_column_privilege(current_user, v_table, 'UPDATE') then
          if not exists (
            select 1 from pg_policies p
            where p.schemaname = 'public'
              and p.tablename = v_table_name
              and p.cmd in ('UPDATE', 'ALL')
              and p.roles && array['authenticated'::name, 'public'::name]
              and coalesce(p.qual, '') ~* 'has_registrar_access\\s*\\('
              and (p.with_check is null or p.with_check ~* 'has_registrar_access\\s*\\(')
          ) then
            v_unguarded_grants := array_append(v_unguarded_grants, v_table_name);
          end if;
        end if;
      end loop;

      select array_agg(distinct p.tablename order by p.tablename)
      into v_broad_policies
      from pg_policies p
      where p.schemaname = 'public'
        and p.tablename in ('enrollments', 'enrollment_subjects', 'course_offerings', 'standard_load_sets')
        and p.cmd in ('UPDATE', 'ALL')
        and p.roles && array['authenticated'::name, 'public'::name]
        and (
          coalesce(p.qual, '') !~* 'has_registrar_access\\s*\\('
          or (p.with_check is not null and p.with_check !~* 'has_registrar_access\\s*\\(')
        );

      if coalesce(cardinality(v_bypassed), 0) > 0
        or coalesce(cardinality(v_unguarded_grants), 0) > 0
        or coalesce(cardinality(v_broad_policies), 0) > 0 then
        raise exception 'Assigned official direct UPDATE bypass detected. Rows changed: %. UPDATE grants without Registrar guard: %. Unguarded policies: %.',
          coalesce(array_to_string(v_bypassed, ', '), 'none'),
          coalesce(array_to_string(v_unguarded_grants, ', '), 'none'),
          coalesce(array_to_string(v_broad_policies, ', '), 'none');
      end if;
    end;
    $verify$;

    rollback;
  `;

  execFileSync("psql", [dbUrl, "-X", "-v", "ON_ERROR_STOP=1", "-q", "-c", sql], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
});
