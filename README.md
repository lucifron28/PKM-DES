# Digital Enrollment System - Pambayang Kolehiyo ng Mauban (PKM-DES)

## 1. Project Overview

PKM-DES is the first MVP of a web-based enrollment and student information system for Pambayang Kolehiyo ng Mauban. It digitizes the basic account, subject-list, enrollment submission, enrollment review, and masterlist workflow while leaving official institutional policies as documented placeholders.

Some data in the FRD is marked as for revision, pending requirements, or work in progress. For this MVP, missing institutional data is represented through placeholders and documented future inputs instead of invented system rules.

Manual enrollment background from the FRD: students receive four registration-form copies, collect professor, Dean, Library, Clinic/Nurse, and Accounting Office signatures, submit final copies to Accounting, receive one copy back, and receive a blank class card for the next semester. Digital clearance and signature routing are documented as future enhancements, not implemented in this MVP.

## Research MVP Status

PKM-DES is a research-presentation MVP. The online deployment is a temporary client preview that demonstrates the proposed student-to-Registrar enrollment workflow. It is not ready for real institutional data, official enrollment operations, or replacement of the current PKM Registrar process.

Functional, partial, placeholder, deferred, and client-confirmation-dependent requirements are documented in [docs/FRD_TRACEABILITY.md](./docs/reference/FRD_TRACEABILITY.md). The formal research MVP boundary, presenter guide, and system diagrams are indexed in [docs/README.md](./docs/README.md).

Client source artifacts and their tracked implementation references are listed in [docs/SOURCE_DOCUMENT_REGISTER.md](./docs/reference/SOURCE_DOCUMENT_REGISTER.md). Original client PDFs and workbooks are intentionally excluded from this public repository.

## 2. Tech Stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- Supabase Auth
- Supabase PostgreSQL
- Supabase Row Level Security
- SQLite local development database setup
- Supabase Storage: not used in this MVP
- Browser printing for MVP draft registration forms using the supplied sample workbook as a layout reference; official PDF/COR generation remains pending until PKM confirms the final approved template

## 3. Source Documents Used

Client-supplied artifacts, including `About Us.pdf`, `Subjects.pdf`, `FRD1.pdf`, `Joshua.pdf`, `LIST OF COURSES FOR 2ND SEM AY 25-26.xlsx`, and `REGISTRATION FORM 4G.xlsx`, are documented in [docs/SOURCE_DOCUMENT_REGISTER.md](./docs/reference/SOURCE_DOCUMENT_REGISTER.md). Their original files are intentionally excluded from the public repository.

- `docs/reference/CLIENT_INPUTS_AND_OPEN_ITEMS.md`: client-provided answers to FRD gaps and remaining required files or decisions

## 4. Current MVP Scope

- Public pages: Home, Login, Create Student Account, About Us
- Student pages: Dashboard, Online Enrollment, Subject List, Enrollment Status Result, Grades placeholder, Class Schedule placeholder, Balances placeholder, Account, Logout
- Admin pages: Dashboard, Pending Enrollments, Enrollment Masterlist, Student Records official-record management, Encode Grades/Schedule placeholder, Logout
- Admin reporting: Enrollment Reports with filters, status summaries, and browser-print output
- Database: Supabase schema, RLS policies, audit log table, a multi-program catalog, client-provided term offerings, and explicit term-scoped standard-load configuration

## 5. Features Implemented

