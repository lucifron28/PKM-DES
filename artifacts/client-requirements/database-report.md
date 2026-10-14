# Client requirements database verification

## Final result, confirmed P2 through P5

All requested focused checks pass on real PostgreSQL 18.4: **20 tests passed, 0 failed**, and the shared workflow SQL completed with exit 0 and ROLLBACK. This includes the completion audit's legacy-subject removal gap. The old health fixture failures are resolved, all 7 health tests pass, and the assigned-Nurse standard-load write bypass is fixed by P4. No migrations or production code were edited by this executor.

The latest clean database is `client_req_p3_98f1d9`, built from every existing migration through `20261014150000_medical_supporting_documents.sql`, including the revised P3 optional legacy selection. It uses the previously established disposable cluster at `C:\Users\Ron\Documents\projects\clients\PKM-DES\tmp\client-requirements-pg-6695beff8db547eda2e27106a4274be5`. The cluster is stopped and preserved; `STOP_EXIT=0`. Its directory remains ignored by Git. Earlier task databases and logs are retained as evidence.

| Confirmed migration | Tested SHA256 |
| --- | --- |
| P2 `20261014120000_registrar_workflows.sql` | `890651D9393ED4A0527A4A468BAE955FEC20040DE8E3BE2EE2EB1E2078D85C20` |
| P3 `20261014130000_registrar_schedule_management.sql` | `98F1D93B5FBE498E8134083C626E582004E5B9A44E86E04A253D30859E7E9344` |
| P4 `20261014140000_accounting_finance.sql` | `CA3CBBFEAE816A83153D3DC6D1464655AF33A03982CBC9E1DBEF142FCC510E9D` |
| P5 `20261014150000_medical_supporting_documents.sql` | `4E19F85986CC3CB71E3A0144254E7182C1248215C04EF410526A15A09D4CE03A` |

Final evidence is in `artifacts/client-requirements/database/`:

| Check | Passed | Log |
| --- | ---: | --- |
| Health form, applicability, six-clearance approval, PULL OUT and reinstatement gate | 7 | `health-applicability-sync-irregular-final.log` |
| Multi-subject SQL/TS schedule fingerprints, legacy hashes, pledge guard, collision validation, approved immutability and demo-reset subject guard | 1 | `schedule-fingerprint-irregular-final.log` |
| Assigned official direct-table UPDATE denials, including standard loads after P4 | 1 | `direct-update-irregular-final.log` |
| Optional legacy selection, default compatibility, retained snapshots and mutation denials | 1 | `irregular-legacy-removal-irregular-final.log` |
| Accountant finance authorization, decimals, receipts, balances, version/hash parity and full SQL reset | 2 | `accounting-finance-irregular-final.log` |
| Student PDF metadata authorization, Nurse-only visibility/review and standard/form signature revision behavior | 2 | `medical-documents-irregular-final.log` |
| Mocked reset-service SDK removal order, batching and failure handling | 4 | `demo-reset-storage-contract-irregular-final.log` |
| TS signing service rejects missing consent and unknown stored pledge policy | 2 | `signature-service-irregular-final.log` |
| Shared SQL workflow | exit 0 | `workflow-sql-irregular-final.log` |

The archived summary is `database/final-summary.log`. `database/irregular-clean-migrations.log` records all latest applied migration hashes. Individual final logs contain the actual assertions, SQL fingerprint values and finance/medical version evidence. The clean build first runs the new removal fixture; the final command reruns all focused checks:

```powershell
.\scripts\dev\verify-local-supabase.ps1 -ReuseClusterName client-requirements-pg-6695beff8db547eda2e27106a4274be5 -DatabaseName client_req_p3_98f1d9 -ThroughMigration 20261014150000_medical_supporting_documents.sql -SkipWorkflowSql -IntegrationTestName irregular-legacy-removal.test.mjs
.\scripts\dev\verify-local-supabase-resume.ps1 -IncludeFinance -IncludeMedical -LogSuffix irregular-final
```

The earlier P5 build exposed an overly broad fixture assumption about Storage cleanup, resolved by tracing the actual reset service. The latest clean build validates the optional legacy-selection contract without retaining an obsolete two-argument overload. No additional cluster was created. No hosted connections or `.env.local` connection values were used. The broad shared TS build was not rerun.

