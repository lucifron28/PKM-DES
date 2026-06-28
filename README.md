# Digital Enrollment System - Pambayang Kolehiyo ng Mauban (PKM-DES)

## 1. Project Overview

PKM-DES is the first MVP of a web-based enrollment and student information system for Pambayang Kolehiyo ng Mauban. It digitizes the basic account, subject-list, enrollment submission, enrollment review, and masterlist workflow while leaving official institutional policies as documented placeholders.

Some data in the FRD is marked as for revision, pending requirements, or work in progress. For this MVP, missing institutional data is represented through placeholders and documented future inputs instead of invented system rules.

Manual enrollment background from the FRD: students receive four registration-form copies, collect professor, Dean, Library, Clinic/Nurse, and Accounting Office signatures, submit final copies to Accounting, receive one copy back, and receive a blank class card for the next semester. Digital clearance and signature routing are documented as future enhancements, not implemented in this MVP.

## 2. Tech Stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- Supabase Auth
- Supabase PostgreSQL
- Supabase Row Level Security
- SQLite local development database setup
- Supabase Storage: not used in this MVP
- Browser printing for MVP draft registration forms; official PDF/COR generation remains pending until an official template is supplied

## 3. Source Documents Used

- `data-sources/About Us.pdf`: PKM identity, About content, vision, mission, goals, address, email, website, and social links
- `data-sources/Subjects.pdf`: initial Accounting Information System subject seed list
- `docs/frd-files/LIST OF COURSES FOR 2ND SEM AY 25-26.xlsx`: source for displayed BSAIS course offerings for SY 2025-2026, 2nd Semester
- `data-sources/FRD1.pdf`: expected outputs, functional requirements, manual enrollment process, and study objectives
- `data-sources/Joshua.pdf`: system overview, navigation structure, public pages, student module, admin module, login behavior, account behavior, enrollment behavior, empty states, and missing-information warnings
- `docs/CLIENT_INPUTS_AND_OPEN_ITEMS.md`: client-provided answers to FRD gaps and remaining required files/decisions

## 4. Current MVP Scope

- Public pages: Home, Login, Create Student Account, About Us
- Student pages: Dashboard, Online Enrollment, Subject List, Enrollment Status Result, Grades placeholder, Class Schedule placeholder, Balances placeholder, Account, Logout
- Admin pages: Dashboard, Pending Enrollments, Enrollment Masterlist, Student Records official-record management, Encode Grades/Schedule placeholder, Logout
- Admin reporting: Enrollment Reports with filters, status summaries, and browser-print output
- Database: Supabase schema, RLS policies, audit log table, and seed data for one AIS program and the provided subject list

## 5. Features Implemented

- Modern academic UI using the supplied PKM blue and yellow palette
- PKM and Municipality of Mauban logo images applied to the public header, home page, app shell, and printable registration form
- Supabase-backed login with active-account checks
- Role-based protection for student and admin areas
- Production environment check for Supabase/Vercel configuration
- Student account creation through Supabase Auth when `SUPABASE_SERVICE_ROLE_KEY` is configured
- Create-account dropdown values exactly as requested: Incoming 1st Year Student, Transferee, Old Student
- Incoming 1st Year Student and Transferee account creation requires a matching official Registrar-managed record
- Old Student accounts require a Student ID Number
- Create-account flow blocks duplicate student accounts by email address or Student ID Number before Auth user creation
- Matched student accounts become `ACTIVE`
- Student dashboard with student information, enrollment status, and quick actions
- Subject List grouped into separate tables by year level and semester, with a working year-level filter
- Subject List includes source-labeled BSAIS course offerings for SY 2025-2026, 2nd Semester
- Online enrollment form that creates a `PENDING` enrollment record
- Duplicate enrollment submissions are blocked for the same student, academic year, and semester when any enrollment record already exists
- Successful enrollment submissions attach matching subjects into `enrollment_subjects`
- Transferee and Irregular Student subject loads are blocked from auto-loading and marked for Registrar-managed subject assignment
- Database trigger that marks the student `enrollment_status` as `PENDING` after enrollment submission
- Admin dashboard with pending, approved, rejected, and total enrollment record counts
- Admin Enrollment Reports page with program, academic year, year level, semester, and review-status filters
- Browser-printable enrollment report table for Registrar review
- Admin approve/reject enrollment actions
- Approval updates enrollment status to `APPROVED` and student status to `ENROLLED`
- Rejection updates enrollment status to `REJECTED`, stores optional remarks, and recalculates the student's derived enrollment status
- Audit log insert for approve/reject actions
- Enrollment masterlist with year-level and semester filters
- MVP draft printable registration form using existing enrollment and attached subject data
- Admin view/print access for individual enrollment registration forms
- Admin-managed official student/admitted-applicant records page for manual Registrar entry, search, filtering, and editing
- Official student records list displays derived student-account match status for Registrar review
- Faster student tab navigation through a student portal context and lighter placeholder routes

