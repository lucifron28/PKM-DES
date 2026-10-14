# Client workflow implementation evidence

Final status on 2026-10-14, branch `feature/client-requirements`, base `34f5b418aef4f98ddacd22b8fd93c69011918682`: backend/workflow implementation is reviewed and complete. The clean revised P2-P5 database run passed 20 focused checks and the shared SQL workflow. It includes legacy-subject removal at P3 SHA-256 `98F1D93B5FBE498E8134083C626E582004E5B9A44E86E04A253D30859E7E9344`. The four new interactive DOM tests pass, and the existing enrollment UI command passes 9/9. Shared checks passed on the earlier recorded source snapshot; later corrections passed their affected checks. No source, migration, or print artifact changed during this final report update.

The 20-check worker total includes 4 mocked Storage SDK contract tests and 2 TypeScript signing-service tests. Database cases execute real PostgreSQL 18.4 SQL, roles, RLS, and triggers with minimal Auth/Storage metadata scaffolds. Full Supabase Auth, PostgREST, private file delivery, physical upload/removal, and token/session behavior remain unverified. Docker-only concurrency checks did not run. Failed registration after upload can leave an inaccessible orphan object; orphan cleanup remains a known limitation.

## Implemented in P2

- `registrar_bulk_review_enrollments` is used for bulk approve/reject. It checks Registrar access; the former `review_pending_enrollment` RPC is revoked from `authenticated`.
- A successful bulk action requires at least one confirmed change. Before notification or cache revalidation, actionable results must cover the requested IDs and contain no duplicate or unrequested IDs. Empty or malformed results produce errors. An authorization sentinel can only produce an error, never a success. Mixed batches report changed and skipped counts with outcome-specific reasons.
- PULL OUT accepts pending, approved, and rejected enrollments. It preserves student, enrollment, subject, and signature rows, records actor, time, reason, and prior status in `enrollment_status_events`, and can reinstate the saved status. Restoring an enrollment whose prior status was approved requires current clearances.
- The retained official-record list shows a PULL OUT badge and withdrawal-history link for the linked active-term enrollment. With no active term it uses the latest enrollment. Existing student/source enrollment status remains separate, so `NOT ENROLLED` cannot hide the withdrawal flag. The link targets the enrollment history row. A lookup failure displays an unavailable notice.
- The registrar workflow SQL harness now calls the guarded bulk review RPC for rejection and checks both bulk-review and PULL OUT denial for an assigned Nurse.

## Historical P2 verification checkpoint

| Case | Evidence present | Runtime result |
| --- | --- | --- |
| Unauthorized bulk-review and PULL OUT calls | SQL cases in `scripts/integration/verify-local-supabase-workflows.sql` | Not executed |
| Former approval RPC denied to `authenticated` | SQL case in `tests/integration/health-applicability-sync.test.mjs` | Not executed |
| Stale signatures block reinstating an approved enrollment | SQL case in `tests/integration/health-applicability-sync.test.mjs` | Not executed |
| PULL OUT retains records and records actor/reason | SQL cases in both integration harnesses | Not executed |
| Mixed bulk PULL OUT changes one record and skips one already pulled out | SQL case in `scripts/integration/verify-local-supabase-workflows.sql` | Not executed |
| Returned RPC IDs are requested and unique; empty, unauthorized, and not-found results fail safely | `lib/enrollment/bulk-results.test.ts` | Passed, 3 tests |

Executed checks:

- `npm run test:admin-enrollment-review`: passed, 4 tests.
- `npx tsx --test lib/enrollment/bulk-results.test.ts`: passed, 3 tests.
- `docker ps`: failed because `dockerDesktopLinuxEngine` was unavailable. Starting Docker Desktop hidden did not restore the daemon. `PKM_LOCAL_SUPABASE_TEST_DB_URL` is not set in this session.

The table above records the earlier P2 evidence checkpoint. Later worker output is listed below. No hosted database call, commit, push, or deployment was made by this executor.

## P3 implementation

