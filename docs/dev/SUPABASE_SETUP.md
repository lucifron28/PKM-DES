# Supabase Setup and Implementation Notes

This document records the Supabase work completed for PKM-DES and the remaining setup steps needed for local development and login testing.

## Project Used

- Supabase project name: `PKM-DES`
- Project ref / project id: `sdivxyqdnvnyjqrsrzdq`
- Region: `ap-northeast-1`
- Project URL: `https://sdivxyqdnvnyjqrsrzdq.supabase.co`
- Database host: `db.sdivxyqdnvnyjqrsrzdq.supabase.co`
- PostgreSQL version reported by Supabase: `17.6.1.111`

The public URL and anon/publishable keys are safe for browser use. The service-role key is secret and must not be committed or pasted into chat.

For Vercel deployment, keep `DATABASE_PROVIDER=supabase`. SQLite is local-development only and is documented separately in `docs/dev/SQLITE_DEVELOPMENT.md`.

For the temporary fictional-data client-preview deployment boundary and Vercel runtime guidance, see [CLIENT_PREVIEW_DEPLOYMENT.md](./CLIENT_PREVIEW_DEPLOYMENT.md).

Before a production or Vercel deployment, run:

```bash
npm run check:production-env
```

This verifies that the deployment is not using SQLite and that the required Supabase environment variables are present.

## What Was Done Through Supabase MCP

1. Listed Supabase projects and found the new `PKM-DES` project.
2. Applied the initial schema migration.
3. Ran the current program-catalog and BSAIS curriculum-subject seed SQL.
4. The tracked seed definition contains:
   - Program catalog records: 10
   - BSAIS curriculum subjects: 56
   - BSAIS curriculum units: 167
5. Retrieved the project URL and publishable keys for local environment setup.
6. Created local `.env.local` with:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
7. Left `SUPABASE_SERVICE_ROLE_KEY` blank because the MCP does not expose service-role secrets.
8. Ran Supabase security advisor after the schema migration.
9. Added and applied cleanup migrations to resolve security advisor warnings.
10. Re-ran security advisor and verified that the current result has no security lints.

## Local Environment

Use `.env.example` as the template:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
ACCOUNT_CLAIM_SECRET=
EMAIL_DELIVERY_ENABLED=false
GMAIL_SMTP_USER=
GMAIL_SMTP_APP_PASSWORD=
EMAIL_FROM=
APP_BASE_URL=http://localhost:3000
```

For this project, the URL is:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://sdivxyqdnvnyjqrsrzdq.supabase.co
```

Get the anon key and service-role key from:

```text
Supabase Dashboard -> Project Settings -> API
```

Important:

- `NEXT_PUBLIC_SUPABASE_ANON_KEY` is used by browser and server clients operating under RLS.
- `SUPABASE_SERVICE_ROLE_KEY` is used only by server actions that need privileged Auth operations.
- The service-role key is required for the MVP Create Student Account flow because the app creates Supabase Auth users server-side.
- `ACCOUNT_CLAIM_SECRET` must be a private random value of at least 32 characters. It signs the short-lived account-claim proof and must never use a `NEXT_PUBLIC_` name.
- `EMAIL_DELIVERY_ENABLED` remains `false` unless PKM has approved the sender and notification wording.
- `GMAIL_SMTP_USER`, `GMAIL_SMTP_APP_PASSWORD`, and `EMAIL_FROM` are server-only delivery configuration; do not commit them. The mailbox owner must create a dedicated Google App Password after enabling 2-Step Verification; do not use the ordinary mailbox password.
- `APP_BASE_URL` is the trusted application origin used in email links. It is not derived from the request `Host` header.
- Vercel deployments must set `DATABASE_PROVIDER=supabase`.
- `.env.local` is ignored by git and should stay local.

After changing `.env.local`, restart the dev server:

```bash
npm run dev
```

## Optional Fictional Demo Data Tooling

The optional `demo:reset` and `demo:verify` commands prepare and inspect fictional research-presentation records. They are separate from migrations and `supabase/seed.sql`; they do not change schema, RLS, or the main program and subject seed.