## 6. Placeholder Features

- Official COR PDF generation using the official PKM registration template
- Grades
- Class Schedule
- Balances
- Full student records module beyond Registrar-managed official account-matching records
- Encode Grades/Schedule
- Email-generated initial password workflow
- Digital clearance/signature routing

The Create Student Account page includes an MVP password setup block so local Supabase Auth testing can work. The official generated-password and email-sending workflow remains a placeholder until approved templates and rules are supplied.

## 7. Missing Information / Future Inputs Needed

Missing Information / Future Inputs Needed:
- Official COR / registration form template
- Official printable enrollment/masterlist report format
- Official student/admitted-applicant import file format
- Official student data sample, ideally anonymized
- Exact Student ID validation rule
- Official balances/payment format
- Official requirements/document checklist used for enrollment approval
- Complete list of other programs, if multi-program support is required
- Email service/template approval for generated passwords or account messages
- Final confirmation of official Accounting Information System program title
- Official process for irregular/transferee adjusted subject loading

## 8. Supabase Setup Instructions

Detailed Supabase documentation is in [docs/SUPABASE_SETUP.md](./docs/SUPABASE_SETUP.md).

SQLite local development notes are in [docs/SQLITE_DEVELOPMENT.md](./docs/SQLITE_DEVELOPMENT.md).

Development sample accounts are in [docs/SAMPLE_ACCOUNTS.md](./docs/SAMPLE_ACCOUNTS.md).

Short setup:

1. Create or open the Supabase project.
2. Copy environment variables into `.env.local` using `.env.example`.
3. Apply all SQL files in `supabase/migrations/` in filename order.
4. Run `supabase/seed.sql`.
5. Create an internal admin user in Supabase Auth.
6. Insert the matching admin row into `public.profiles` using `supabase/registrar_admin_setup.example.sql`.

Current connected Supabase project used during setup:

- Project name: `PKM-DES`
- Project ref: `sdivxyqdnvnyjqrsrzdq`
- Region: `ap-northeast-1`
- Project URL: `https://sdivxyqdnvnyjqrsrzdq.supabase.co`

The service-role key is not documented here and should never be pasted into chat or committed.

Initial Registrar setup template:

- File: `supabase/registrar_admin_setup.example.sql`
- Confirmed Registrar: Shaira Mae E. Pajares
- Email: `pkmregistrarofficial@gmail.com`
- Create the Supabase Auth user first, then replace `<auth-user-uuid>` in the template.