- Registrar can create a pending irregular enrollment from configured offerings, add/remove offering-backed courses for irregular students, and encode units/day/time/room on any pending enrollment. Existing source-backed rows retain their copied course descriptions and schedules.
- Completion correction: pending irregular students can also remove older `subject_id`-backed snapshots. The single RPC signature is `registrar_set_irregular_enrollment_offerings(uuid, uuid[], uuid[] DEFAULT NULL)`. Omitted/null `p_legacy_subject_ids` preserves older rows for compatible callers. The new UI posts an explicit kept-ID array, including empty arrays. Every ID must identify a legacy row on that enrollment. Combined retained and offered courses must be nonempty, have 1-60 total units with positive bounded individual units, and unique normalized codes. Selected rows are not updated, so source IDs and schedules remain unchanged. Approved and regular-student removal is denied.
- Course creation and offering replacement use the existing shared `pkm.standard-load-configuration` advisory lock before catalog validation/copy. Parent enrollment row locks protect schedule writes and approval. Approved subject mutation is denied, with the existing authorized demo-reset delete exception retained.
- Schedule fields reject pipe, CR, and LF delimiters. Nonempty schedules extend the SQL/TS fingerprint; blank historical schedules retain their hashes. The pledge-v1 suffix and unknown-pledge fail-closed branch remain in the hash helper.
- Guided Registrar steps use the existing review, load, clearance, and approval stages. Editor keys follow loaded course/schedule values.

## Accounting and print contract

- Accountant fee management lives in `/admin/clearances/accounting`; enrollment assessment/payment entry lives in that workspace's detail route. RPC authorization requires the active Accountant role for the enrollment program. Authenticated direct financial table writes are revoked, and RLS is enabled.
- The catalog names the original 13 miscellaneous fee categories plus tuition, NSTP, and scholarship. Seeded amounts are null and inactive. Scholarship is an explicit deduction, with the assessed total floored at zero.
- Assessment rows and receipts retain immutable history. Both require pending enrollment. Each insert advances `financial_document_version` through one trigger and invalidates Accounting clearance. Only Accounting fingerprint material changes. Approved printed finance stays fixed and remains viewable on `/student/balances`.
- `financial_summary` is loaded by both registration routes. Its shape is `{fee_items, assessment_version, assessed_amount, paid_amount, balance_due, currency_code, payment_status, payment_receipts}`. Fee items are `{fee_code, fee_name, amount}`. Receipts are `{payment_id, amount, paid_at, reference}`. Absent monetary records remain null. Balance is `max(assessment-paid,0)`. Unknown historical fee codes remain in the summary.
- `registrar_approval` is `{name, approved_at} | null`. The scoped projection allows the owning student or Registrar to read the recorded reviewer name/date. It supplies no fabricated name or ink. Historical approved PULL OUT metadata uses the saved prior status.
- `standard_load_sets` writes now require `private.has_registrar_access()`, replacing the confirmed Nurse/admin bypass. Service-role access remains available.
- Decimal RPC parsing reuses `parseMoneyInput`. Valid `19.99`, `0.29`, `0.57`, and the upper bound pass. Negative values, extra precision, booleans, empty strings, scientific strings, and values above the bound fail.

## Medical supporting papers and reset

- Any student can submit PDF/JPEG/PNG papers for their own pending enrollment, independently of special Health Record Update applicability. The existing digital health form remains available under its existing rules.
- The server checks MIME, magic bytes, and a 1 MB limit. Next accepts 2 MB server-action bodies for multipart overhead. The private bucket also enforces 1 MB and allowed MIME types. Uploads use unique owner/enrollment paths with `upsert:false`.
- Metadata records the actor, timestamp, immutable file path, SHA-256, and positive revision. Owner and program-authorized Nurse can read the papers. Nurse detail displays private links and disables review controls when papers cannot be loaded/opened. New submissions invalidate Nurse clearance and bind `medical_document_version` into both Nurse document types. Other roles and no-attachment historical hashes remain unchanged.
- The authorized demo reset wrapper removes selected student enrollment status events before the old reset, records their removal in audit, then restores the transaction reset flag. Financial and medical rows cascade through reset guards. `lib/demo/reset-service.ts` removes linked medical objects through the Storage API before SQL reset, alongside existing signature cleanup. Normal history mutation remains denied.
- Upload followed by failed metadata registration can leave an inaccessible unregistered object. No replacement or normal DELETE policy was introduced. Linked-file cleanup is implemented; orphan cleanup and a live Storage API run are not verified.

## Executed checks and historical database checkpoints

Shared-check source digest is `BFB70B19D199B877661BEC5F55CED09E32FDFEB75698B3A66B91761B3C9228F4`. It hashes 302 source files from `app`, `components`, `lib`, `types`, migrations, demo scripts, plus `next.config.ts`, `package.json`, and `tsconfig.json`, sorted by path. Generated artifacts and DB harness files are excluded. Later focused corrections have separately recorded hashes and checks below.

