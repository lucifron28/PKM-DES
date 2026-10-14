import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import test from 'node:test';
import { computeEnrollmentDocumentHash, computeHealthRecordDocumentHash } from '../../lib/signatures/fingerprint';

const url = process.env.PKM_LOCAL_SUPABASE_TEST_DB_URL;
if (!url || new URL(url).hostname !== '127.0.0.1') throw new Error('An isolated loopback PostgreSQL URL is required.');

for (const special of [false, true]) {
  test(`medical PDF metadata revision authorizes owner/Nurse and invalidates ${special ? 'form' : 'standard'} Nurse signatures`, () => {
    const owner = randomUUID(), nurse = randomUUID(), other = randomUUID(), librarian = randomUUID(), student = randomUUID(), enrollment = randomUUID();
    const number = `MED-${student}`;
    const firstPath = `${enrollment}/${owner}/${randomUUID()}.pdf`, secondPath = `${enrollment}/${owner}/${randomUUID()}.pdf`, approvedPath = `${enrollment}/${owner}/${randomUUID()}.pdf`;
    const firstSignature = randomUUID(), secondSignature = randomUUID(), deniedSignature = randomUUID(), librarySignature = randomUUID();
    const as = (id: string) => `set local role authenticated; select set_config('request.jwt.claim.sub','${id}',true);`;
    const hashExpression = special
      ? `private.health_record_document_hash('${enrollment}','${student}','2098-2099','2nd Semester','APPLICABLE','VERIFIED')`
      : `private.enrollment_document_hash('${enrollment}','NURSE','HEALTH_CLEARANCE','ENROLLMENT_CLEARANCE')`;
    const sign = (signature: string, hash: string) => special
      ? `public.verify_health_requirement_with_signature('${enrollment}','${signature}','${enrollment}/NURSE/${signature}.png',repeat('a',64),${hash},true,'Reviewed form')`
      : `public.record_standard_nurse_health_clearance_signature('${enrollment}','${signature}','${enrollment}/NURSE/${signature}.png',repeat('a',64),${hash})`;
    const upload = (path: string) => `public.record_student_medical_document_upload('${enrollment}','${path}','supporting-paper.pdf','application/pdf',123,repeat('b',64))`;
    const object = (path: string) => `insert into storage.objects(bucket_id,name,owner_id,metadata) values('enrollment-medical-documents','${path}','${owner}',jsonb_build_object('mimetype','application/pdf','size',123));`;
    const evidence = (label: string) => `reset role; select '${label}',jsonb_build_object(
      'enrollment',(select to_jsonb(e) from public.enrollments e where id='${enrollment}'),
      'health',${hashExpression},
      'nurse',private.enrollment_document_hash('${enrollment}','NURSE','HEALTH_CLEARANCE','ENROLLMENT_CLEARANCE'),
      'accountant',private.enrollment_document_hash('${enrollment}','ACCOUNTANT','ACCOUNTING_CLEARANCE','ENROLLMENT_CLEARANCE'),
      'librarian',private.enrollment_document_hash('${enrollment}','LIBRARIAN','LIBRARY_CLEARANCE','ENROLLMENT_CLEARANCE'),
      'student',private.enrollment_document_hash('${enrollment}','STUDENT','STUDENT_ENROLLMENT_SIGNATURE','ENROLLMENT_REGISTRATION'));`;
    const assertInvalidated = `do $$ begin
      if (select status from public.enrollment_clearances where enrollment_id='${enrollment}' and clearance_type='HEALTH_CLEARANCE') <> 'INVALIDATED'
        or private.health_clearance_is_current('${enrollment}') then raise exception 'old Nurse signature remained current'; end if;
      if (select status from public.enrollment_clearances where enrollment_id='${enrollment}' and clearance_type='LIBRARY_CLEARANCE') <> 'SIGNED' then raise exception 'upload invalidated another official'; end if;
    end $$;`;
    const sql = `begin;
      ${[[owner,'student'],[other,'student'],[nurse,'admin'],[librarian,'admin']].map(([id, role]) => `insert into auth.users(id,email) values('${id}','${id}@example.test'); insert into public.profiles(id,role,first_name,last_name,email,account_status) values('${id}','${role}','Medical','Fixture','${id}@example.test','ACTIVE');`).join('\n')}
      insert into public.official_role_assignments(profile_id,official_role,active) values('${nurse}','NURSE',true),('${librarian}','LIBRARIAN',true);
      insert into public.students(id,profile_id,student_id_number,program_id,year_level,student_type)
      select '${student}','${owner}','${number}',id,'1st Year','${special ? 'Incoming 1st Year Student' : 'Old Student'}' from public.programs where code='BSAIS';
      insert into public.official_student_records(student_id_number,first_name,last_name,email,program_id,year_level,student_type,gender_sex,enrollment_status)
      select '${number}','Medical','Fixture','${owner}@example.test',id,'1st Year','${special ? 'Incoming 1st Year Student' : 'Old Student'}','Female','NOT ENROLLED' from public.programs where code='BSAIS';
      insert into public.enrollments(id,student_id,program_id,year_level,academic_year,semester,registration_pledge_version)
      select '${enrollment}','${student}',id,'1st Year','2098-2099','2nd Semester','pledge-v1' from public.programs where code='BSAIS';
      select private.reconcile_health_requirement_for_student('${student}');
      select set_config('pkm.health_applicability_reconciliation','false',true);
      do $$ begin
        if (select public from storage.buckets where id='enrollment-medical-documents') then raise exception 'medical bucket is public'; end if;
        if not (select relrowsecurity from pg_class where oid='storage.objects'::regclass) then raise exception 'Storage scaffold RLS disabled'; end if;
      end $$;
      ${evidence('baseline')}
      select set_config('pkm.fixture.old_medical_hash',${hashExpression},true);
      select set_config('pkm.fixture.library_hash',private.enrollment_document_hash('${enrollment}','LIBRARIAN','LIBRARY_CLEARANCE','ENROLLMENT_CLEARANCE'),true);
      ${as(librarian)}
      do $$ begin if (select outcome from public.record_official_clearance_signature('${enrollment}','LIBRARY_CLEARANCE','${librarySignature}','${enrollment}/LIBRARIAN/${librarySignature}.png',repeat('c',64),current_setting('pkm.fixture.library_hash'))) <> 'signed' then raise exception 'Librarian fixture failed'; end if; end $$;
      ${special ? `${as(owner)} do $$ begin if (select outcome from public.save_health_record_update('${enrollment}','No condition reported',null,null,null,null,null,'None reported',null,null)) <> 'saved' then raise exception 'initial form not saved'; end if; end $$;` : ''}
      ${as(nurse)}
      do $$ begin if (select outcome from ${sign(firstSignature, "current_setting('pkm.fixture.old_medical_hash')")}) <> 'signed' then raise exception 'initial Nurse signature failed'; end if; end $$;
      ${as(other)}
      do $$ begin
        begin ${object(firstPath)} raise exception 'unrelated student uploaded owner object'; exception when insufficient_privilege then null; end;
        if (select outcome from ${upload(firstPath)}) <> 'not_found' then raise exception 'unrelated student registered owner metadata'; end if;
      end $$;
      ${as(owner)} ${object(firstPath)}
      do $$ begin
        if (select outcome from public.record_student_medical_document_upload('${enrollment}','${firstPath}','bad.pdf','application/pdf',124,repeat('b',64))) <> 'invalid_request' then raise exception 'mismatched object metadata accepted'; end if;
        if (select outcome from ${upload(firstPath)}) <> 'saved' then raise exception 'student PDF registration failed'; end if;
        if (select count(*) from public.enrollment_medical_documents where enrollment_id='${enrollment}') <> 1 then raise exception 'owner cannot read metadata'; end if;
        if (select count(*) from storage.objects where name='${firstPath}') <> 1 then raise exception 'owner cannot read object metadata'; end if;
        begin delete from public.enrollment_medical_documents where enrollment_id='${enrollment}'; raise exception 'owner deleted history'; exception when insufficient_privilege then null; end;
      end $$;
      ${evidence('revision1')} ${assertInvalidated}
      ${as(nurse)}
      do $$ begin
        if (select count(*) from public.enrollment_medical_documents where enrollment_id='${enrollment}') <> 1
          or (select count(*) from storage.objects where name='${firstPath}') <> 1 then raise exception 'Nurse cannot read supporting metadata'; end if;
        if (select outcome from ${sign(deniedSignature, "current_setting('pkm.fixture.old_medical_hash')")}) <> 'fingerprint_mismatch' then raise exception 'stale Nurse hash was accepted'; end if;
      end $$;
      ${as(librarian)}
      do $$ begin
        if exists(select 1 from public.enrollment_medical_documents where enrollment_id='${enrollment}')
          or exists(select 1 from storage.objects where name='${firstPath}') then raise exception 'other staff read medical metadata'; end if;
        if (select outcome from ${sign(deniedSignature, "current_setting('pkm.fixture.old_medical_hash')")}) <> 'unauthorized' then raise exception 'other staff reviewed medical paper'; end if;
      end $$;
      ${as(other)}
      do $$ begin if exists(select 1 from public.enrollment_medical_documents where enrollment_id='${enrollment}') or exists(select 1 from storage.objects where name='${firstPath}') then raise exception 'unrelated student read medical metadata'; end if; end $$;
      reset role; select set_config('pkm.fixture.current_medical_hash',${hashExpression},true);
      ${as(nurse)}
      do $$ begin if (select outcome from ${sign(secondSignature, "current_setting('pkm.fixture.current_medical_hash')")}) <> 'signed' then raise exception 'revision Nurse signature failed'; end if; end $$;
      ${as(owner)} ${object(secondPath)}
      do $$ begin if (select outcome from ${upload(secondPath)}) <> 'saved' then raise exception 'PDF resubmission failed'; end if; end $$;
      ${evidence('revision2')} ${assertInvalidated}
      do $$ begin
        if (select count(*) from public.enrollment_signatures where id in ('${firstSignature}','${secondSignature}')) <> 2 then raise exception 'upload deleted Nurse signatures'; end if;
        if exists(select 1 from public.enrollment_signatures where id='${deniedSignature}') then raise exception 'denied review wrote signature'; end if;
        begin delete from public.enrollment_medical_documents where enrollment_id='${enrollment}'; raise exception 'owner role deleted immutable medical history'; exception when SQLSTATE '55000' then null; end;
      end $$;
      update public.enrollments set status='APPROVED' where id='${enrollment}';
      ${as(owner)}
      do $$ begin
        if (select outcome from ${upload(secondPath)}) <> 'not_editable' then raise exception 'approved metadata revision accepted'; end if;
        begin ${object(approvedPath)} raise exception 'approved enrollment accepted supporting object'; exception when insufficient_privilege then null; end;
      end $$;
      ${evidence('approved')} rollback;`;
    const output = execFileSync('psql', [url!, '-X', '-qAt', '-F', '\t', '-v', 'ON_ERROR_STOP=1', '-c', sql], { encoding: 'utf8' });
    const rows = new Map(output.split(/\r?\n/).filter(line => line.includes('\t{')).map(line => { const [label, value] = line.split('\t'); return [label, JSON.parse(value)]; }));
    console.info('Medical SQL metadata evidence', special, JSON.stringify(Object.fromEntries(rows)));
    const baseline = rows.get('baseline');
    for (const [label, version] of [['baseline', null], ['revision1', 1], ['revision2', 2], ['approved', 2]] as const) {
      const row = rows.get(label);
      assert.equal(row.enrollment.medical_document_version, version);
      assert.equal(row.nurse, computeEnrollmentDocumentHash(row.enrollment, 'NURSE', 'HEALTH_CLEARANCE', 'ENROLLMENT_CLEARANCE'));
      const expectedHealth = special ? computeHealthRecordDocumentHash({ enrollmentId: enrollment, studentId: student, academicYear: '2098-2099', semester: '2nd Semester', applicability: 'APPLICABLE', status: 'VERIFIED', medical_document_version: version }) : row.nurse;
      assert.equal(row.health, expectedHealth);
      for (const role of ['accountant', 'librarian', 'student']) assert.equal(row[role], baseline[role]);
      if (version) assert.notEqual(row.health, baseline.health);
    }
    assert.notEqual(rows.get('revision1').health, rows.get('revision2').health);
    assert.equal(rows.get('approved').health, rows.get('revision2').health);
  });
}
