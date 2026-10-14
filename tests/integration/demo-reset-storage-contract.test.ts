import assert from 'node:assert/strict';
import test from 'node:test';
import type { SupabaseClient } from '@supabase/supabase-js';
import { resetStudentDemoData } from '../../lib/demo/reset-service';

const report = { student_account_count: 1, student_record_count: 1, official_record_count: 1, enrollment_count: 1, signature_count: 1, requirement_count: 1 };

function sdkFixture(options: { failQuery?: string; failBucket?: string; failRpc?: boolean; missingReport?: boolean; medicalPaths?: string[] } = {}) {
  const calls: Array<{ kind: string; table?: string; column?: string; value?: unknown; bucket?: string; paths?: string[] }> = [];
  const data: Record<string, unknown[]> = {
    profiles: [{ id: 'student-profile' }], students: [{ id: 'student-record' }], enrollments: [{ id: 'student-enrollment' }],
    enrollment_signatures: [{ signature_storage_path: 'student-enrollment/signature.png' }],
    signature_specimens: [{ signature_storage_path: 'student-profile/specimen.png' }],
    enrollment_medical_documents: (options.medicalPaths ?? [' student-enrollment/student-profile/paper.pdf ', 'student-enrollment/student-profile/paper.pdf', '']).map(storage_path => ({ storage_path }))
  };
  const client = {
    from(table: string) {
      return {
        select(column: string) {
          calls.push({ kind: 'select', table, column });
          const result = () => Promise.resolve({ data: data[table], error: options.failQuery === table ? { message: 'fixture lookup failed' } : null });
          return {
            eq(column: string, value: unknown) { calls.push({ kind: 'eq', table, column, value }); return result(); },
            in(column: string, value: unknown) { calls.push({ kind: 'in', table, column, value }); return result(); }
          };
        }
      };
    },
    storage: {
      from(bucket: string) {
        return { async remove(paths: string[]) { calls.push({ kind: 'remove', bucket, paths }); return { data: [], error: options.failBucket === bucket ? { message: 'fixture removal failed' } : null }; } };
      }
    },
    async rpc(name: string) { calls.push({ kind: 'rpc', table: name }); return { data: options.missingReport ? null : [report], error: options.failRpc ? { message: 'fixture SQL failure' } : null }; }
  } as unknown as SupabaseClient;
  return { client, calls };
}

test('mock SDK reset removes all linked student files before SQL and excludes staff lookups', async () => {
  const fixture = sdkFixture();
  assert.deepEqual(await resetStudentDemoData(fixture.client), report);
  assert.ok(fixture.calls.some(call => call.kind === 'eq' && call.table === 'profiles' && call.column === 'role' && call.value === 'student'));
  for (const [table, column, values] of [
    ['students', 'profile_id', ['student-profile']],
    ['enrollments', 'student_id', ['student-record']],
    ['enrollment_medical_documents', 'enrollment_id', ['student-enrollment']],
    ['enrollment_signatures', 'enrollment_id', ['student-enrollment']],
    ['signature_specimens', 'profile_id', ['student-profile']]
  ] as const) assert.ok(fixture.calls.some(call => call.kind === 'in' && call.table === table && call.column === column && JSON.stringify(call.value) === JSON.stringify(values)));
  assert.deepEqual(fixture.calls.filter(call => call.kind === 'remove').map(call => [call.bucket, call.paths]), [
    ['enrollment-medical-documents', ['student-enrollment/student-profile/paper.pdf']],
    ['enrollment-signatures', ['student-enrollment/signature.png']],
    ['signature-specimens', ['student-profile/specimen.png']]
  ]);
  assert.equal(fixture.calls.at(-1)?.kind, 'rpc');
  assert.equal(fixture.calls.at(-1)?.table, 'reset_demo_student_data');
});

test('mock SDK batches medical removal without dropping linked files', async () => {
  const paths = Array.from({ length: 205 }, (_, index) => `student-enrollment/student-profile/${index}.pdf`);
  const fixture = sdkFixture({ medicalPaths: paths });
  await resetStudentDemoData(fixture.client);
  const batches = fixture.calls.filter(call => call.kind === 'remove' && call.bucket === 'enrollment-medical-documents');
  assert.deepEqual(batches.map(call => call.paths?.length), [100, 100, 5]);
  assert.deepEqual(batches.flatMap(call => call.paths ?? []), paths);
});

test('mock SDK lookup or file-removal failure aborts before SQL reset', async () => {
  for (const failQuery of ['profiles', 'students', 'enrollments', 'enrollment_medical_documents', 'enrollment_signatures', 'signature_specimens']) {
    const fixture = sdkFixture({ failQuery });
    await assert.rejects(resetStudentDemoData(fixture.client), /fixture lookup failed/);
    assert.equal(fixture.calls.filter(call => call.kind === 'remove' || call.kind === 'rpc').length, 0);
  }
  for (const failBucket of ['enrollment-medical-documents', 'enrollment-signatures', 'signature-specimens']) {
    const fixture = sdkFixture({ failBucket });
    await assert.rejects(resetStudentDemoData(fixture.client), /fixture removal failed/);
    assert.equal(fixture.calls.filter(call => call.kind === 'rpc').length, 0);
  }
});

test('mock SDK reset propagates SQL failure or missing report after successful removals', async () => {
  for (const options of [{ failRpc: true }, { missingReport: true }]) {
    const fixture = sdkFixture(options);
    await assert.rejects(resetStudentDemoData(fixture.client), options.failRpc ? /fixture SQL failure/ : /did not return a reset report/);
    assert.equal(fixture.calls.filter(call => call.kind === 'remove').length, 3);
    assert.equal(fixture.calls.at(-1)?.kind, 'rpc');
  }
});
