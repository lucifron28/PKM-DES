import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import test from 'node:test';
import { computeEnrollmentDocumentHash } from '../../lib/signatures/fingerprint';

const url = process.env.PKM_LOCAL_SUPABASE_TEST_DB_URL;
if (!url || new URL(url).hostname !== '127.0.0.1') throw new Error('An isolated loopback PostgreSQL URL is required.');

function run(sql: string) {
  return execFileSync('psql', [url!, '-X', '-qAt', '-F', '\t', '-v', 'ON_ERROR_STOP=1', '-c', sql], { encoding: 'utf8' });
}

function fixture() {
  const student = randomUUID(), owner = randomUUID(), accountant = randomUUID(), nurse = randomUUID(), other = randomUUID(), registrar = randomUUID(), enrollment = randomUUID();
  const identities = [[owner, 'student'], [other, 'student'], [accountant, 'admin'], [nurse, 'admin'], [registrar, 'admin']];
  const setup = `begin;
    ${identities.map(([id, role]) => `insert into auth.users(id,email) values('${id}','${id}@example.test');
      insert into public.profiles(id,role,first_name,last_name,email,account_status) values('${id}','${role}','Finance','Fixture','${id}@example.test','ACTIVE');`).join('\n')}
    insert into public.official_role_assignments(profile_id,official_role,active) values('${accountant}','ACCOUNTANT',true),('${nurse}','NURSE',true);
    insert into public.students(id,profile_id,student_id_number,program_id,year_level,student_type)
    select '${student}','${owner}','FIN-${student}',id,'1st Year','Old Student' from public.programs where code='BSAIS';
    insert into public.enrollments(id,student_id,program_id,year_level,academic_year,semester,registration_pledge_version)
    select '${enrollment}','${student}',id,'1st Year','2098-2099','2nd Semester','pledge-v1' from public.programs where code='BSAIS';`;
  const as = (id: string) => `set local role authenticated; select set_config('request.jwt.claim.sub','${id}',true);`;
  const evidence = (label: string) => `select '${label}',public.get_enrollment_financial_summary('${enrollment}');`;
  const hashes = (label: string) => `reset role; select '${label}',jsonb_build_object(
    'version',(select financial_document_version from public.enrollments where id='${enrollment}'),
    'accountant',private.enrollment_document_hash('${enrollment}','ACCOUNTANT','ACCOUNTING_CLEARANCE','ENROLLMENT_CLEARANCE'),
    'nurse',private.enrollment_document_hash('${enrollment}','NURSE','HEALTH_CLEARANCE','ENROLLMENT_CLEARANCE'),
    'student',private.enrollment_document_hash('${enrollment}','STUDENT','STUDENT_ENROLLMENT_SIGNATURE','ENROLLMENT_REGISTRATION'),
    'enrollment',(select to_jsonb(e) from public.enrollments e where id='${enrollment}'));`;
  return { student, owner, accountant, nurse, other, registrar, enrollment, setup, as, evidence, hashes };
}