The new fixture starts with two subject-backed legacy rows and two offering-backed rows, plus an unrelated student's legacy row. A two-argument RPC call keeps both legacy rows while removing an omitted offering. Explicit legacy selection removes one owned legacy row and adds one offering. Exact retained-row JSON equality verifies ID, source reference, course code, description, units, and day/time/room preservation, including whitespace and ampersands. Unrelated legacy IDs return `invalid_request` without mutation; assigned Nurse and unrelated student calls return `unauthorized`. Regular-student edits, empty combined loads, loads above 60 units, and approved edits are denied. The clean schema contains exactly one function with the new three-argument signature, and its default resolves old two-argument calls. The earlier 19 checks also pass against the revised P3; P4/P5 fingerprint behavior remains compatible.

### Reset contract and evidence limits

The real SQL reset runs as `service_role` on the disposable database after an approved fixture enrollment is pulled out. It removes the target student's account/profile, enrollment, retained status events, enrolled subjects, clearances, historical Accounting signature, finance assessment/payment history, and medical document metadata. All three staff profiles and Auth scaffold rows remain. Authenticated reset and ordinary history deletion remain denied. These assertions pass with P5's event cleanup wrapper.

`lib/demo/reset-service.ts` deliberately removes linked files through Storage SDK calls before `reset_demo_student_data()`. Its medical path query scopes `enrollment_medical_documents` to the previously selected student enrollment IDs. Signature queries use those enrollment IDs; specimen queries use student profile IDs. The mocked SDK tests prove medical files, enrollment signatures and specimens are removed before SQL, paths are trimmed/deduplicated and batched at 100, lookup/removal errors stop before SQL, and SQL errors or a missing report propagate. The earlier remaining `storage.objects` row after a direct SQL-only call was a fixture contract error, **not a SQL reset bug**. The SQL-only test now confirms Storage metadata remains for API cleanup while keeping every application-data cleanup assertion intact.

Medical tests execute actual PostgreSQL RLS on a minimal Storage object metadata scaffold. Student owners insert PDF MIME/size metadata and call the real registration RPC. Unrelated students cannot upload/register/read it, other officials cannot read or review it, and the assigned Nurse can read it. Both special-form and standard Nurse signatures are recorded, invalidated by successive PDF submissions, and retained historically. Old hashes fail with `fingerprint_mismatch`, current revision hashes match TS, no-attachment hashes remain compatible, other official/student hashes and the signed Librarian clearance remain unchanged, and approved uploads/revisions are denied. No physical PDF transfer or signed URL was tested.

The Storage scaffold explicitly supplies RLS and table grants normally provided by Supabase Storage. Auth identity is simulated using `auth.uid()` and transaction-local JWT claims. These are real PG SQL/role/RLS/trigger results, **not full Supabase Auth, PostgREST or Storage API QA**. The SDK reset tests are mocks. Real API file removal, physical byte cleanup, private bucket delivery and token/session behavior remain unverified. Docker-only concurrency tests did not run because Docker Desktop is unavailable.

Final tested source hashes supplement the unchanged health/schedule/direct-update/workflow/fingerprint/service values recorded below:

| File | SHA256 |
| --- | --- |
| `tests/integration/accounting-finance.test.ts` | `656F622932CFAC12DF7969F244E2A195C7E96DB785A258F5226903C3BCAA3213` |
| `tests/integration/medical-documents.test.ts` | `A7259A475DAC9D91AA55D467F9447BDF04DD55CF0FD3498C10816829DDC509C7` |
| `tests/integration/demo-reset-storage-contract.test.ts` | `39D8EF9B1CAC2261E23BF4E97EA515779881869969D214CA22FD98B8AF7696D6` |
| `scripts/dev/verify-local-supabase.ps1` | `05BE3C51E79675EF89BA1C6A63684143F5461A1023286928088A6BE2190D5031` |
| `tests/integration/irregular-legacy-removal.test.mjs` | `C67D3AB8ADED89BA019D975E3243CBF6EF2B83E42530755721ED64B9C871E794` |
| `scripts/dev/verify-local-supabase-resume.ps1` | `E8F74BABC966C2B311229AA7EBBDC629B92DBBBF67E7C95AA92BF57DEFBD93A1` |
| `lib/demo/reset-service.ts`, read only | `107010F7CB945C907EBF0D171FF4DD01E3FC2F8361345F0979A464FBD1B29588` |

## Historical P2 through P4 executed snapshot

The current database is `client_req_p3_890651` in the existing task cluster at `C:\Users\Ron\Documents\projects\clients\PKM-DES\tmp\client-requirements-pg-6695beff8db547eda2e27106a4274be5`. PostgreSQL 18.4 reports collation `English_United States.1252`. The final verification stopped the server successfully, `STOP_EXIT=0`. The cluster and both task databases are preserved. No hosted database, `.env.local`, existing user database, commit, or deployment was used.

