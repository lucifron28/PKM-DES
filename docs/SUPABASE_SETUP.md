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

Remote migrations recorded by Supabase MCP:

- `initial_schema`
- `security_helper_cleanup`
- `revoke_trigger_function_api_execute`

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

## Auth and Login Setup

### Student Login

For the MVP Create Student Account page to work:

1. Add `SUPABASE_SERVICE_ROLE_KEY` to `.env.local`.
2. Restart the dev server.
3. Open `/create-account`.
4. Create an account using Student Type `Old Student` for immediate testing.
5. Log in at `/login`.

Account status behavior:

- `Old Student` -> `ACTIVE`
- `Incoming 1st Year Student` -> `PENDING`
- `Transferee` -> `PENDING`

Only `ACTIVE` accounts can log in.

### Admin Login

Admin accounts are internal and are not created through public registration.

1. Go to Supabase Dashboard -> Authentication -> Users.
2. Add an admin user with email and password.
3. Copy the new Auth user UUID.
4. Run this SQL in Supabase SQL editor:

```sql
insert into public.profiles (
  id,
  role,
  first_name,
  last_name,
  email,
  account_status
)
values (
  '<auth-user-uuid>',
  'admin',
  '<admin-first-name>',
  '<admin-last-name>',
  '<admin-email>',
  'ACTIVE'
);
```

Then log in at `/login` with the admin email and password.

## Enrollment Flow in Supabase

Student submission:

1. Student submits Online Enrollment.
2. App inserts into `public.enrollments` with status `PENDING`.
3. Database trigger updates the student's `enrollment_status` to `PENDING`.
4. Pending record appears in Admin Pending Enrollments.

Admin approval:

1. Admin approves the pending enrollment.
2. App updates enrollment status to `APPROVED`.
3. App updates student `enrollment_status` to `ENROLLED`.
4. App inserts an audit log row.

Admin rejection:

1. Admin rejects the pending enrollment.
2. App updates enrollment status to `REJECTED`.
3. App stores optional remarks.
4. App keeps the student out of `ENROLLED` status.
5. App inserts an audit log row.

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

- No official admin list was provided, so admin accounts must be created manually.
- No official admitted-applicant verification rules were provided, so PENDING account activation remains future work.
- No official COR template was provided, so COR/PDF output remains a placeholder.
- No official grading, schedule, or balance format was provided, so those modules remain placeholders.
- Subject List uses the same source-grounded AIS subject data locally for fast tab navigation and in Supabase for database-backed records.
