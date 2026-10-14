import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import test from 'node:test';

const dbUrl = process.env.PKM_LOCAL_SUPABASE_TEST_DB_URL;
if (!dbUrl || new URL(dbUrl).hostname !== '127.0.0.1') throw new Error('Use an isolated loopback PostgreSQL database.');

test('irregular load selection removes only omitted legacy rows and preserves retained snapshots', () => {
  const registrar = randomUUID(), nurse = randomUUID(), owner = randomUUID(), other = randomUUID();
  const student = randomUUID(), regularStudent = randomUUID(), enrollment = randomUUID(), unrelatedEnrollment = randomUUID();
  const legacyKeep = randomUUID(), legacyDrop = randomUUID(), unrelatedLegacy = randomUUID();
  const masters = [randomUUID(), randomUUID(), randomUUID()];
  const offers = [randomUUID(), randomUUID(), randomUUID(), randomUUID(), randomUUID()];
  const offeringKeep = randomUUID(), offeringDrop = randomUUID();
  const suffix = randomUUID().slice(0, 8);
  const as = id => `set local role authenticated; select set_config('request.jwt.claim.sub','${id}',true);`;
  const selectedOffers = ids => `array[${ids.map(id => `'${id}'`).join(',')}]::uuid[]`;
  const call = (ids, legacyIds) => `public.registrar_set_irregular_enrollment_offerings('${enrollment}',${selectedOffers(ids)}${legacyIds === undefined ? '' : `,${selectedOffers(legacyIds)}`})`;
  const snapshot = `(select jsonb_agg(to_jsonb(es) order by es.id) from public.enrollment_subjects es where enrollment_id='${enrollment}')`;
  const unchanged = `if ${snapshot} is distinct from current_setting('pkm.fixture.load_snapshot')::jsonb then raise exception 'denied request changed enrollment subjects'; end if;`;
  const sql = `begin;
    ${[[registrar,'admin'],[nurse,'admin'],[owner,'student'],[other,'student']].map(([id, role]) => `insert into auth.users(id,email) values('${id}','${id}@example.test'); insert into public.profiles(id,role,first_name,last_name,email,account_status) values('${id}','${role}','Legacy','Fixture','${id}@example.test','ACTIVE');`).join('\n')}
    insert into public.official_role_assignments(profile_id,official_role,active) values('${nurse}','NURSE',true);
    insert into public.students(id,profile_id,student_id_number,program_id,year_level,student_type)
    select '${student}','${owner}','LEGACY-${suffix}',id,'1st Year','Irregular Student' from public.programs where code='BSAIS';
    insert into public.students(id,profile_id,student_id_number,program_id,year_level,student_type)
    select '${regularStudent}','${other}','REGULAR-${suffix}',id,'1st Year','Old Student' from public.programs where code='BSAIS';
    insert into public.enrollments(id,student_id,program_id,year_level,academic_year,semester)
    select '${enrollment}','${student}',id,'1st Year','2098-2099','2nd Semester' from public.programs where code='BSAIS';
    insert into public.enrollments(id,student_id,program_id,year_level,academic_year,semester)
    select '${unrelatedEnrollment}','${regularStudent}',id,'1st Year','2098-2099','2nd Semester' from public.programs where code='BSAIS';
    ${masters.map((id, index) => `insert into public.subjects(id,program_id,course_code,course_description,units,year_level,semester) select '${id}',id,'MASTER-${suffix}-${index}','Master description',3,'1st Year','2nd Semester' from public.programs where code='BSAIS';`).join('\n')}
    ${offers.map((id, index) => `insert into public.course_offerings(id,program_id,academic_year,semester,year_level,course_code,course_description,units,source_document) select '${id}',id,'2098-2099','2nd Semester','1st Year','OFFER-${suffix}-${index}','Offering description',${index >= 3 ? 30 : 3},'Fixture catalog' from public.programs where code='BSAIS';`).join('\n')}
    insert into public.enrollment_subjects(id,enrollment_id,subject_id,course_code,course_description,units,day,time,room) values
      ('${legacyKeep}','${enrollment}','${masters[0]}','LEGACY-${suffix}-KEEP','Snapshot & legacy retained',2,' M/W ',' 09:00 ','Room & 101'),
      ('${legacyDrop}','${enrollment}','${masters[1]}','LEGACY-${suffix}-DROP','Snapshot legacy omitted',3,'Friday','11:00','Lab 2'),
      ('${unrelatedLegacy}','${unrelatedEnrollment}','${masters[2]}','UNRELATED-${suffix}','Unrelated legacy',3,null,null,null);
    insert into public.enrollment_subjects(id,enrollment_id,course_offering_id,course_code,course_description,units,day,time,room) values
      ('${offeringKeep}','${enrollment}','${offers[0]}','OFFER-${suffix}-0','Retained offering snapshot differs from source',4,' T/Th ',' 14:00 ','Room & 202'),
      ('${offeringDrop}','${enrollment}','${offers[1]}','OFFER-${suffix}-1','Omitted offering snapshot',3,null,null,null);
    select set_config('pkm.fixture.legacy_keep',(select to_jsonb(es)::text from public.enrollment_subjects es where id='${legacyKeep}'),true);
    select set_config('pkm.fixture.offering_keep',(select to_jsonb(es)::text from public.enrollment_subjects es where id='${offeringKeep}'),true);
    do $$ begin
      if (select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='registrar_set_irregular_enrollment_offerings') <> 1 then raise exception 'ambiguous irregular-load overloads'; end if;
      if to_regprocedure('public.registrar_set_irregular_enrollment_offerings(uuid,uuid[],uuid[])') is null then raise exception 'new optional legacy signature missing'; end if;
    end $$;
    ${as(registrar)}
    do $$ declare result record; begin
      select * into result from ${call([offers[0]])};
      if result.outcome <> 'updated' or result.removed_count <> 1 or result.added_count <> 0 then raise exception 'default legacy-preserving call returned %',row_to_json(result); end if;
      if (select count(*) from public.enrollment_subjects where id in ('${legacyKeep}','${legacyDrop}')) <> 2 then raise exception 'old two-argument call removed legacy snapshots'; end if;
      select * into result from ${call([offers[0], offers[2]], [legacyKeep])};
      if result.outcome <> 'updated' or result.removed_count <> 1 or result.added_count <> 1 then raise exception 'explicit legacy selection returned %',row_to_json(result); end if;
      if exists(select 1 from public.enrollment_subjects where id in ('${legacyDrop}','${offeringDrop}')) then raise exception 'omitted owned pending rows remain'; end if;
      if not exists(select 1 from public.enrollment_subjects where id='${unrelatedLegacy}') then raise exception 'selection removed unrelated legacy'; end if;
      if (select count(*) from public.enrollment_subjects where enrollment_id='${enrollment}') <> 3 then raise exception 'selection returned wrong combined load'; end if;
      if (select to_jsonb(es) from public.enrollment_subjects es where id='${legacyKeep}') is distinct from current_setting('pkm.fixture.legacy_keep')::jsonb
        or (select to_jsonb(es) from public.enrollment_subjects es where id='${offeringKeep}') is distinct from current_setting('pkm.fixture.offering_keep')::jsonb then raise exception 'retained source IDs, snapshot fields, or schedules changed'; end if;
    end $$;
    reset role; select set_config('pkm.fixture.load_snapshot',${snapshot}::text,true);
    ${as(nurse)}
    do $$ begin if (select outcome from ${call([offers[0]], [])}) <> 'unauthorized' then raise exception 'assigned Nurse edited irregular load'; end if; ${unchanged} end $$;
    ${as(other)}
    do $$ begin if (select outcome from ${call([offers[0]], [])}) <> 'unauthorized' then raise exception 'unrelated student edited irregular load'; end if; end $$;
    ${as(registrar)}
    do $$ declare result text; begin
      select outcome into result from ${call([offers[0]], [unrelatedLegacy])};
      if result <> 'invalid_request' or result is null then raise exception 'unrelated legacy ID did not fail closed: %',result; end if;
      ${unchanged}
      if (select outcome from ${call([], [])}) <> 'invalid_enrollment_load' then raise exception 'empty combined load accepted'; end if;
      ${unchanged}
      if (select outcome from ${call([offers[3], offers[4]], [legacyKeep])}) <> 'invalid_enrollment_load' then raise exception 'combined load above 60 units accepted'; end if;
      ${unchanged}
      if (select outcome from public.registrar_set_irregular_enrollment_offerings('${unrelatedEnrollment}',${selectedOffers([offers[0]])},'{}'::uuid[])) <> 'irregular_student_required' then raise exception 'regular student load edited'; end if;
    end $$;
    reset role; update public.enrollments set status='APPROVED' where id='${enrollment}';
    ${as(registrar)}
    do $$ begin if (select outcome from ${call([offers[2]], [])}) <> 'enrollment_not_pending' then raise exception 'approved load edited'; end if; ${unchanged} end $$;
    select 'irregular_legacy_removal',count(*),sum(units) from public.enrollment_subjects where enrollment_id='${enrollment}';
    rollback;`;
  const output = execFileSync('psql', [dbUrl, '-X', '-qAt', '-v', 'ON_ERROR_STOP=1', '-c', sql], { encoding: 'utf8' });
  assert.match(output, /irregular_legacy_removal\|3\|9/);
  console.info('Irregular legacy removal SQL passed: default preserves legacy; explicit selection removes only omitted rows; retained snapshot/source/schedule IDs unchanged; denied mutations leave load unchanged.');
});