The database was built from all existing migrations through P4. P5 was excluded. These were the applied P2/P3/P4 SHA256 values:

| Migration | Applied SHA256 |
| --- | --- |
| `20261014120000_registrar_workflows.sql` | `890651D9393ED4A0527A4A468BAE955FEC20040DE8E3BE2EE2EB1E2078D85C20` |
| `20261014130000_registrar_schedule_management.sql` | `8BBD63B7800CE3932CE3B96D99014E46CE523C5008B271A729F15D7061282BD4` |
| `20261014140000_accounting_finance.sql` | `CA3CBBFEAE816A83153D3DC6D1464655AF33A03982CBC9E1DBEF142FCC510E9D` |

P4 changed after the supplied stable hash `3DA1E0D2D07CE4E0E9A75183B8813927D6AEA5C0DD524A429B6DBCA6D25CEBFB`. That supplied snapshot was not applied. The table identifies the newer current snapshot that actually ran. P2 also changed to use `event_sequence`; a new database within the same cluster captures that schema change. The earlier database `client_req_p3_8bbd63` preserves the prior P2 hash `AC78FD28894A9667BDD17CA344526FB83007A09ACB2529DAAAC4693D623DDDD3` and the same P3 hash.

### Actual results

| Check | Result | Evidence in `artifacts/client-requirements/database/` |
| --- | --- | --- |
| Health applicability/form/signature integration | 7 passed, 0 failed | `health-applicability-sync-p4-current.log` |
| Three-subject SQL/TS fingerprint integration | 1 passed, 0 failed | `schedule-fingerprint-p4-current.log` |
| Assigned-official direct table UPDATE | 1 passed, 0 failed after P4 | `direct-update-p4-current.log` |
| Shared workflow SQL | exit 0, transaction rolled back | `workflow-sql-p4-current.log` |
| Finance behavior | 1 passed | `accounting-finance-p4-current.log` |
| Full authorized demo reset with PULL OUT and finance history | 1 failed, backend correction required | `accounting-finance-p4-current.log` |
| TS signature service policy rejection | 2 passed, 0 failed | `signature-service-p4-current.log` |

The remaining failure is real SQL behavior. Calling `reset_demo_student_data()` as `service_role` after a Registrar PULL OUT fails at enrollment deletion on `enrollment_status_events_enrollment_id_fkey`, an ON DELETE RESTRICT reference. The fixture contains an actual assessment and payment. Normal authenticated reset and status-event DELETE are denied before the service call. The reset transaction aborts and rolls back. Assertions for complete student cleanup and staff preservation remain in the test but cannot execute until the reset ordering is corrected. Medical metadata and storage-object reset coverage awaits the authorized P5 schema; it has not been claimed as tested.

The P4 standard-load policy correction passes the original denial assertion. The assigned NURSE still has the shared public admin identity, but cannot update `standard_load_sets`, enrollments, enrollment subjects, or course offerings directly. Prior P2/P3 logs retain the proven standard-load bypass, including `direct-update-p3-final.log`; those failures apply to the earlier snapshot before P4.

Health fixtures now submit the digital form through the student-owned `save_health_record_update` RPC before the dedicated Nurse signing RPC. Missing-form attempts return `health_record_not_submitted` and write no signature. Standard versus special workflow denials remain. The independent Nurse queue fixture runs in a rolled-back transaction and does not rely on leftovers from another test. The approval test executes all six clearances, rejects stale or absent clearances, preserves PULL OUT records/signatures and event actor/reason, and rejects reinstatement with a missing clearance. Finalized subject edits are rejected even for the database owner. Fixture cleanup uses the existing demo-reset DELETE guard and deletes its own retained status events before its enrollment.

The shared SQL verifies revoked generic requirement RPC execution for both student and admin callers. It verifies Nurse-only signing after valid form submission, keeps approval blocked when other required clearances are absent, and exercises Registrar rejection/outbox and PULL OUT/reinstatement. It restores REJECTED after a rejected record is pulled out. Full six-clearance approval is executed by the health integration test. The combined SQL transaction explicitly ends the reconciliation flag between operations that normally run as separate RPC transactions.

Fingerprint parity uses three reverse-order imported-style codes, IT, GE, ACCT, with 4, 2, and 3 units and mixed blank/nonblank day/time/room. The actual PostgreSQL ordering agrees with the TS comparator for those codes under the reported collation. This is fixture-specific ordering evidence, not a claim about every Unicode/collation combination. SQL and TS match blank legacy, null-policy scheduled, pledge-v1 scheduled, and Nurse hashes. Pledge-v1 remains the student material suffix. Unknown pledge produces SQL null, and the TS service rejects an unknown stored policy. Both pipe collision candidates and both newline variants return `invalid_schedule_text` before mutation; hashes remain unchanged. Overlong day/room inputs return `invalid_enrollment_load`. Approved RPC updates are rejected and preserve the hash. The existing exact demo-reset subject DELETE bypass also executes successfully.