test('P4 finance roles, decimal receipts, immutable history and Accounting signature versions', () => {
  const f = fixture();
  const signature = randomUUID(), nurseSignature = randomUUID(), renewedSignature = randomUUID();
  const sql = `${f.setup}
    ${f.hashes('legacy')}
    ${f.as(f.owner)} ${f.evidence('unassessed')}
    do $$ begin
      if (select outcome from public.accountant_save_enrollment_assessment('${f.enrollment}',array['TUITION_FEE'])) <> 'unauthorized' then raise exception 'student assessed finances'; end if;
      if (select outcome from public.accountant_record_enrollment_payment('${f.enrollment}',1,'denied')) <> 'unauthorized' then raise exception 'student recorded a payment'; end if;
    end $$;
    ${f.as(f.other)}
    do $$ begin
      begin perform public.get_enrollment_financial_summary('${f.enrollment}'); raise exception 'unrelated student read finances'; exception when insufficient_privilege then null; end;
    end $$;
    ${f.as(f.nurse)}
    do $$ begin
      if (select outcome from public.accountant_configure_fee('TUITION_FEE',19.99,true)) <> 'unauthorized' then raise exception 'Nurse configured fees'; end if;
      if (select outcome from public.accountant_save_enrollment_assessment('${f.enrollment}',array['TUITION_FEE'])) <> 'unauthorized' then raise exception 'Nurse assessed finances'; end if;
      begin perform public.get_enrollment_financial_summary('${f.enrollment}'); raise exception 'Nurse read finances'; exception when insufficient_privilege then null; end;
    end $$;
    reset role;
    select set_config('pkm.fixture.accountant_hash',private.enrollment_document_hash('${f.enrollment}','ACCOUNTANT','ACCOUNTING_CLEARANCE','ENROLLMENT_CLEARANCE'),true);
    select set_config('pkm.fixture.nurse_hash',private.enrollment_document_hash('${f.enrollment}','NURSE','HEALTH_CLEARANCE','ENROLLMENT_CLEARANCE'),true);
    ${f.as(f.nurse)}
    do $$ begin
      if (select outcome from public.record_standard_nurse_health_clearance_signature('${f.enrollment}','${nurseSignature}','${f.enrollment}/NURSE/${nurseSignature}.png',repeat('a',64),current_setting('pkm.fixture.nurse_hash'))) <> 'signed' then raise exception 'Nurse fixture did not sign'; end if;
    end $$;
    ${f.as(f.accountant)}
    do $$ begin
      if (select outcome from public.record_official_clearance_signature('${f.enrollment}','ACCOUNTING_CLEARANCE','${signature}','${f.enrollment}/ACCOUNTANT/${signature}.png',repeat('b',64),current_setting('pkm.fixture.accountant_hash'))) <> 'signed' then raise exception 'Accountant fixture did not sign'; end if;
      if (select outcome from public.accountant_configure_fee('TUITION_FEE',19.999,true)) <> 'invalid_request' then raise exception 'three-decimal fee accepted'; end if;
      if (select outcome from public.accountant_configure_fee('TUITION_FEE',19.99,true)) <> 'updated' then raise exception '19.99 fee rejected'; end if;
      if (select outcome from public.accountant_record_enrollment_payment('${f.enrollment}',1,'before assessment')) <> 'assessment_required' then raise exception 'payment without assessment accepted'; end if;
      if (select outcome from public.accountant_save_enrollment_assessment('${f.enrollment}',array['TUITION_FEE','TUITION_FEE'])) <> 'invalid_request' then raise exception 'duplicate fee accepted'; end if;
      if (select outcome from public.accountant_save_enrollment_assessment('${f.enrollment}',array['TUITION_FEE'])) <> 'assessed' then raise exception 'assessment rejected'; end if;
    end $$;
    ${f.evidence('unpaid')} ${f.hashes('assessed_hash')}
    do $$ begin
      if (select status from public.enrollment_clearances where enrollment_id='${f.enrollment}' and clearance_type='ACCOUNTING_CLEARANCE') <> 'INVALIDATED' then raise exception 'old Accounting signature remained current after assessment'; end if;
      if (select status from public.enrollment_clearances where enrollment_id='${f.enrollment}' and clearance_type='HEALTH_CLEARANCE') <> 'SIGNED' then raise exception 'assessment invalidated Nurse'; end if;
      if not exists(select 1 from public.enrollment_signatures where id='${signature}') then raise exception 'assessment deleted signature history'; end if;
    end $$;
    select set_config('pkm.fixture.accountant_hash',private.enrollment_document_hash('${f.enrollment}','ACCOUNTANT','ACCOUNTING_CLEARANCE','ENROLLMENT_CLEARANCE'),true);
    ${f.as(f.accountant)}
    do $$ begin
      if (select outcome from public.record_official_clearance_signature('${f.enrollment}','ACCOUNTING_CLEARANCE','${renewedSignature}','${f.enrollment}/ACCOUNTANT/${renewedSignature}.png',repeat('b',64),current_setting('pkm.fixture.accountant_hash'))) <> 'signed' then raise exception 'current Accountant signature rejected'; end if;
      if (select outcome from public.accountant_record_enrollment_payment('${f.enrollment}',0.001,'bad decimal')) <> 'invalid_request' then raise exception 'fractional cent accepted'; end if;
      if (select outcome from public.accountant_record_enrollment_payment('${f.enrollment}',5.55,' Receipt A ')) <> 'recorded' then raise exception 'partial payment rejected'; end if;
    end $$;
    ${f.evidence('partial')} ${f.hashes('partial_hash')}
    do $$ begin
      if (select status from public.enrollment_clearances where enrollment_id='${f.enrollment}' and clearance_type='ACCOUNTING_CLEARANCE') <> 'INVALIDATED' then raise exception 'payment retained current Accounting signature'; end if;
      if (select status from public.enrollment_clearances where enrollment_id='${f.enrollment}' and clearance_type='HEALTH_CLEARANCE') <> 'SIGNED' then raise exception 'payment invalidated Nurse'; end if;
      if (select count(*) from public.enrollment_signatures where id in ('${signature}','${renewedSignature}')) <> 2 then raise exception 'payment lost signature history'; end if;
    end $$;
    ${f.as(f.accountant)}
    do $$ begin
      if (select outcome from public.accountant_record_enrollment_payment('${f.enrollment}',14.44,'Receipt B')) <> 'recorded' then raise exception 'final payment rejected'; end if;
      begin select * from public.enrollment_financial_payments; raise exception 'authenticated direct history read allowed'; exception when insufficient_privilege then null; end;
      begin delete from public.enrollment_financial_assessments where enrollment_id='${f.enrollment}'; raise exception 'authenticated deleted history'; exception when insufficient_privilege then null; end;
    end $$;
    ${f.evidence('paid')} ${f.hashes('paid_hash')}
    do $$ begin
      begin update public.enrollment_financial_payments set amount=1 where enrollment_id='${f.enrollment}'; raise exception 'owner rewrote receipt'; exception when insufficient_privilege then null; end;
      begin delete from public.enrollment_financial_assessments where enrollment_id='${f.enrollment}'; raise exception 'owner deleted assessment'; exception when insufficient_privilege then null; end;
    end $$;
    update public.enrollments set status='APPROVED' where id='${f.enrollment}';
    ${f.as(f.accountant)}
    do $$ begin
      if (select outcome from public.accountant_save_enrollment_assessment('${f.enrollment}',array['TUITION_FEE'])) <> 'not_editable' then raise exception 'approved assessment accepted'; end if;
      if (select outcome from public.accountant_record_enrollment_payment('${f.enrollment}',1,'approved')) <> 'not_editable' then raise exception 'approved payment accepted'; end if;
      if (select outcome from public.accountant_configure_fee('TUITION_FEE',29.99,true)) <> 'updated' then raise exception 'catalog update failed'; end if;
    end $$;
    ${f.evidence('approved')} ${f.hashes('approved_hash')}
    ${f.as(f.owner)} ${f.evidence('own_read')}
    ${f.as(f.registrar)} ${f.evidence('registrar_read')}
    rollback;`;
  const output = run(sql);
  const rows = new Map(output.split(/\r?\n/).filter(line => line.includes('\t{')).map(line => { const [label, value] = line.split('\t'); return [label, JSON.parse(value)]; }));
  console.info('Finance SQL evidence', JSON.stringify(Object.fromEntries(rows)));
  assert.equal(rows.get('unassessed').payment_status, 'UNASSESSED');
  assert.equal(rows.get('unassessed').assessed_amount, null);
  assert.equal(rows.get('unpaid').payment_status, 'UNPAID');
  assert.equal(rows.get('unpaid').assessed_amount, 19.99);
  assert.equal(rows.get('unpaid').paid_amount, null);
  assert.equal(rows.get('partial').payment_status, 'PARTIAL');
  assert.equal(rows.get('partial').balance_due, 14.44);
  assert.equal(rows.get('paid').payment_status, 'PAID');
  assert.equal(rows.get('paid').balance_due, 0);
  assert.equal(rows.get('paid').paid_amount, 19.99);
  assert.equal(rows.get('paid').payment_receipts.length, 2);
  assert.ok(rows.get('paid').payment_receipts.some((receipt: { reference: string; amount: number; payment_id: string; paid_at: string }) => receipt.reference === 'Receipt A' && receipt.amount === 5.55 && receipt.payment_id && receipt.paid_at));
  assert.deepEqual(rows.get('approved'), rows.get('paid'));
  assert.deepEqual(rows.get('own_read'), rows.get('paid'));
  assert.deepEqual(rows.get('registrar_read'), rows.get('paid'));
  const baseline = rows.get('legacy');
  for (const [label, version] of [['legacy', null], ['assessed_hash', 1], ['partial_hash', 2], ['paid_hash', 3], ['approved_hash', 3]] as const) {
    const row = rows.get(label);
    assert.equal(row.version, version);
    assert.equal(row.accountant, computeEnrollmentDocumentHash(row.enrollment, 'ACCOUNTANT', 'ACCOUNTING_CLEARANCE', 'ENROLLMENT_CLEARANCE'));
    assert.equal(row.nurse, baseline.nurse);
    assert.equal(row.student, baseline.student);
    if (version) assert.notEqual(row.accountant, baseline.accountant);
  }
  assert.equal(rows.get('approved_hash').accountant, rows.get('paid_hash').accountant);
});