- `npm run demo:reset -- --dry-run` validates the configured project and prints the planned fictional state without changing data.
- `npm run demo:reset` requires `SUPABASE_SERVICE_ROLE_KEY`, `DEMO_STUDENT_PASSWORD`, and the exact `DEMO_RESET_CONFIRM=RESET_PKM_DES_DEMO` value.
- `npm run demo:verify` is read-only.

Run these commands only against a dedicated preview or test database with no live institutional data. See [DEMO_USER_GUIDE.md](../demo/DEMO_USER_GUIDE.md) and [DEMO_RESET.md](./DEMO_RESET.md).

## Migration Files

Apply these files in filename order:

1. `supabase/migrations/20260502000000_initial_schema.sql`
2. `supabase/migrations/20260502000100_security_helper_cleanup.sql`
3. `supabase/migrations/20260502000200_revoke_trigger_function_api_execute.sql`
4. `supabase/migrations/20260502000300_enrollment_submission_integrity.sql`
5. `supabase/migrations/20260502000400_official_student_records.sql`
6. `supabase/migrations/20260618000000_enrollment_term_uniqueness.sql`
7. `supabase/migrations/20260714000000_student_account_claim_integrity.sql`
8. `supabase/migrations/20260715000000_atomic_student_enrollment_submission.sql`
9. `supabase/migrations/20260715011914_atomic_admin_enrollment_review.sql`

Remote migrations recorded by Supabase MCP:

- `initial_schema`
- `security_helper_cleanup`
- `revoke_trigger_function_api_execute`
- `enrollment_submission_integrity`
- `official_student_records`
- `enrollment_term_uniqueness`

## Student Account Claim Integrity Migration

Migration: `supabase/migrations/20260714000000_student_account_claim_integrity.sql`

The migration first checks for normalized duplicates before changing any row. It then normalizes profile and official-record emails to lowercase trimmed text, and Student ID values to trimmed text with blank values converted to `null`. It adds `profiles_email_unique` on `lower(email)` and `students_student_id_number_unique` for non-null Student IDs.

Duplicates must be resolved manually before applying this migration. It does not delete or merge rows. Do not apply it when any of these read-only preflight queries returns rows:

```sql
select lower(btrim(email)) as normalized_email, count(*)
from public.profiles
group by lower(btrim(email))
having count(*) > 1;

select nullif(btrim(student_id_number), '') as normalized_student_id, count(*)
from public.students
where nullif(btrim(student_id_number), '') is not null
group by nullif(btrim(student_id_number), '')
having count(*) > 1;

select lower(btrim(email)) as normalized_email, count(*)
from public.official_student_records
group by lower(btrim(email))
having count(*) > 1;

select nullif(btrim(student_id_number), '') as normalized_student_id, count(*)
from public.official_student_records
where nullif(btrim(student_id_number), '') is not null
group by nullif(btrim(student_id_number), '')
having count(*) > 1;
```

This migration is tracked in the repository but has not been applied to a remote Supabase project from this branch.

## Initial Schema Migration

File:

```text
supabase/migrations/20260502000000_initial_schema.sql
```

Created:

- `profiles`
- `students`
- `programs`
- `subjects`
- `enrollments`
- `enrollment_subjects`
- `enrollment_decision_notifications`
- `grades`
- `class_schedules`
- `balances`
- `audit_logs`
- `official_student_records`

Also created:

- `public.set_updated_at()`
- update triggers for timestamped tables
- status/type check constraints
- foreign key relationships
- row level security policies

## Security Cleanup Migrations

Files:

```text
supabase/migrations/20260502000100_security_helper_cleanup.sql
supabase/migrations/20260502000200_revoke_trigger_function_api_execute.sql
```

Why they were added:

- Supabase security advisor warned that a helper function had a mutable `search_path`.
- It also warned that public `SECURITY DEFINER` functions could be executed through the API surface.

What changed:

- Created a `private` schema for internal helper logic.
- Moved the admin-check helper to `private.is_admin()`.
- Updated RLS policies to call `private.is_admin()`.
- Dropped the public `is_admin()` helper.
- Replaced the student-facing `mark_own_enrollment_pending()` RPC with a database trigger.
- Added `public.mark_student_pending_after_enrollment()` as an insert trigger on `enrollments`.
- Revoked API-role execution from the trigger function.
- Set stable `search_path` values on helper functions.

Current result:

- Supabase security advisor returned no security lints after the cleanup migrations.

## Historical Enrollment Submission Integrity Migration

File:

```text
supabase/migrations/20260502000300_enrollment_submission_integrity.sql
```

This earlier migration added an interim direct-table submission path. Its student insert and cleanup policies are removed by the atomic submission migration below.

It originally added:

- An initial partial unique index for active enrollment records, later replaced by the term uniqueness migration below.
- A narrow RLS insert policy for `enrollment_subjects`.
- The policy allows students to attach subjects only to their own `PENDING` enrollment and only when each subject matches the enrollment's program, year level, and semester.
- A cleanup-only delete policy for student-owned pending enrollment rows that do not yet have attached subjects.
- A delete trigger that recalculates `students.enrollment_status` if a newly created enrollment has to be cleaned up.

## Enrollment Term Uniqueness Migration

File:

```text
supabase/migrations/20260618000000_enrollment_term_uniqueness.sql
```

What it adds:

- Drops the active-only unique index from the earlier enrollment integrity migration.
- Adds a full unique index on `student_id`, `academic_year`, and `semester`.
- Enforces the client-confirmed rule that a rejected enrollment cannot be resubmitted for the same academic year and semester.

## Atomic Standard-Load Enrollment Migration

File:

```text
supabase/migrations/20260715000000_atomic_student_enrollment_submission.sql
```

The latest multi-program migration replaces the BSAIS-only fallback with `public.submit_standard_student_enrollment(p_academic_year text, p_semester text)`. The server action reads the authoritative active term from `public.enrollment_terms` and supplies its academic year and semester; the authenticated RPC derives the student, program, year level, and student type internally, then validates the supplied term against the database-approved active term. It permits Incoming 1st Year, Old, Continuing, and Regular Student records only when an active, complete `standard_load_sets` row and matching `course_offerings` exist for that program, term, and year level. It creates one `PENDING` enrollment and attaches the exact configured offering set in one transaction.

The function accepts no browser-selected student, program, year, term, status, or subject values. A term mismatch returns `term_not_open` and creates no enrollment or student-status change. It returns controlled outcomes, handles unique-index races as a duplicate result, and rolls back entirely if attachment fails. Students retain read access to their own enrollment rows and attached subjects, while direct student inserts into `enrollments` and `enrollment_subjects` are removed. Registrar management of enrollment-subject rows remains restricted by the admin RLS policy.

The current approved MVP term is `AY 2025-2026`, `2nd Semester`, taken from the client-provided `LIST OF COURSES FOR 2ND SEM AY 25-26.xlsx`. Until an approved academic-calendar module exists, changing terms requires coordinated forward migrations for the authoritative `enrollment_terms` row, application display, and corresponding standard-load configuration. The browser cannot choose or submit the term.

## Generic Standard-Load Configuration

Migration:

```text
supabase/migrations/20260802060000_multi_program_standard_load_enrollment.sql
```

`standard_load_sets` is the explicit Registrar-managed configuration for a program, academic year, semester, and year level. An `ACTIVE` row records the expected course count, expected total units, and source document. The generic enrollment RPC loads matching `course_offerings` by the trusted student program/year and the configured source document, then refuses submission when the count or total units does not match the configuration.

The follow-up migration `20260803000000_secure_standard_load_data_access.sql`
serializes standard-load, course-offering, and active-term writes with the same
transaction advisory lock acquired by the enrollment wrapper. This keeps the
validated configuration and attached offering set stable for one submission.
The `standard_load_sets.updated_at` column is also maintained by the shared
update trigger.

The following follow-up migrations keep the operational path explicit:

- `20260803000002_harden_enrollment_subject_snapshots.sql` makes legacy subject references nullable and restricts subject deletion while preserving admin attachment management.
- `20260803000003_shared_standard_load_submission_lock.sql` uses a shared advisory lock for student submissions so configuration writes cannot race the validation-and-attachment transaction.
- `20260803000004_grant_catalog_read_access.sql` grants authenticated catalog access required by the Subject List and Registrar program controls; RLS still limits writes to admins.
- `20260803000005_grant_standard_load_service_role_write.sql` grants configuration tooling the service-role write privileges needed for serialized standard-load updates.

