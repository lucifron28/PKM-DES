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

For Vercel deployment, keep `DATABASE_PROVIDER=supabase`. SQLite is local-development only and is documented separately in `docs/SQLITE_DEVELOPMENT.md`.

## What Was Done Through Supabase MCP

1. Listed Supabase projects and found the new `PKM-DES` project.
2. Applied the initial schema migration.
3. Ran the AIS program and subject seed SQL.
4. Verified seed totals:
   - Programs: 1
   - Subjects: 56
   - Total units: 167
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
- `.env.local` is ignored by git and should stay local.

After changing `.env.local`, restart the dev server:

```bash
npm run dev
```

## Migration Files

Apply these files in filename order:

1. `supabase/migrations/20260502000000_initial_schema.sql`
2. `supabase/migrations/20260502000100_security_helper_cleanup.sql`
3. `supabase/migrations/20260502000200_revoke_trigger_function_api_execute.sql`
4. `supabase/migrations/20260502000300_enrollment_submission_integrity.sql`
5. `supabase/migrations/20260502000400_official_student_records.sql`
6. `supabase/migrations/20260618000000_enrollment_term_uniqueness.sql`

Remote migrations recorded by Supabase MCP:

- `initial_schema`
- `security_helper_cleanup`
- `revoke_trigger_function_api_execute`
- `enrollment_submission_integrity`
- `official_student_records`
- `enrollment_term_uniqueness`

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

## Enrollment Submission Integrity Migration

File:

```text
supabase/migrations/20260502000300_enrollment_submission_integrity.sql
```

What it adds:

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

## Seed Data

File:

```text
supabase/seed.sql
```

Seeded one program:

- Name: `Accounting Information System`
- Code: `AIS`

Seeded 56 subject rows from the supplied Subjects.pdf list.

Verified totals:

- Programs: 1
- Subjects: 56
- Total units: 167

No other programs or subjects were invented.

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
- Students can insert their own enrollment request.
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

### Student Login

For the MVP Create Student Account page to work:

1. Add `SUPABASE_SERVICE_ROLE_KEY` to `.env.local`.
2. Restart the dev server.
3. Open `/create-account`.
4. Create an account using Student Type `Old Student` for immediate testing.
5. Log in at `/login`.

Account status behavior:

- `Old Student` -> `ACTIVE` when Student ID Number is provided
- `Incoming 1st Year Student` -> `ACTIVE` only when submitted details match an official record
- `Transferee` -> `ACTIVE` only when submitted details match an official record

Only `ACTIVE` accounts can log in.

Current client direction:

- Incoming 1st Year Students and Transferees are matched against official Registrar-provided data before account access.
- Old Student verification may use Student ID Number alone.
- The target workflow is system-generated passwords sent by email, with students allowed to change passwords later.
- The generated-password email workflow is not implemented yet and should be built before production use.

### Admin Login

Admin accounts are internal and are not created through public registration.

Initial client-provided Registrar account:

- Name: Shaira Mae E. Pajares
- Email: `pkmregistrarofficial@gmail.com`
- Role: Registrar

1. Go to Supabase Dashboard -> Authentication -> Users.
2. Add an admin user with email and password. Do not commit or paste that password into project files or chat.
3. Copy the new Auth user UUID.
4. Open `supabase/registrar_admin_setup.example.sql`.
5. Replace `<auth-user-uuid>` with the copied UUID.
6. Run the SQL in Supabase SQL editor.

The MVP database role value is `admin` for the Registrar / authorized enrollment staff account.

Then log in at `/login` with the admin email and password.

## Enrollment Flow in Supabase

Student submission:

1. Student submits Online Enrollment.
2. App checks for any existing enrollment for the same student, academic year, and semester.
3. If a duplicate exists, the submission is blocked with a safe user-facing message.
4. App inserts into `public.enrollments` with status `PENDING`.
5. Database trigger updates the student's `enrollment_status` to `PENDING`.
6. App queries matching subjects by program, year level, and semester.
7. App inserts matching rows into `public.enrollment_subjects`.
8. If subject attachment fails, the app deletes the newly created orphan enrollment where RLS allows cleanup.
9. Pending record appears in Admin Pending Enrollments.

Printable registration form:

1. Student or admin opens a registration form page for an existing enrollment.
2. App reads the enrollment, student profile, program, and attached `enrollment_subjects` rows under existing RLS policies.
3. App renders an MVP draft browser-print form from existing enrollment data.
4. The form intentionally remains a draft output until PKM provides the official COR / registration form template.

Enrollment reports:

1. Admin opens `/admin/reports`.
2. App reads enrollment records, student profiles, and programs through existing admin RLS policies.
3. Admin can filter by program, academic year, year level, semester, and review status.
4. App renders status summary counts and a browser-printable enrollment report table.
5. Official PDF/export generation remains pending until PKM supplies the required report format.

Admin approval:

1. Admin approves the pending enrollment.
2. App updates enrollment status to `APPROVED`.
3. App updates student `enrollment_status` to `ENROLLED`.
4. App inserts an audit log row.

Admin rejection:

1. Admin rejects the pending enrollment.
2. App updates enrollment status to `REJECTED`.
3. App stores optional remarks.
4. App recalculates the student's derived `enrollment_status` from all of that student's enrollment records.
5. App inserts an audit log row.

## Official Student Records

The `official_student_records` table stores Registrar-managed student or admitted-applicant records for future account matching.

Current MVP behavior:

1. Admin opens `/admin/students`.
2. Admin manually enters an official record.
3. App validates required fields, email format, dropdown values, and selected program.
4. App inserts the record through the authenticated Supabase server client under admin-only RLS.
5. Recent official records are shown on the same page.

Not implemented in this branch:

- CSV import
- Generated password email delivery
- Registrar-managed edits/deactivation beyond manual insert

## Account Matching

Create Student Account now uses the server-only Supabase admin client to check official records before creating Supabase Auth users.

Current behavior:

1. Old Student account creation requires Student ID Number and creates an `ACTIVE` account.
2. Incoming 1st Year Student and Transferee account creation looks for an official record by email.
3. The submitted first name, last name, program, year level, student type, and optional Student ID Number must match the official record.
4. If no matching official record exists, no Auth user or student profile is created.
5. When a match exists, the app creates an `ACTIVE` Supabase Auth user, profile, and student record using the official record values.

Remaining gaps:

- Official CSV/import format is still needed.
- Generated initial password and email delivery are still placeholders.
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

- `programs_count`: 1
- `subjects_count`: 56
- `total_units`: 167

Table check:

```sql
select tablename
from pg_tables
where schemaname = 'public'
order by tablename;
```

## Notes and Boundaries

- The initial client-provided Registrar account is Shaira Mae E. Pajares, `pkmregistrarofficial@gmail.com`.
- Official admitted-applicant matching is implemented for manual official records, but import format, sample data, and generated password/email delivery remain future work.
- No official COR template was provided, so only an MVP draft browser-print registration form is implemented; official COR/PDF output remains future work.
- No official grading, schedule, or balance format was provided, so those modules remain placeholders.
- Subject List uses the same source-grounded AIS subject data locally for fast tab navigation and in Supabase for database-backed records.