Finance verification configures 19.99 and rejects three decimal places, duplicate assessment codes, fractional-cent payments, and payments without an assessment. It executes UNASSESSED, UNPAID, PARTIAL, and PAID summaries, two receipts totaling 19.99, zero final balance, and student-owner/Registrar reads. Unrelated students and Nurses cannot read the summary or write finance data. Authenticated direct financial-history SELECT/DELETE is denied. Owner UPDATE/DELETE of existing history is also denied by immutable-history triggers. Assessment and payment increment financial document versions, invalidate the current Accounting clearance while retaining both historical signatures, and preserve the signed Nurse clearance and Student/Nurse document hashes. SQL/TS Accounting hashes agree for legacy null and versions 1, 2, 3. Approved enrollment assessment/payment RPCs return `not_editable`. Later catalog changes leave the approved historical summary and hash unchanged.

### Commands executed

```powershell
.\scripts\dev\verify-local-supabase.ps1 -ReuseClusterName client-requirements-pg-6695beff8db547eda2e27106a4274be5 -DatabaseName client_req_p3_890651 -ThroughMigration 20261014140000_accounting_finance.sql -SkipWorkflowSql
.\scripts\dev\verify-local-supabase-resume.ps1 -IncludeFinance -LogSuffix p4-current
```

The resume script runs `node --test` for health and direct-write tests, `tsx --test` for schedule and finance tests, `psql -X -v ON_ERROR_STOP=1 -f scripts/integration/verify-local-supabase-workflows.sql`, and `tsx --test lib/signatures/service.test.ts` with `NODE_OPTIONS=--conditions=react-server`. Its final exit is nonzero because it preserves the full-reset failure. Every DB connection uses the task-only loopback URL generated at runtime.

Tested source SHA256 values:

| File | SHA256 |
| --- | --- |
| `tests/integration/health-applicability-sync.test.mjs` | `3CA0F2F0F21BC67507FC4E31C5459F8E0FC5D135A9E631B481EF84358EBE17E2` |
| `tests/integration/registrar-schedule-fingerprint.test.ts` | `287D2FE1C73A4A1029BA5E63E70BCE468F6F7A98FF469EF2C220BBC08903A73B` |
| `tests/integration/registrar-direct-update.test.mjs` | `BDBDF2C95EB63C1DC041D19C71E18B828D115D71646CAB28AE3ED1D10572D8C9` |
| `tests/integration/accounting-finance.test.ts` | `9219FE3CFDE176DCEF2C13FE77BE4216D330EA94340196B411795114A4CC8BBD` |
| `scripts/integration/verify-local-supabase-workflows.sql` | `ACB65E9E98F8653C75D6284FE8F4E2F8805FEC42533E02CCC4FD2A9427239255` |
| `scripts/dev/verify-local-supabase.ps1` | `015FB83ADB3C33D7CE3CBD636AD64DB3FB13860C6FEBC2839B065BAC8BA13A5A` |
| `scripts/dev/verify-local-supabase-resume.ps1` | `19215A4F5E2BA278C7738267C0F2E72B71C5C69A77298DBF8CDB7002D459EECD` |
| `lib/signatures/fingerprint.ts`, read only | `7D73462E524AF39D79BBB350BC6388E0076D5F5532C7CFCBC1E3F785FD0C3B45` |
| `lib/signatures/service.ts`, read only | `67A9742D3B7C286D32FF44C5DCBD85EAE53C3D37FE75310938B64286CF3EAAB9` |

This is real PostgreSQL SQL/RLS/trigger verification with a minimal auth/storage schema scaffold and a simulated `auth.uid()`. It does not establish Supabase Auth token/session behavior, PostgREST access, private bucket file transfers, or Storage API behavior. Docker-only concurrency verification has not run because Docker Desktop is unavailable. P5 attachment/revision verification and a successful full reset remain outstanding.

## Historical P2-only results retained below

Status as of 2026-10-14. Verification was limited to local PostgreSQL 18 and migrations through `20261014120000_registrar_workflows.sql`. Docker Desktop was unavailable. The harness created disposable clusters under `tmp/client-requirements-pg-*`, bound PostgreSQL to `127.0.0.1`, and preserved every cluster. These runs did not use `.env.local`, reset an existing database, or contact hosted Supabase.