Migration `20260803000001_activate_workbook_enrollment_term.sql` activates the supplied workbook term as the client-provided operational MVP load. It creates 36 ACTIVE complete standard-load configurations for the workbook's exact program/year combinations and fails closed if any configured count or unit total does not match its source rows. BSAIS 4th Year, BSMA 4th Year, and CRIM 3rd and 4th Year remain unavailable because the source has no complete course rows for them.

`enrollment_subjects` supports both legacy `subject_id` rows and new `course_offering_id` rows, never both in one row. The legacy `subject_id` column is nullable and uses `ON DELETE RESTRICT` so referenced subjects cannot be removed. Every attachment stores non-null `course_code`, `course_description`, and `units` snapshots so draft registration forms remain readable even if source catalog text changes. Students can read their own rows but cannot insert, update, or delete them directly; the admin policy remains available for Registrar management.

### Read-Only Integrity Checks

Run these queries only to inspect a safe preview or test database. Do not silently delete or rewrite inconsistent records.

```sql
select e.id, e.student_id, e.academic_year, e.semester, e.status
from public.enrollments e
where not exists (
  select 1
  from public.enrollment_subjects es
  where es.enrollment_id = e.id
);

select e.id as enrollment_id, es.subject_id
from public.enrollments e
join public.enrollment_subjects es on es.enrollment_id = e.id
join public.subjects s on s.id = es.subject_id
where s.program_id <> e.program_id
   or s.year_level <> e.year_level
   or s.semester <> e.semester;

select student_id, academic_year, semester, count(*)
from public.enrollments
group by student_id, academic_year, semester
having count(*) > 1;

select
  s.id as student_id,
  s.enrollment_status as stored_status,
  case
    when exists (select 1 from public.enrollments e where e.student_id = s.id and e.status = 'APPROVED') then 'ENROLLED'
    when exists (select 1 from public.enrollments e where e.student_id = s.id and e.status = 'PENDING') then 'PENDING'
    else 'NOT ENROLLED'
  end as derived_status
from public.students s
where s.enrollment_status <> case
  when exists (select 1 from public.enrollments e where e.student_id = s.id and e.status = 'APPROVED') then 'ENROLLED'
  when exists (select 1 from public.enrollments e where e.student_id = s.id and e.status = 'PENDING') then 'PENDING'
  else 'NOT ENROLLED'
end;
```

## Seed Data

File:

```text
supabase/seed.sql
```

The current seed creates a catalog of 10 program records: `BSAIS`, `BSMA`, `BEED`, `ENGLISH`, `FILIPINO`, `MATH`, `SS`, `CRIM`, `ACP`, and `FSM`.

Only `BSAIS` has 56 seeded curriculum subject rows, totaling 167 units, from the supplied subject reference. The seed does not create curriculum subject rows for the other program catalog entries. These rows remain a curriculum reference; the generic standard-load RPC uses the active workbook `course_offerings` rows instead.

The program catalog contains ten canonical programs, and the Subject List includes 245 unique workbook-derived offerings for all ten. Online enrollment is program-agnostic in schema and RPC design, and the active workbook migration provides 36 complete standard-load configurations. BSAIS 4th Year, BSMA 4th Year, and CRIM 3rd and 4th Year remain fail-closed because their source combinations are incomplete.

## Term Course Offerings From Workbook

Source artifact:

- `LIST OF COURSES FOR 2ND SEM AY 25-26.xlsx`, recorded in [SOURCE_DOCUMENT_REGISTER.md](../reference/SOURCE_DOCUMENT_REGISTER.md). The original workbook is intentionally excluded from the public repository.

Current MVP behavior:

- The app displays the client-provided `AY 2025-2026`, `2nd Semester` course enrollment load for the student's program.
- These display-only offerings are source-labeled on the Student Subject List page.
- The workbook is treated as term offering data, not as a full curriculum replacement.
- These rows are stored in `public.course_offerings` as the client-provided term source. Matching ACTIVE `standard_load_sets` rows determine which complete program/year loads can be submitted online.

Source limitations:

- The workbook contains two identical BSAIS blocks.
- The workbook shows a 4th Year BSAIS total of 6 units but no visible 4th Year BSAIS course rows.
- Enrollment submission attaches the exact matching workbook rows only when the corresponding ACTIVE `standard_load_sets` configuration has the same course count and total units.