The later retained-record flag patch has source digest `015ED9FFCBB119D4C1F8C415F1E4CD1A064EF412F0E6855D1C1AB01DB143297C`. `npm run typecheck` and focused ESLint on the two affected pages both exited 0. The earlier full build applies to the preceding digest; broad CI was not repeated for this UI-only follow-up.

- `npm run typecheck`: exit 0 after fixing nullable redirects, the irregular-load relation shape, and PULL OUT reporting counts.
- `npm run lint`: exit 0, initially 11 warnings. The new unused-import warning was removed. Build's lint pass retains existing image/accessibility warnings.
- `npm run build`: initial Windows sandbox path-access failure; elevated retry with loopback placeholder Supabase URL and dummy keys exited 0. Next compiled and generated all 30 static pages. No hosted fixture/auth flow ran.
- Combined enrollment/signature/official-role/finance/requirement/health/reset unit batch: 135 passed, 1 stale three-status assertion failed. The corrected rejected-resubmission file then passed 6/6. Finance focused tests passed 10/10; medical/signature focused tests passed 9/9.
- Additional admin/student record, account claim/setup, course offering, email and auth batch: 69 passed, 1 auth file failed from using `react-server` for a plain-React test. Auth, health-paper, and UI domain tests using the CI-compatible plain condition then passed 23/23.
- Modal, navigation, signature input, and print renderer tests passed 20/20. Registration presentation/finance tests passed 11/11. Smoke-environment tests passed 37/37. Verified future official-name preparation passed 6/6. No preparation flow was executed, and no signature snapshot was rewritten.
- Worker `schedule-fingerprint-p3-final.log`: 1/1 SQL/TS parity test passed, including multiple subjects, blank compatibility, pledge suffix, delimiter rejection, and approved schedule denial.
- Worker `health-applicability-sync-p3-final.log`: 7/7 passed, including all-student Nurse queues, special/standard signing boundaries, mode changes, and all six approval clearances.
- Worker `workflow-sql-p3-final.log` stopped on tied-timestamp restoration. P2 now adds `event_sequence` and uses sequence ordering for reinstatement and historical approval lookup. The subsequent `workflow-sql-p4-current.log` reaches its final `ROLLBACK` without an SQL error.
- Worker `direct-update-p4-current.log`: 1/1 passed after the Registrar-only standard-load policy correction.
- Historical worker `accounting-finance-p4-current.log`: financial behavior passed, exercising 19.99 amounts, unset/unpaid/partial/paid states, receipts, owner/role denials, approved-content immutability, and Accounting-only SQL/TS version parity. Full reset failed on the PULL OUT event FK with only migrations through P4. The subsequent clean P5 run passed full application-data reset and staff-preservation assertions.
- At the earlier checkpoint, medical authorization/revision and full reset cases were outstanding. The final P5 worker run subsequently passed those SQL cases. Physical Storage cleanup remains unverified. PostgreSQL cannot establish Storage API byte deletion; the existing service path removes linked objects before SQL row cleanup.
- An earlier `full-p5-snapshot.log` failed during `createdb` with connection refused before migration/test execution. The worker subsequently recovered the disposable runtime and completed `full-p5-execution.log` and the final tests.

Stable migration SHA-256 values:

| Migration | SHA-256 |
| --- | --- |
| `20261014120000_registrar_workflows.sql` | `890651D9393ED4A0527A4A468BAE955FEC20040DE8E3BE2EE2EB1E2078D85C20` |
| `20261014130000_registrar_schedule_management.sql` | `98F1D93B5FBE498E8134083C626E582004E5B9A44E86E04A253D30859E7E9344` |
| `20261014140000_accounting_finance.sql` | `CA3CBBFEAE816A83153D3DC6D1464655AF33A03982CBC9E1DBEF142FCC510E9D` |
| `20261014150000_medical_supporting_documents.sql` | `4E19F85986CC3CB71E3A0144254E7182C1248215C04EF410526A15A09D4CE03A` |

Remaining scope distinction: PULL OUT currently flags enrollment records and retains the linked student and all history. Standalone official records without an enrollment do not have a separate PULL OUT field or withdrawal RPC. That would require a separate record-status schema and review before claiming standalone-record withdrawal support.

## Latest review checks