- Modern academic UI using the supplied PKM blue and yellow palette
- PKM and Municipality of Mauban logo images applied to the public header, home page, app shell, and printable registration form
- Supabase-backed login with active-account checks
- Role-based protection for student and admin areas
- Production environment check for Supabase/Vercel configuration
- Student account creation through Supabase Auth when `SUPABASE_SERVICE_ROLE_KEY` is configured
- Create-account dropdown values exactly as requested: Incoming 1st Year Student, Transferee, Old Student
- Every student type uses a claim flow against an exact matching official Registrar-managed record
- Account claims require the selected student type, active email address, and Student ID Number
- Create-account flow blocks duplicate student accounts by email address or Student ID Number before Auth user creation
- Admin Student Records uses guided MVP controls for common status/classification fields; it surfaces exact, partial, conflicting, and missing account links without repairing them automatically
- Matched student accounts become `ACTIVE`
- Student dashboard with student information, enrollment status, and quick actions
- Student Account page displays core account data and matching Registrar-managed official profile details when available
- Signed-in students can change their password from the Account page
- Subject List separates the client-provided term course enrollment load from program curriculum references, with one working year-level filter and current standard-load availability status
- The client-provided `LIST OF COURSES FOR 2ND SEM AY 25-26.xlsx` supplies the active MVP term: AY 2025-2026, 2nd Semester
- Students cannot select subjects from the Subject List; actual attached subjects come from the submitted enrollment record and Registrar review
- Online enrollment uses the authenticated student's recorded program, year level, student type, and Student ID; the browser submits only the certification checkbox
- Automatic standard-load submission is available only when a complete active standard-load set exists for the student's recorded program, year level, and workbook term: AY 2025-2026, 2nd Semester
- The server action reads the authoritative active term from `public.enrollment_terms` and supplies it to the RPC; a mismatch creates no enrollment
- Transferee and Irregular Student loads are directed to Registrar-managed subject assignment; no transfer-credit or adjusted-load rules are invented
- One atomic database submission creates a `PENDING` enrollment and its complete matching `enrollment_subjects` set, while the unique student-term index handles concurrent duplicates safely
- Database trigger that marks the student `enrollment_status` as `PENDING` after enrollment submission
- Admin dashboard with pending, approved, rejected, and total enrollment record counts
- Admin dashboard enrollment counts are loaded with a lightweight status query and show unavailable rather than zero when that query fails
- Admin Enrollment Reports page with canonical program, academic year, year level, semester, review-status, and student identity search filters; complete result counts; reset control; and printed human-readable criteria summary
- Browser-printable enrollment report table for Registrar review
- Atomic admin approve/reject enrollment actions for pending requests only
- Approval or rejection, the summarized student status, and one audit record commit together; concurrent stale reviews cannot overwrite the first decision
- Pending-enrollment review opens in an accessible modal with student details, attached subjects, requirement status, and focused decision controls
- Optional server-only enrollment approval/rejection email notifications use the configured adapter; delivery is disabled by default and a delivery failure does not undo the saved decision
- Rejection keeps optional free-text remarks; the MVP has only a narrow, status-only current-term Health Record Update verification for applicable students, not a full document workflow
- Enrollment masterlist across pending, approved, and rejected submitted requests, with program, academic year, year level, semester, review-status, and student identity search filters
- Admin Account page with internal account details and password change
- Registrar/Admin can reset the password of an exact active student account from its official-record edit page; the temporary password is shared privately and never stored or displayed again
- MVP draft printable registration form aligned with the supplied registration form sample layout and readable A4 browser printing
- Printable registration form displays deterministic attached-subject rows, total units, classification markers, review status, fee/payment placeholders, signature labels, and data privacy authorization text
- Students can print only their latest approved request; Registrar/Admin can preview individual enrollment forms for every review status
- Admin-managed official student/admitted-applicant records page for manual Registrar entry, search, filtering, and editing
- Official student records list displays page-scoped account-match status for Registrar review; its source enrollment status never creates or changes an online enrollment request
- Faster student tab navigation through a student portal context and lighter placeholder routes
- Sidebar links prefetch on hover/focus, with student/admin loading shells for slower server-rendered routes
- Responsive public and authenticated navigation with a keyboard-accessible skip link, current-section heading, active-route indication, and compact mobile portal menu
- Disabled Grades, Schedule, Balances, and Encode Grades/Schedule links remain hidden unless `NEXT_PUBLIC_ENABLE_STUB_PAGES=true`

## 6. Placeholder Features

- Official COR PDF generation using the official PKM registration template
- Grades
- Class Schedule
- Balances
- Full student records module beyond Registrar-managed official account-matching records
- Encode Grades/Schedule
- Email-generated initial password workflow
- Digital clearance/signature routing

The Create Student Account page includes an MVP password setup block so local Supabase Auth testing can work. The official generated-password email workflow remains a placeholder until approved templates and rules are supplied. Enrollment decision notifications are a separate optional path, disabled by default, and do not include rejection remarks.

## 7. Missing Information / Future Inputs Needed

Missing Information / Future Inputs Needed:
- Official confirmation that the supplied registration form sample is the final approved COR/registration template
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