### BSAIS Alias Repair Timestamp Behavior

The BSAIS alias-repair migration preserves grade values, remarks, and `created_at` during compatible subject merges. It does not preserve historical `updated_at` values: the existing `public.set_updated_at()` trigger intentionally replaces `updated_at` with the migration transaction timestamp whenever a grade row is updated. The disposable collision fixture verifies this behavior and requires explicit simulated Registrar resolution before a conflicting non-null grade is removed.

## RLS Policy Summary

Profiles:

- Authenticated users can select their own profile.
- Admins can select profiles.
- Admins can update profiles.

Programs:

- Authenticated users can select programs.
- Admins can manage programs.

Students:

- Students can select their own student record.
- Admins can select and update student records.

Subjects:

- Authenticated users can select subjects.
- Admins can manage subjects.

Enrollments:

- Students can select their own enrollments.
- Students submit standard-load requests only through the narrow authenticated atomic RPC.
- Admins can select and update all enrollments.

Enrollment subjects:

- Students can select their own enrollment-subject rows.
- Admins can manage enrollment-subject rows.

Grades:

- Students can select their own grades.
- Admins can manage grades later.

Class schedules:

- Authenticated users can select class schedules.
- Admins can manage class schedules later.

Balances:

- Students can select their own balances.
- Admins can manage balances later.

Audit logs:

- Admins can select audit logs.
- Admin actions can insert audit logs.

Official student records:

- Admins can select official student/admitted-applicant records.
- Admins can insert official records.
- Admins can update official records.
- Students cannot read official record lists directly.

## Auth and Login Setup

### Private Preview Credentials

For an authorized research-demo preview, use the guarded local workflow in [PREVIEW_CREDENTIALS.md](./PREVIEW_CREDENTIALS.md). It prepares unique passwords only for the allowlisted fictional student accounts, verifies the existing Registrar/Admin account without modifying it, and writes the credential manifest only under ignored `.preview/`. It is not a production account-provisioning process.

### Student Login

For the MVP Create Student Account page to work:

1. Add `SUPABASE_SERVICE_ROLE_KEY` to `.env.local`.
2. Restart the dev server.
3. Open `/create-account`.
4. Create or verify an official student record with the selected student type, active email address, and Student ID Number.
5. Set `ACCOUNT_CLAIM_SECRET` to a private value of at least 32 characters.
6. Open `/create-account` and claim the exact official record.
7. Log in at `/login`.

Account status behavior:

- Every public student type -> `ACTIVE` only after claiming an exact matching official record using student type, email, and Student ID Number
- Duplicate account creation is blocked by both server checks and database uniqueness indexes for profile email and Student ID Number

Only `ACTIVE` accounts can log in.

For setup-link accounts, the setup action first confirms that the authenticated profile is exactly a `student` with `SETUP` status. It updates the password, then calls a database-authorized, idempotent transition to `ACTIVE`. If the final transition is temporarily unavailable, the account remains unable to log in and the student can submit the same form again while the setup session is still open.

Health Record Update applicability is recalculated from the current Registrar-managed official record whenever the student or Registrar view is rendered. The stored status is used only when that current record makes the requirement applicable.

### Disposable Local Database Verification

After Docker and the Supabase CLI are available, reset a local-only stack and run the focused verification script. It uses fictional records in one transaction and rolls them back.

```powershell
npx supabase db reset --local --no-seed --yes
Get-Content -Raw scripts/integration/verify-local-supabase-workflows.sql |
  docker exec -i supabase_db_PKM-DES psql -U postgres -d postgres -v ON_ERROR_STOP=1
.\scripts\integration\verify-local-supabase-concurrency.ps1
```

The concurrency runner creates separate fictional records for parallel review and setup-email delivery calls, then resets the local stack when it finishes. Do not run either verification script against a linked, preview, or institutional database.

The transactional fixture grants `authenticated` read access to `public.students` only for the duration of its local rollback transaction because the existing requirement ownership policy resolves through that table. This test-only grant does not change a migration or production permissions.

Current client direction:

- Every student type is matched against official Registrar-provided data before account access.
- The target workflow is system-generated passwords sent by email, with students allowed to change passwords later.
- PKM-DES does not generate passwords. Its default MVP path uses a self-selected password; an optional server-only one-time setup-link path can be enabled only with `EMAIL_DELIVERY_ENABLED=true`, `GMAIL_SMTP_USER`, `GMAIL_SMTP_APP_PASSWORD`, `EMAIL_FROM`, and a trusted `APP_BASE_URL`.
- The setup-link path is disabled by default and requires the Supabase Auth redirect allowlist to include `${APP_BASE_URL}/auth/callback` before it is used.
- Setup-link delivery has a five-minute server-side delivery cooldown. It is reserved before email delivery so concurrent requests do not send multiple links.
- After a successful Registrar approval or rejection, the server loads the student's recipient address from the enrollment record and can send a decision notification through the same adapter. Rejection remarks are not included in the email; students can view them in the authenticated portal.
- Decision notifications are disabled by default. If delivery is not configured or the provider fails, the enrollment decision remains saved and the Pending Enrollments page shows a manual-contact warning. Delivery failure does not roll back the Registrar decision.

Student password changes:

- Signed-in students can change their password from `/student/account`.
- The form verifies the current password using Supabase Auth before calling `auth.updateUser`.
- This uses the authenticated student session and does not require service-role access.

Admin password changes:

- Signed-in admins can view internal account details and change their password from `/admin/account`.
- The form uses the same authenticated Supabase Auth password-change flow as student accounts.
- Admin accounts remain internal; public admin registration is not exposed.

Student password resets by an admin:

- An admin can reset a student password from `/admin/students/[recordId]/edit` only when the official record has an exact active student account match by email and Student ID.
- The server re-fetches the official record, student row, profile, and Supabase Auth user before calling the server-only `auth.admin.updateUserById` API. The browser never supplies an Auth user ID.
- The admin enters a temporary password and shares it privately. PKM-DES does not store, display again, or email that password, and this MVP does not force a password change on the next login.
- Successful resets write a `RESET_STUDENT_PASSWORD` audit entry when the existing admin audit-log policy is available. Do not use this preview workflow as a substitute for a formally approved institutional password-reset policy.

### Admin Login

Admin accounts are internal and are not created through public registration.

Designated Registrar account details are distributed privately. The role is `Registrar`.

1. Go to Supabase Dashboard -> Authentication -> Users.
2. Add an admin user with email and password. Do not commit or paste that password into project files or chat.
3. Copy the new Auth user UUID.
4. Open `supabase/registrar_admin_setup.example.sql`.
5. Replace `<auth-user-uuid>` with the copied UUID.
6. Run the SQL in Supabase SQL editor.

The MVP database role value is `admin` for the Registrar / authorized enrollment staff account.

Then log in at `/login` with the admin email and password.

## Enrollment Flow in Supabase

Current MVP term:

- Online enrollment uses the authoritative open term in `public.enrollment_terms`, currently `AY 2025-2026`, `2nd Semester` from the supplied workbook.
- The form displays that term as read-only, and the atomic database submission rule does not accept another term from the browser.
- Additional selectable terms require PKM's official academic calendar before being opened.

Student submission:

1. The browser submits only certification; the authenticated RPC derives the student record, program, year level, student type, and term.
2. It accepts standard loads for Incoming 1st Year, Old, Continuing, and Regular Student records only when a complete active configuration exists for the trusted program/year/term. Transferee and Irregular Student records require Registrar-managed subject assignment.
3. The RPC uses the server-supplied authoritative active term, currently `AY 2025-2026`, `2nd Semester`, checks existing student-term rows, then resolves matching workbook offerings.
4. One transaction inserts the `PENDING` enrollment and the complete matching `public.enrollment_subjects` set.
5. The unique student-term index remains the authority for duplicate races; a duplicate returns a safe user-facing message.
6. A failed attachment rolls back the enrollment, attachment rows, and pending-status trigger update together.
7. The enrollment insert trigger updates the student's `enrollment_status` to `PENDING` only after successful submission.
8. The pending record appears in Admin Pending Enrollments.

Printable registration form:

1. Student or admin opens a registration form page for an existing enrollment.
2. App reads the enrollment, student profile, program, and attached `enrollment_subjects` rows under existing RLS policies.
3. App renders an MVP draft browser-print form from existing enrollment data.
4. The form includes a generated date, source note, attached subjects, total units, student certification context, and Registrar review context.
5. The form intentionally remains a draft output until PKM provides the official COR / registration form template.

