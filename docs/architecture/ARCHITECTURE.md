# System architecture

## Runtime boundary

The browser communicates with the Next.js App Router application. Server-rendered pages, server actions, and route handlers use Supabase clients to read and write application data. Supabase provides authentication, PostgreSQL persistence, Row Level Security (RLS), and private Storage for signature files.

The hosted runtime must use `DATABASE_PROVIDER=supabase`.

## Main application areas

- `app/student/` contains student enrollment, health-record, and registration pages.
- `app/admin/` contains registrar and assigned-official workspaces.
- `components/` contains reusable workflow, health-record, and print UI.
- `lib/auth/` resolves the authenticated profile and access context.
- `lib/requirements/` evaluates enrollment requirements and clearance applicability.
- `lib/signatures/` supports signature capture, storage, and verification.
- `supabase/migrations/` defines the database schema, policies, functions, and indexes.

## Identity and access

`profiles.role` contains the base application roles `student` and `admin`. Staff capabilities are assigned separately through active `official_role_assignments` rows:

| Assignment | Clearance workspace |
| --- | --- |
| `LIBRARIAN` | Library |
| `NURSE` | Health |
| `PROGRAM_CHAIR` | Program |
| `ACCOUNTANT` | Accounting |
| `DEAN` | Dean |

An admin profile without an active official assignment uses the registrar/admin workspace. An official assignment does not create a new Supabase Auth role; it narrows the authenticated staff member's available workspace.

## Enrollment and clearance flow

1. A student creates or opens an enrollment record for an academic term.
2. The student submits the enrollment requirements and student signature when the current workflow allows it.
3. Assigned officials review the enrollment through their clearance workspace. Each clearance type has its own route and signature record.
4. The registrar manages enrollment state and can review the enrollment records available to the admin workspace.
5. The approved registration form reads the enrollment, subject rows, fee data, and available signature records for printing.

The staff routes are organized under `/admin/clearances/<role>` and `/admin/clearances/<role>/<enrollmentId>`. Registrar enrollment management is under `/admin/enrollments`; official assignments are managed under `/admin/official-signers`.

## Health Record Update

Health clearance applies when the student is a transferee, or when the student is an incoming first-year student whose recorded sex is female. The rule is implemented in `lib/requirements/rules.ts`.

The student page is `app/student/enrollments/[enrollmentId]/health-record/page.tsx`, with its server action in `app/student/health-record/actions.ts`. The Nurse review page is `app/admin/clearances/health/[enrollmentId]/page.tsx`, and the printable health form is `components/health/health-record-update-paper.tsx`.

The Health Record Update stores medical-condition entries, identification dates, medications, allergy, last menstrual period, and other notes with the enrollment and student identifiers. Database policies restrict the record to the student owner and the assigned Nurse for the relevant program. The Nurse is the official signer for health clearance; other officials sign their separate clearance types.

## Electronic signatures

The signature workflow captures a PNG specimen or signature image in private Storage. Server-side actions create the stored signature record and preserve the signer identity, assignment, timestamp, and file integrity information. The application uses short-lived signed URLs when a stored signature must be displayed.

Database functions and policies prevent mutation of protected signature records after they are recorded. Access to signature data is enforced by the authenticated application context and database RLS.

## Registration-form printing

`components/print/registration-form.tsx` renders the registration form and its signature blocks for the student, Librarian, School Nurse, Program Chair, Accountant, and Dean. The print stylesheet in `app/globals.css` sets the registration output to Letter portrait with narrow print margins. The presentation test verifies that the removed enrolled stamp is not rendered.

## Data-flow boundaries

- Browser-visible Supabase clients use the public URL and anonymous key and remain subject to RLS.
- Server-only operations use the service-role client when the workflow requires privileged access, such as controlled Storage operations.
- Authenticated user context and official assignments are checked before an official can review or sign a clearance.
- Database migrations, policies, and functions are the authoritative enforcement layer for data access and immutable signature behavior.