All supplemental documentation is grouped and indexed in [docs/README.md](./docs/README.md). Active preview credentials are distributed privately and are never documented in the repository.

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
- Create the designated internal Registrar/Auth account using credentials provided privately.
- Create the Supabase Auth user first, then replace `<auth-user-uuid>` in the template.

## 9. Environment Variables

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
DATABASE_PROVIDER=supabase
SUPABASE_SERVICE_ROLE_KEY=
ACCOUNT_CLAIM_SECRET=
```

`SUPABASE_SERVICE_ROLE_KEY` is server-only. It is used by the account creation action to create Supabase Auth users and must never be exposed in client code.

`ACCOUNT_CLAIM_SECRET` is server-only, must contain at least 32 characters, and signs the short-lived account-claim proof stored in an HTTP-only cookie.

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
- `enrollment_subjects` (legacy subject or course-offering source with non-null display snapshots)
- `course_offerings` (source-labeled client-provided term course offerings)
- `standard_load_sets` (term-scoped Registrar-managed expected count and unit configuration)
- `official_student_records`
- `grades`
- `class_schedules`
- `balances`
- `audit_logs`

RLS policies are included for student-owned records, admin review access, authenticated subject/schedule reads, and admin audit-log access. See [docs/setup/SUPABASE_SETUP.md](./docs/setup/SUPABASE_SETUP.md) for the policy summary.

## 12. Seed Data

The tracked Supabase seed defines a catalog of 10 programs: BSAIS, BSMA, BEED, English, Filipino, Mathematics, Social Studies, Criminology, Agriculture Crop Production, and Food Service Management. The official program names and curricula still require client confirmation where not yet finalized.

Only BSAIS has 56 seeded curriculum subject rows from the supplied subject reference. The exact official BSAIS program title should still be verified because no separate formal program-title document was provided.

Subject summary from the source list:

- General Education: 36
- Core Accounting Education Courses: 81
- Professional Courses: 30
- CBME: 6
- PE: 8
- NSTP: 6
- Total Number of Units: 167

Current tracked `supabase/seed.sql` definition:

- Program catalog records: 10
- BSAIS curriculum subjects: 56
- BSAIS curriculum units: 167

The program catalog contains ten canonical programs, and the Subject List includes the 245 unique workbook-derived offerings for all ten programs. Only BSAIS has seeded curriculum subject rows in `public.subjects`; online enrollment uses the configured workbook offerings instead. The active Supabase configuration contains 36 complete standard loads for AY 2025-2026, 2nd Semester. BSAIS 4th Year, BSMA 4th Year, and CRIM 3rd and 4th Year remain unavailable because the supplied workbook does not contain complete course rows for those combinations.

SQLite development seeding is documented separately in [docs/setup/SQLITE_DEVELOPMENT.md](./docs/setup/SQLITE_DEVELOPMENT.md) and must not be used to describe the deployed Supabase configuration.

## 13. Manual Test Checklist

Public:
- Home page loads.
- About Us page displays PKM information.
- Login page validates missing password.
- Create account page shows required fields.
- Create account page requires an exact official-record match using email, Student ID, and student type before password setup.

Student:
- All student types are blocked when no matching official record exists.
- All student types can create an account after claiming an exact matching official record.
- Wrong student type returns the same generic verification failure as other non-claimable attempts.
- Public account-claim responses do not reveal whether an email, Student ID, or stored classification exists.
- Duplicate account creation for an existing email address or Student ID Number is blocked.
- Student can log in.
- Student dashboard displays profile information.
- Student account page displays confirmed official profile fields when a matching official record exists.
- Student can change password from the Account page after entering the current password.
- Student can view subject list.
- Student can view the client-provided AY 2025-2026, 2nd Semester course enrollment load for the student's actual program.
- Student can distinguish client-provided term offerings, program curriculum references, configured standard-load availability, and actual enrollment snapshots.
- Subject list displays separate tables by year level and semester.
- Student can filter subjects by year level and reset the filter.
- Student can submit enrollment form.
- Enrollment form displays the active workbook term: AY 2025-2026, 2nd Semester.
- Duplicate enrollment submission for the same academic year and semester is blocked.
- Rejected enrollment records cannot be resubmitted for the same academic year and semester (provisional project-owner MVP rule; terminal rejection closes same-term resubmission).
- Successful enrollment submission creates matching `enrollment_subjects` rows.
- Enrollment status becomes PENDING.
- Student can open and browser-print the MVP draft registration form only after the latest request is approved.
- Draft registration form follows the supplied sample layout and displays attached subjects, total units, fee/payment placeholders, signature labels, and Registrar review context.
- Grades page shows empty state when no grades exist.
- Schedule page shows empty state when no schedule exists.
- Balances page shows empty state when no balance exists.

Admin:
- Admin can log in.
- Admin can view dashboard.
- Admin dashboard count cards load from the optimized status tally.
- Admin can view enrollment reports.
- Admin can filter enrollment reports by program, academic year, year level, semester, and review status.
- Admin can reset report filters and see the report criteria summary on the browser-print output.
- Admin can browser-print the enrollment report.
- Admin can add an official student/admitted-applicant record.
- Admin can search and filter official student/admitted-applicant records.
- Admin can see whether displayed official records already match a student account.
- Admin can edit an official student/admitted-applicant record.
- Admin can view pending enrollments.
- Admin can open and browser-print an individual enrollment registration form.
- Admin registration form printout follows the supplied sample layout without importing workbook student-list data.
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

- Account creation for every student type depends on an exact Registrar-managed official record, but bulk import is not implemented.
- Account-claim rate limiting is future hardening and is not implemented in this research MVP.
- The signed account-claim proof is an MVP safeguard, not production-grade institutional identity proofing.
- Guided admin field options are provisional MVP values until PKM supplies official value lists.
- Student ID remains format-flexible until PKM confirms the official validation rule; manual official-record bulk import remains deferred.
- Official regular/irregular/continuing classification rules are not implemented.
- Official rejection categories are not invented; rejection remarks are free text only.
- Browser-printable draft registration forms follow the supplied sample layout, but final official template approval and locked PDF generation are not implemented.
- The supplied registration form workbook includes real-looking student-list rows and BTVTED sample data; those rows are not imported, seeded, or treated as AIS curriculum data.
- Registration form fee, scholarship, payment, section, and schedule values remain placeholders until PKM supplies official rules and encoded data.
- Enrollment reports are browser-printable MVP outputs; official export, PDF, or printable report format must be supplied before final report generation.
- Grades, schedule, balances, student records, and encode workflows are placeholders.
- Admin accounts are created internally through Supabase setup instructions, not public registration.
- The academic-year dropdown uses MVP options and needs the official academic calendar.
- Subject List uses the client-provided AY 2025-2026, 2nd Semester course enrollment load and separate BSAIS curriculum references; current online enrollment attachments come only from an active, complete Supabase `standard_load_sets` plus matching `course_offerings` configuration.
- The active workbook configuration is program-agnostic across ten canonical programs, with 36 complete standard loads. The source workbook's duplicate BSAIS blocks are deduplicated to 25 unique BSAIS rows.
- BSAIS 4th Year, BSMA 4th Year, and CRIM 3rd and 4th Year are intentionally unavailable because the workbook lacks complete course rows. No missing courses are invented.
- Enrollment submission attaches the exact configured workbook course-offering set for the student's program and year level. Transferee and Irregular Student loads remain Registrar-managed.
- The current term is coordinated across the authoritative Supabase `enrollment_terms` row, application display, and standard-load migration. Changing it requires a forward migration and corresponding approved configuration update.
- Official records can be manually encoded and edited by admins, but CSV import is not implemented until PKM provides the official import format.
- Student Account official-detail display depends on an exact matching Registrar-managed official record and server-only Supabase service-role configuration.
- Generated-password email delivery is not implemented. A one-time account setup-link path and enrollment decision notifications exist only when explicitly enabled and configured; both remain disabled by default, and decision delivery failure does not roll back the Registrar decision.

## 15. Future Enhancements

- Official admitted-applicant and student import workflow
- Admin-managed account review if PKM later requires manual overrides
- Official COR PDF generation after PKM confirms the final approved template
- Official printable enrollment/masterlist report format
- Registrar-managed official student/admitted-applicant import
- Expanded account matching rules if PKM supplies stricter official requirements
- Digital clearance/signature routing
- Grade encoding and release workflow
- Class schedule assignment workflow
- Balance/payment records workflow
- Complete multi-program enrollment support after approved curricula and enrollment rules are supplied for each program
- Email templates and generated-password delivery