- `components/admin/enrollment-workflow.test.tsx` passes 4/4 DOM tests using the existing jsdom loader. It exercises select-all on 105 rows capped at 100, exact hidden form IDs/counts, rejecting a 101st individual selection, clearing rows/hidden values, cancelled rejection preventing the action with accepted submission as positive control, explicit kept/empty legacy selections, approved read-only controls, and route-key remount dropping stale subject/offering IDs while loading saved schedules. No dependency was added.
- `npm run typecheck` and focused ESLint on the edited component/action/test/loader files passed after the legacy-removal correction. Output and tested file hashes are in `enrollment-workflow-ui-output.txt`. Print tests and broad CI were not repeated.
- `test:enrollment-review-ui` now includes `components/admin/*.test.tsx`, so the existing CI workflow runs the new DOM coverage. The command passed 9/9. Supporting loader overrides apply only to the two tested new components and redirect server actions to counting stubs; no SQL integration file was changed.
- Final DB worker `database/final-summary.log` records exit 0 for the clean database `client_req_p3_98f1d9`, with all revised migration hashes matching the table above. All 20 focused checks passed; the shared workflow SQL separately exited 0 and rolled back. The preserved disposable cluster stopped successfully, `STOP_EXIT=0`.
- Actual legacy-removal SQL passed: pending owned legacy removal, exact retained-row/source/schedule equality, null/omitted compatibility, foreign-ID rejection, assigned-Nurse/student denial, regular/approved denial, empty-load denial, and loads above 60 units denied. The schema contains one three-argument RPC signature and preserves two-argument call compatibility through its default.
- The final suite includes 7 health tests, 1 schedule-fingerprint test, 1 direct-write-denial test, 1 legacy-removal test, 2 finance/reset tests, 2 medical tests, 4 mocked SDK cleanup tests, and 2 TS signing-service tests. Detailed outputs are in `database/*-irregular-final.log` and `database-report.md`.
- The real PostgreSQL reset removes application data and preserves staff. Direct SQL intentionally retains Storage metadata for cleanup through the service's SDK calls. Mocked SDK checks cover removal ordering, deduplication/batching, and aborting before SQL when lookup/removal fails. They do not prove physical API file deletion. No hosted calls, preparation execution, commit, push, or deployment occurred.

## Backend/workflow changed files

Owned changes cover the following files and directories. Print-owned files and DB harnesses were inspected or tested, not edited by this executor.

- `supabase/migrations/20261014120000_registrar_workflows.sql`, `20261014130000_registrar_schedule_management.sql`, `20261014140000_accounting_finance.sql`, `20261014150000_medical_supporting_documents.sql`.
- `app/admin/enrollments/actions.ts`, `load-actions.ts`, `page.tsx`, `load/page.tsx`, and `[enrollmentId]/registration/page.tsx`; `app/admin/students/page.tsx`; Accountant queue/detail pages in `app/admin/clearances/[clearance]`; new `app/admin/accounting/actions.ts`.
- Student registration/status/dashboard integration, real `app/student/balances/page.tsx`, new `app/student/medical-documents/actions.ts`, and `app/student/enrollments/[enrollmentId]/medical-documents/page.tsx`.
- New Registrar bulk/load/step components in `components/admin`, new `components/accounting` editors, `components/forms/medical-document-upload.tsx`, and PULL OUT support in `components/ui/badge.tsx`.
- `lib/finance`, `lib/requirements/medical-documents.ts` and its test, `lib/enrollment` bulk/status/review/reporting changes and tests, `lib/signatures/fingerprint.ts`, `presentation.ts`, `service.ts`, and `domain.test.ts`.
- `lib/constants/enrollment.ts`, `types/database.ts`, `lib/demo/reset-service.ts`, `next.config.ts`, and future official-name configuration/tests in `scripts/demo/demo-preparation-fixtures.mjs` and `demo-preparation.test.mjs`.
- This report and `shared-check-output.txt` record current evidence. The runtime report and integration logs remain owned by the DB executor.

## Proposed commit groups, not staged

These are proposed groups for main review. Shared files require selective hunks so each implementation commit contains its matching types, queries, and fingerprint changes. Do not stage whole overlapping files into the first group. Print-owned changes require the print executor's separate handoff. Preserve existing baseline artifacts and user temporary files, including `tmp/registration-copy-qa/`; exclude disposable clusters and generated build files.