## 9. Environment Variables

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
DATABASE_PROVIDER=supabase
SUPABASE_SERVICE_ROLE_KEY=
```

`SUPABASE_SERVICE_ROLE_KEY` is server-only. It is used by the account creation action to create Supabase Auth users and must never be exposed in client code.

Use `DATABASE_PROVIDER=sqlite` only for local development. Vercel deployment must use `DATABASE_PROVIDER=supabase`.

## 10. How to Run Locally

```bash
npm install
npm run db:sqlite:init
npm run dev
```

Open:

```text
http://localhost:3000
```

Production-style local run:

```bash
npm run check:production-env
npm run build
npm run start
```

For Vercel, set `DATABASE_PROVIDER=supabase`. `DATABASE_PROVIDER=sqlite` is local-development only and the app includes a production guard against it.

## 11. Database Tables

- `profiles`
- `students`
- `programs`
- `subjects`
- `enrollments`
- `enrollment_subjects`
- `official_student_records`
- `grades`
- `class_schedules`
- `balances`
- `audit_logs`

RLS policies are included for student-owned records, admin review access, authenticated subject/schedule reads, and admin audit-log access. See [docs/SUPABASE_SETUP.md](./docs/SUPABASE_SETUP.md) for the policy summary.

## 12. Seed Data

The seed includes one program:

- Name: Accounting Information System
- Code: AIS

The exact official program title should be verified because the available Subjects.pdf contains Accounting Information System-related courses, but no separate formal program-title document was provided.

Subject summary from the source list:

- General Education: 36
- Core Accounting Education Courses: 81
- Professional Courses: 30
- CBME: 6
- PE: 8
- NSTP: 6
- Total Number of Units: 167

Remote seed verification on the configured Supabase project:

- Programs: 1
- Subjects: 56
- Total units: 167

No other programs or subjects are added.

## 13. Manual Test Checklist

Public:
- Home page loads.
- About Us page displays PKM information.
- Login page validates missing password.
- Create account page shows required fields.
- Create account page explains official record matching.

Student:
- Student can create an Old Student account when `SUPABASE_SERVICE_ROLE_KEY` is configured.
- Incoming 1st Year Student and Transferee account creation is blocked when no matching official record exists.
- Incoming 1st Year Student and Transferee account creation succeeds when submitted details match an official record.
- Duplicate account creation for an existing email address or Student ID Number is blocked.
- Student can log in.
- Student dashboard displays profile information.
- Student can view subject list.
- Student can view BSAIS course offerings labeled with SY 2025-2026 and 2nd Semester.
- Subject list displays separate tables by year level and semester.
- Student can filter subjects by year level and reset the filter.
- Student can submit enrollment form.
- Duplicate enrollment submission for the same academic year and semester is blocked.
- Rejected enrollment records cannot be resubmitted for the same academic year and semester.
- Successful enrollment submission creates matching `enrollment_subjects` rows.
- Transferee and Irregular Student self-submission shows the Registrar-managed subject loading notice.
- Enrollment status becomes PENDING.
- Student can open and browser-print the MVP draft registration form after enrollment submission.
- Draft registration form displays attached subjects and total units.
- Grades page shows empty state when no grades exist.
- Schedule page shows empty state when no schedule exists.
- Balances page shows empty state when no balance exists.

Admin:
- Admin can log in.
- Admin can view dashboard.
- Admin can view enrollment reports.
- Admin can filter enrollment reports by program, academic year, year level, semester, and review status.
- Admin can browser-print the enrollment report.
- Admin can add an official student/admitted-applicant record.
- Admin can search and filter official student/admitted-applicant records.
- Admin can see whether displayed official records already match a student account.
- Admin can edit an official student/admitted-applicant record.
- Admin can view pending enrollments.
- Admin can open and browser-print an individual enrollment registration form.
- Admin can approve enrollment.
- Approved student appears as ENROLLED.
- Admin can reject enrollment.
- Admin dashboard counts match enrollment review statuses across Pending Enrollments and Masterlist.
- Admin can view enrollment masterlist.
- Masterlist filters work.

Security:
- Student cannot access admin pages.
- Admin routes require admin role.
- Logged-out users cannot access protected pages.
- Students cannot view other students' private enrollment data.
- `npm run check:production-env` passes with the Vercel/Supabase environment variables configured.
- Supabase security advisor reports no current security lints after the cleanup migrations.

## 14. Known Limitations

- Incoming 1st Year Student and Transferee account creation now depends on official records, but bulk import is not implemented.
- Official regular/irregular/continuing classification rules are not implemented beyond Registrar-assigned tags.
- Registrar-managed subject loading for Transferee and Irregular Student records is not implemented yet, so those classifications cannot use the auto-loaded online enrollment submission path.
- Official rejection categories are not invented; rejection remarks are free text only.
- Browser-printable draft registration forms are implemented for MVP testing, but the official COR/PDF template is not implemented without PKM's official template.
- Enrollment reports are browser-printable MVP outputs; official export, PDF, or printable report format must be supplied before final report generation.
- Grades, schedule, balances, student records, and encode workflows are placeholders.
- Admin accounts are created internally through Supabase setup instructions, not public registration.
- The academic-year dropdown uses MVP options and needs the official academic calendar.
- Subject List uses source-grounded local seed data for fast student navigation; the same data is also seeded in Supabase.
- BSAIS course offerings from `LIST OF COURSES FOR 2ND SEM AY 25-26.xlsx` are displayed as term offerings only; they do not replace the full curriculum seed.
- The BSAIS course offering workbook has duplicate BSAIS blocks and a 4th Year total with no visible 4th Year course rows.
- Enrollment submission still attaches subjects from the database subject seed until PKM supplies an official term-offering-to-enrollment rule.
- Client has confirmed First Semester AY 2026-2027 as the current term, but the app still needs a proper academic calendar configuration instead of hardcoded constants.
- Official records can be manually encoded and edited by admins, but CSV import is not implemented until PKM provides the official import format.
- Generated-password email delivery is not implemented yet.

## 15. Future Enhancements

- Official admitted-applicant and student import workflow
- Admin-managed account review if PKM later requires manual overrides
- Official COR PDF generation using the supplied PKM template
- Official printable enrollment/masterlist report format
- Registrar-managed official student/admitted-applicant import
- Expanded account matching rules if PKM supplies stricter official requirements
- Digital clearance/signature routing
- Grade encoding and release workflow
- Class schedule assignment workflow
- Balance/payment records workflow
- Multi-program support after official program lists are supplied
- Email templates and generated-password delivery