The harness supplies minimal `auth` and `storage` schemas, roles, and `auth.uid()` for migration compatibility. That is PostgreSQL SQL/RLS verification, not Supabase Auth, Storage API, or Data API QA.

## Findings and results

- The assigned-official fixture had `profiles.role = 'admin'`, an active NURSE assignment, `private.is_admin() = true`, and `private.has_registrar_access() = false`. Direct UPDATE attempts against enrollments, enrollment snapshots, and course offerings changed no rows. A direct UPDATE against `standard_load_sets` did change its row. The bypass comes from `Admins manage standard loads` (`FOR ALL`, guarded by `private.is_admin()`) in `20260802060000_multi_program_standard_load_enrollment.sql`, together with the authenticated UPDATE grant in `20260803000000_secure_standard_load_data_access.sql`. The failing psql transaction rolled back when its session exited; the stopped cluster is preserved. No production or existing local data changed. This is a confirmed RLS/write-privilege bypass for backend correction.
- Existing clearance/pledge integration coverage passed 5 of 7 tests on PostgreSQL. The test covering pledge-v1 hashing, unknown-version SQL null, the database signing RPC's `unsupported_policy_version` result, approval gating, and six required clearances passed. Two other health scenarios failed: a Nurse signature returned `health_record_not_submitted` where the fixture expected `signed`, and the mode-change cycle expected a current signature but found none.
- TypeScript fingerprint, presentation, and registration-print tests passed. `lib/signatures/service.test.ts` passed with Node's `react-server` condition; it confirms the TypeScript service rejects an unknown pledge version before signature processing.
- The shared workflow SQL did not complete: it expects the legacy `update_enrollment_requirement_status` function to remain executable for an admin. Existing migration `20260815000000_digital_health_record_verification.sql` intentionally revokes that authenticated execute grant. The test script needs alignment with the current Nurse-controlled health workflow; this is not a PostgreSQL startup or migration-application failure.
- `tests/integration/registrar-schedule-fingerprint.test.ts` now covers null/blank legacy hash preservation, scheduled SQL/TypeScript parity, the pledge-v1 suffix, pipe and newline collision pairs, invalid day/room values before approval, approved schedule immutability, and exact demo-reset cleanup. Each boundary value must either return `invalid_enrollment_load` without changing the prior hash or be accepted with SQL/TypeScript parity; two distinct accepted schedules must have different hashes. This test has not yet run because P3 was not confirmed stable for application. Its file currently includes the schedule-material `FROM` correction and demo-reset delete guard, but the requested worker stability confirmation is still pending.
- P4 finance migration and accountant RLS/invalidation verification remain pending.

## Disposable cluster paths

All paths below are preserved under the workspace `tmp` directory and ignored by Git via `tmp/client-requirements-pg-*/`. A read-only `pg_ctl status` check confirmed no server is running for any listed cluster.

- `C:\Users\Ron\Documents\projects\clients\PKM-DES\tmp\client-requirements-pg-20261014` — initial startup probe; no server remained running.
- `C:\Users\Ron\Documents\projects\clients\PKM-DES\tmp\client-requirements-pg-ba6ff5f34fc94987987617889c175080` — workflow SQL first stopped on authenticated `audit_logs` access.
- `C:\Users\Ron\Documents\projects\clients\PKM-DES\tmp\client-requirements-pg-4b445f1a4ed94f169d038e3dc64a2ab7` — workflow SQL then exposed authenticated UPDATE privilege denial.
- `C:\Users\Ron\Documents\projects\clients\PKM-DES\tmp\client-requirements-pg-00048345e4cc4ecebbbaeb0871ef77cc` — sandbox-denied localhost connection before database creation; server stopped by the harness.
- `C:\Users\Ron\Documents\projects\clients\PKM-DES\tmp\client-requirements-pg-cf104a886cbe4fe9aebb10e23f78a4c1` — workflow SQL exposed denied execution of the generic requirement RPC for a student.
- `C:\Users\Ron\Documents\projects\clients\PKM-DES\tmp\client-requirements-pg-1c2ac654f57f47d99c0d797b925f6d9b` — workflow SQL exposed the intentionally revoked generic requirement RPC for an admin.
- `C:\Users\Ron\Documents\projects\clients\PKM-DES\tmp\client-requirements-pg-6695beff8db547eda2e27106a4274be5` — assigned-official direct-table UPDATE bypass reproduced on `standard_load_sets`.
- `C:\Users\Ron\Documents\projects\clients\PKM-DES\tmp\client-requirements-pg-7b1160765b344021ad0e820ddc97a68e` — clearance/pledge integration: 5 passed, 2 failed as listed above.