1. **Registrar bulk review and retained PULL OUT records.** P2 migration `20261014120000_registrar_workflows.sql`; `app/admin/enrollments/actions.ts`; P2 hunks in `app/admin/enrollments/page.tsx`, `app/admin/students/page.tsx`, `app/admin/masterlist/page.tsx`, `app/admin/reports/page.tsx`, `app/student/dashboard/page.tsx`, and `app/student/enrollment-status/page.tsx`; `components/admin/enrollment-bulk-actions.tsx`; `components/ui/badge.tsx`; `lib/constants/enrollment.ts`; `lib/enrollment/admin-review.ts`, `bulk-results.ts`, `display-status.ts`, and `query.ts`; status/event type hunks in `types/database.ts`.
2. **Registrar irregular loads and pending schedules.** P3 migration `20261014130000_registrar_schedule_management.sql`; `app/admin/enrollments/load-actions.ts`, `app/admin/enrollments/load/page.tsx`; `components/admin/enrollment-load-editor.tsx`, `registrar-irregular-load-form.tsx`, `registrar-workflow-steps.tsx`; load-route/editor/key hunks in `app/admin/enrollments/page.tsx` and `[enrollmentId]/registration/page.tsx`; schedule fingerprint/select hunks in `lib/signatures/fingerprint.ts`, `service.ts`, student status/registration queries, and official detail query; schedule types in `types/database.ts`.
3. **Accountant fees, assessed balances, receipts, and recorded Registrar projection.** P4 migration `20261014140000_accounting_finance.sql`; `app/admin/accounting/actions.ts`; `components/accounting/fee-catalog-editor.tsx`, `enrollment-finance-editor.tsx`; `lib/finance/fee-codes.ts`, `money.ts`, `presentation.ts`; `app/student/balances/page.tsx`; Accounting queue/detail hunks in `app/admin/clearances/[clearance]/page.tsx` and `[enrollmentId]/page.tsx`; finance/projection loading in both registration routes; Accounting revision/type/select hunks in `lib/signatures/fingerprint.ts`, `service.ts`, `app/student/enrollment-status/page.tsx`, and `types/database.ts`. Include P4's Registrar-only `standard_load_sets` policy correction with its migration.
4. **Medical supporting uploads, Nurse review, and guarded reset cleanup.** P5 migration `20261014150000_medical_supporting_documents.sql`; `app/student/medical-documents/actions.ts`; `app/student/enrollments/[enrollmentId]/medical-documents/page.tsx`; `components/forms/medical-document-upload.tsx`; `lib/requirements/medical-documents.ts`; `lib/demo/reset-service.ts`; `next.config.ts`; medical links/review/version hunks in `app/student/enrollment-status/page.tsx`, `app/admin/enrollments/page.tsx`, official clearance detail, `lib/signatures/fingerprint.ts`, `presentation.ts`, `service.ts`, and `types/database.ts`.
5. **Verified official names for future preparation.** `scripts/demo/demo-preparation-fixtures.mjs` only. Keep the existing shared password and assignment behavior; no live preparation or historical signature rewrite accompanies this commit.
6. **Workflow regression tests and CI test discovery.** Unit tests in `lib/enrollment/admin-review.test.ts`, `bulk-results.test.ts`, `display-status.test.ts`, `rejected-resubmission.test.ts`, `reporting.test.ts`; `lib/finance/*.test.ts`; `lib/requirements/medical-documents.test.ts`; `lib/signatures/domain.test.ts`; `components/admin/enrollment-workflow.test.tsx`; `tests/support/stub-loader.mjs`, `tests/support/stubs/enrollment-workflow-actions.ts`; `scripts/demo/demo-preparation.test.mjs`; `package.json` enrollment UI test command. Coordinate DB-worker files in this test group: revised `tests/integration/health-applicability-sync.test.mjs`, new finance/medical/reset/legacy/direct-write/schedule integration tests, `scripts/integration/verify-local-supabase-workflows.sql`, `verify-local-supabase-concurrency.ps1`, and `scripts/dev/verify-local-supabase*.ps1`. Include only the relevant `.gitignore` disposable-cluster hunks.
7. **Verification evidence and workflow contracts.** This report, `database-report.md`, `shared-check-output.txt`, `enrollment-workflow-ui-output.txt`, final summary and final migration/test logs under `artifacts/client-requirements/database/`. Select final evidence explicitly; preserve historical checkpoint files without blindly staging every generated artifact. Print evidence and changes under `components/print`, `lib/registration-form`, `app/globals.css`, and print-related `lib/utils/format.ts` hunks belong to the print executor's separate group.

No group has been staged or committed. Implementation order is P2, P3, P4, P5, future-name configuration, tests, then evidence. The shared type/fingerprint/route files must be reviewed by hunk when applying that order.