Enrollment reports:

1. Admin opens `/admin/reports`.
2. App loads programs, enrollment records, student profiles, and program details through existing admin RLS policies.
3. The page canonicalizes supported program, academic year, year level, semester, review-status, and student identity search criteria before using them in the query or printed report.
4. App reads every matching submitted enrollment record in deterministic pages before applying the in-memory student identity search and calculating totals.
5. Admin can reset filters back to the full report.
6. App renders status summary counts, a human-readable criteria summary, and a browser-printable enrollment report table. Query failures show an unavailable state rather than zero totals or an empty report.
7. Official PDF/export generation remains pending until PKM supplies the required report format.

Admin review:

1. Admin can review only a submitted `PENDING` request from `/admin/enrollments`; the research MVP does not include an official requirements or document checklist.
2. The server action calls `public.review_pending_enrollment(...)` with the request ID, decision, and optional free-text rejection remarks. The database derives the active reviewer from `auth.uid()`.
3. The `SECURITY DEFINER` function verifies the active admin profile, locks the request and related student row, then updates the review decision, recalculates the summarized student status, and writes one audit log row in the same transaction.
4. An approval stores `APPROVED` with null remarks. A rejection stores `REJECTED` with trimmed optional free-text remarks.
5. A concurrent or stale second review returns an already-reviewed outcome and cannot overwrite the first decision or add another audit row.
6. Unexpected RPC failures roll back the full transaction. Rejected same-term requests remain non-resubmittable under the existing enrollment term-unique rule.

Approval-load validation and decision notifications:

- An approval also requires at least one attached subject snapshot, nonblank course code and description values, nonnegative units, and a positive total unit load. The RPC returns `invalid_enrollment_load` before changing the enrollment, student summary, audit log, or notification outbox when this validation fails.
- Migration `20260805000000_enrollment_decision_notification_outbox.sql` creates one durable `PENDING` outbox row for each successful `APPROVED` or `REJECTED` decision in the same database transaction. The unique `(enrollment_id, decision)` constraint prevents duplicate notification records.
- The outbox stores delivery state and the recipient address only. It does not store rejection remarks or rendered email content. RLS denies ordinary authenticated inserts and updates; the narrow authenticated admin RPCs reserve, mark sent, or mark failed rows.
- Reservation uses row locking and a reservation token so concurrent workers cannot process the same pending or retryable failed row at once. The server sends only the reserved snapshot and records safe codes such as `not_configured`, `invalid_recipient`, or `provider`.
- Enrollment decision email delivery is disabled by default. When configured, a failed delivery leaves the Registrar decision intact and marks the outbox row `FAILED`; an admin can retry it from the individual registration-form view. A successful retry is idempotent once the row is `SENT`.
- No live email is sent by migrations or local SQL verification fixtures. Apply the migration and run delivery checks only in an isolated fictional-data environment with an approved sender.

Run review RPC validation only against a disposable local or preview database. Do not run concurrency or forced-failure tests against institutional data.

## Official Student Records

The `official_student_records` table stores Registrar-managed student or admitted-applicant records for future account matching.

Current MVP behavior:

1. Admin opens `/admin/students`.
2. Admin manually enters an official record.
3. App validates required fields, email format, dropdown values, and selected program.
4. App inserts the record through the authenticated Supabase server client under admin-only RLS.
5. Admin can search and filter official records by name/email/Student ID, program, year level, student type, and enrollment status.
6. Admin can see page-scoped account-match status for displayed official records.
7. Admin can open an existing official record, edit the same validated fields, and update it through admin-only RLS.
8. Common fields use guided MVP controls: Gender/Sex, Civil Status, Admission Status, Student Type, Year Level, and Enrollment Status.
9. Saving or updating an official record does not create or update an Auth account, student account, or enrollment record. The student must claim the account, log in, and submit Online Enrollment before the record appears in Pending Enrollments, Masterlist, or dashboard counts.
10. The Student ID remains format-flexible until PKM confirms an official validation rule. Bulk import is not implemented.

Account-match display:

- Email match checks student profiles with the same normalized email address.
- Student ID match checks student records with the same normalized Student ID Number when the official record has one.
- The list labels the result as an exact match, email-only match, Student-ID-only match, identity conflict, no account, or unavailable lookup. Partial and conflicting identifiers are surfaced for Registrar review and are never repaired automatically.
- The official-record enrollment-status field is source metadata only. The display does not activate accounts, change records, create enrollment requests, or create new verification rules.

Student account profile display:

- The student Account page always shows account profile and student record fields available through normal student access.
- When server-side service-role configuration is available, the page also performs an exact matching lookup against `official_student_records`.
- The lookup matches by student profile email first, then by Student ID Number when available.
- Only the matching official record is displayed to the signed-in student; students still do not browse official record lists.
- If no matching official record is found, the page shows a clear empty state and keeps the core account details visible.

Not implemented in this branch:

- CSV import
- Generated-password email delivery
- Registrar-managed deactivation/archive workflow

## Account Matching

Create Student Account now uses the server-only Supabase admin client to check official records before creating Supabase Auth users.

Current behavior:

1. Student first chooses a student type and enters active email address and Student ID Number.
2. Claims look for one official record using the normalized exact email-and-Student-ID pair.
3. Missing records, mismatched values, incompatible types, and existing accounts return the same generic public result.
4. When a matching record exists, the app shows only a masked recognition summary and asks for password and confirmation.
5. The server stores a short-lived signed claim proof in an HTTP-only cookie; the browser never receives the official-record ID or raw official details.
6. Final account creation re-fetches the official record, revalidates its fingerprint and compatible type, then creates Supabase Auth, profile, and student records.
7. Before creating an Auth user, the app blocks duplicates by existing profile email or existing student Student ID Number; database indexes enforce the same uniqueness.
8. The Auth user stores role/account hints in app metadata only; route protection and RLS still rely on `public.profiles`, not user-editable metadata.

Remaining gaps:

- Official CSV/import format is still needed.
- Generated initial passwords remain a placeholder. A one-time account setup-link delivery path is available only when explicitly configured and remains disabled by default.
- Guided official-record field options are provisional MVP values until PKM supplies official value lists.
- No additional admitted-applicant status rules are enforced because PKM has not supplied final status values.

## Verification Queries

Seed verification:

```sql
select
  (select count(*) from public.programs) as programs_count,
  (select count(*) from public.subjects) as subjects_count,
  (select coalesce(sum(units), 0) from public.subjects) as total_units;
```

Expected:

- `programs_count`: 10
- `subjects_count`: 56
- `total_units`: 167

Table check:

```sql
select tablename
from pg_tables
where schemaname = 'public'
order by tablename;
```

Data API exposure check:

Supabase changed new-table exposure behavior in 2026. The migration
`20260803000000_secure_standard_load_data_access.sql` explicitly grants the
authenticated role read access to `standard_load_sets`, `course_offerings`, and
`enrollment_terms`; it also grants the service role read access for trusted
server-side tooling. The `standard_load_sets` table grants the authenticated
role the DML privileges needed by its admin-only RLS policy. RLS remains the
row-level authorization boundary. If authenticated app queries unexpectedly
return table-access errors after a fresh project setup, confirm these grants
and that RLS is enabled. Do not disable RLS to fix access.

Use this SQL to inspect exposed public-table grants:

```sql
select
  table_name,
  grantee,
  privilege_type
from information_schema.role_table_grants
where table_schema = 'public'
  and grantee in ('anon', 'authenticated')
order by table_name, grantee, privilege_type;
```

## Notes and Boundaries

- Designated Registrar account details are distributed privately and must not be committed to project documentation.
- Official admitted-applicant matching is implemented for manual official records, but import format, sample data, and generated-password delivery remain future work. Setup-link delivery is opt-in, server-only, and disabled by default.
- No official COR template was provided, so only an MVP draft browser-print registration form is implemented; official COR/PDF output remains future work.
- No official grading, schedule, or balance format was provided, so those modules remain placeholders.
- The Subject List uses source-derived curriculum and client-provided workbook course-enrollment data for display. Current enrollment attachment is driven by active standard-load configuration and course-offering rows; seeded BSAIS curriculum subjects remain a separate curriculum reference.
