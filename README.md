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
- Supabase Storage: not used in this MVP
- PDF generation: placeholder only until an official COR / registration template is supplied

## 3. Source Documents Used

- `data-sources/About Us.pdf`: PKM identity, About content, vision, mission, goals, address, email, website, and social links
- `data-sources/Subjects.pdf`: initial Accounting Information System subject seed list
- `data-sources/FRD1.pdf`: expected outputs, functional requirements, manual enrollment process, and study objectives
- `data-sources/Joshua.pdf`: system overview, navigation structure, public pages, student module, admin module, login behavior, account behavior, enrollment behavior, empty states, and missing-information warnings

## 4. Current MVP Scope

- Public pages: Home, Login, Create Student Account, About Us
- Student pages: Dashboard, Online Enrollment, Subject List, Enrollment Status Result, Grades placeholder, Class Schedule placeholder, Balances placeholder, Account, Logout
- Admin pages: Dashboard, Pending Enrollments, Enrollment Masterlist, Student Records placeholder, Encode Grades/Schedule placeholder, Logout
- Database: Supabase schema, RLS policies, audit log table, and seed data for one AIS program and the provided subject list

## 5. Features Implemented

- Modern academic UI using the supplied PKM blue and yellow palette
- PKM logo placeholder mark with initials `PKM`
- Supabase-backed login with active-account checks
- Role-based protection for student and admin areas
- Student account creation through Supabase Auth when `SUPABASE_SERVICE_ROLE_KEY` is configured
- Create-account dropdown values exactly as requested: Incoming 1st Year Student, Transferee, Old Student
- Old Student accounts become `ACTIVE`; Incoming 1st Year Student and Transferee accounts become `PENDING`
- Student dashboard with student information, enrollment status, and quick actions
- Subject List grouped into separate tables by year level and semester, with a working year-level filter
- Online enrollment form that creates a `PENDING` enrollment record
- Database trigger that marks the student `enrollment_status` as `PENDING` after enrollment submission
- Admin dashboard with pending/enrolled counts and enrollment overview
- Admin approve/reject enrollment actions
- Approval updates enrollment status to `APPROVED` and student status to `ENROLLED`
- Rejection updates enrollment status to `REJECTED`, stores optional remarks, and does not mark the student enrolled
- Audit log insert for approve/reject actions
- Enrollment masterlist with year-level and semester filters
- Faster student tab navigation through a student portal context and lighter placeholder routes

## 6. Placeholder Features

- COR download / printable registration form
- Grades
- Class Schedule
- Balances
- Student Records
- Encode Grades/Schedule
- Email-generated initial password workflow
- Digital clearance/signature routing

The Create Student Account page includes an MVP password setup block so local Supabase Auth testing can work. The official generated-password and email-sending workflow remains a placeholder until approved templates and rules are supplied.

## 7. Missing Information / Future Inputs Needed

Missing Information / Future Inputs Needed:
- Official PKM logo file
- Official COR / registration form template
- Official student data sample
- Official admitted applicant verification rules
- Official registrar approval rules
- Official admin user list/emails
- Official grading format
- Official class schedule format
- Official balances/payment format
- Academic calendar
- Complete list of other programs, if multi-program support is required
- Email service/template approval for generated passwords or account messages
- Rules for digital clearance/signature process
- Final confirmation of official Accounting Information System program title
- Rules for Regular Student, Irregular Student, and Continuing Student classification
- Official rules for enrollment rejection remarks/categories, if any

## 8. Supabase Setup Instructions

Detailed Supabase documentation is in [docs/SUPABASE_SETUP.md](./docs/SUPABASE_SETUP.md).

Short setup:

1. Create or open the Supabase project.
2. Copy environment variables into `.env.local` using `.env.example`.
3. Apply all SQL files in `supabase/migrations/` in filename order.
4. Run `supabase/seed.sql`.
5. Create an internal admin user in Supabase Auth.
6. Insert the matching admin row into `public.profiles`.

Current connected Supabase project used during setup:

- Project name: `PKM-DES`
- Project ref: `sdivxyqdnvnyjqrsrzdq`
- Region: `ap-northeast-1`
- Project URL: `https://sdivxyqdnvnyjqrsrzdq.supabase.co`

The service-role key is not documented here and should never be pasted into chat or committed.

## 9. Environment Variables

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

`SUPABASE_SERVICE_ROLE_KEY` is server-only. It is used by the account creation action to create Supabase Auth users and must never be exposed in client code.

## 10. How to Run Locally

```bash
npm install
npm run dev
```

Open:

```text
http://localhost:3000
```

Production-style local run:

```bash
npm run build
npm run start
```

## 11. Database Tables

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

Student:
- Student can create an Old Student account when `SUPABASE_SERVICE_ROLE_KEY` is configured.
- Student can log in.
- Student dashboard displays profile information.
- Student can view subject list.
- Subject list displays separate tables by year level and semester.
- Student can filter subjects by year level and reset the filter.
- Student can submit enrollment form.
- Enrollment status becomes PENDING.
- Grades page shows empty state when no grades exist.
- Schedule page shows empty state when no schedule exists.
- Balances page shows empty state when no balance exists.

Admin:
- Admin can log in.
- Admin can view dashboard.
- Admin can view pending enrollments.
- Admin can approve enrollment.
- Approved student appears as ENROLLED.
- Admin can reject enrollment.
- Admin can view enrollment masterlist.
- Masterlist filters work.

Security:
- Student cannot access admin pages.
- Admin routes require admin role.
- Logged-out users cannot access protected pages.
- Students cannot view other students' private enrollment data.
- Supabase security advisor reports no current security lints after the cleanup migrations.

## 14. Known Limitations

- Incoming 1st Year Student and Transferee accounts are created as PENDING and require a future official verification/activation workflow.
- Official regular/irregular/continuing classification rules are not implemented.
- Official rejection categories are not invented; rejection remarks are free text only.
- COR generation is not implemented without an official template.
- Grades, schedule, balances, student records, and encode workflows are placeholders.
- Admin accounts are created internally through Supabase setup instructions, not public registration.
- The academic-year dropdown uses MVP options and needs the official academic calendar.
- Subject List uses source-grounded local seed data for fast student navigation; the same data is also seeded in Supabase.

## 15. Future Enhancements

- Official admitted-applicant and student verification workflow
- Admin-managed activation for pending student accounts
- Official COR PDF generation
- Digital clearance/signature routing
- Grade encoding and release workflow
- Class schedule assignment workflow
- Balance/payment records workflow
- Multi-program support after official program lists are supplied
- Email templates and generated-password delivery
