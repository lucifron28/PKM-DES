# PKM-DES Research MVP Scope

## 1. Purpose

PKM-DES is a research MVP for the proposed Digital Enrollment System of Pambayang Kolehiyo ng Mauban. It is intended to support research presentation, client workflow demonstration, requirements validation, interface and process evaluation, and collection of client feedback.

The hosted deployment is a client preview environment. It demonstrates a proposed enrollment workflow using controlled demonstration data. It is not ready for real institutional data, official enrollment operations, or replacement of the Registrar's current process.

## 2. Primary Demonstration Workflow

1. A Registrar/Admin creates or verifies an official student record.
2. A student claims a matching official record using the selected student type, active email address, and Student ID Number.
3. The student logs in.
4. The student views the dashboard and available subjects.
5. The student submits an enrollment request for the configured MVP term.
6. For an eligible student with a complete active standard-load configuration, the server saves the request with `PENDING` status and atomically attaches the configured course-offering set.
7. The Registrar/Admin opens Pending Enrollments and reviews the request.
8. The student and explicitly assigned officials apply separate drawn e-signatures for the required clearances available to their roles.
9. Every student requires an authenticated Nurse Health Clearance signature. For students requiring the special Health Record Update form (Transferees and Incoming 1st Year Students with Female in the official record), an assigned Nurse verifies the status-only requirement and applies the Nurse signature atomically.
10. The Registrar/Admin reviews the clearance overview; approval remains blocked when any required clearance signature (including the Nurse Health Clearance) is missing, invalidated, or not current.
11. The Registrar/Admin approves or rejects the request and may add free-text rejection remarks.
12. The student views the updated enrollment-status result.
13. Submitted enrollment information appears in the dashboard counts, masterlist, and reports according to its review status.
14. The student or Registrar/Admin views or browser-prints the draft registration form with current signatures when available.

The demonstration does not validate real admission requirements, financial obligations, institutional clearance order, grades, or class schedules.

## 3. Implemented MVP Capabilities

### Public

- Home and About Us pages.
- Supabase-backed login and logout.
- Student account claim with the self-selected-password MVP path. A server-only, one-time setup-link path is available only when explicitly configured and remains disabled by default.

### Student

- Dashboard with profile-derived information, term-specific enrollment status result, and quick actions. Current-term status is derived only from an enrollment record matching the active academic term; `students.enrollment_status` is not the current-term source of truth.
- View-only subject list grouped by year level and semester.
- Trusted server-derived online enrollment request submission for any program and year level with a complete active standard-load configuration in the client-provided workbook term: AY 2025-2026, 2nd Semester.
- Term-specific enrollment status result, including free-text rejection remarks when entered.
- Account information display and signed-in password change.

### Registrar/Admin

- Admin dashboard enrollment-status overview.
- Manual creation, search, filtering, and editing of official student records.
- Registrar/Admin reset of an exact active student account password from the linked official-record edit page. The temporary password is set by the admin and shared privately; no password-reset email, forced change, or expiry rule is implemented. Supabase Auth password update and PostgreSQL audit log insertion are not one atomic cross-system transaction: if the Auth update succeeds but audit log insertion fails, the password update remains in effect in Auth while a server-side audit failure is logged.
- Pending enrollment review, approval, rejection, and audit-log writes. The request decision, summarized student status, audit row, and durable decision-notification outbox row commit atomically. Approval fails closed when the attached subject snapshot load is missing or invalid. Approval authoritatively requires all required current clearance signatures (Student, Librarian, Nurse, Program Chair, Accountant, and Dean), with special-form Health Record Update verification required for Transferees and Incoming 1st Year Female students; it is not a full document or requirements checklist.
- Explicit official-role assignments for Librarian, Nurse, Program Chair, Accountant, and Dean; assignments can be global or program-scoped, and generic `admin` status does not grant signing authority.
- Official signing assignments remain capabilities on existing `admin` accounts rather than new authentication roles. `/admin/official-signers` manages global assignments for other active admin accounts through an audited RPC; self-assignment and direct table mutation are blocked.
- Active assigned officials use a focused staff shell: `/admin/dashboard` shows only their assigned clearance queues, `/admin/clearances/<role>` provides the role-specific pending/signed workspace, and `/admin/clearances/<role>/<enrollment>` provides the dedicated review and e-signature view. Program-scoped assignments are enforced when queue records are loaded and before signing.
- An active admin account with no active official assignment is treated as the Registrar/Admin management workspace for this MVP. Registrar-only routes remain unavailable to assigned officials, including enrollment review, student records, reports, masterlist, and signer-assignment management.
- Authenticated drawn e-signatures for Student, Librarian, School Nurse, Program Chair, Accountant, and Dean using one reusable canvas input. Signature rows are immutable, private PNG objects are server-uploaded, and document fingerprints detect stale evidence.
- Separate clearance states (`PENDING`, `SIGNED`, `NOT_APPLICABLE`, `INVALIDATED`) with re-signing through new immutable rows after signed data changes. No generated cursive, typed signature, or generic Registrar signature is used.
- A dedicated `/admin/clearances/health` Nurse workspace with an image-guided, browser-printable Health Record Update form for applicable students and standard Health Clearance signing for other students. The special form keeps student and term identity read-only, requires a server-validated Nurse acknowledgment plus a real drawn signature for `VERIFIED`, supports a controlled no-signature rejection path, and records only short administrative notes. The special Health Record Update form rule applies to Transferees and Incoming 1st Year Students plus official Registrar-managed `gender_sex` explicitly equal to `Female`; all other students use standard Nurse Health Clearance. No clinical fields or medical data are stored.
- Registrar and student views expose read-only status. A legacy `VERIFIED` requirement without a current Nurse signature is labeled explicitly and remains blocked by the approval gate; unverified or unsigned Nurse clearance blocks approval for all students. The former `/admin/health-records` path is retained only as a Nurse-authorized redirect to the dedicated workspace.
- Enrollment masterlist and browser-printable report views.

### Reporting and Printing

- Browser-printable enrollment reports and masterlist output based on complete, canonically filtered submitted enrollment records. Query failures show an unavailable state instead of a misleading empty report or zero dashboard count.
- Browser-printable draft registration form populated from an enrollment request and deterministically ordered attached subjects. Student printing is available only for the latest approved request; Registrar/Admin may preview any review status.
- Browser-printable draft registration form includes current Student, Librarian, School Nurse, Program Chair, Accountant, and Dean signatures and signer metadata when available; stale signatures are labeled invalidated. Registrar views of Health Record Update remain status-only and never expose a Nurse signing control.

### Authentication and Access Control

- Supabase Auth sessions.
- Active-account and student/admin role checks in server-side route access.
- Row Level Security policies are present for the current database-backed MVP flows. The research MVP has not undergone production security certification or penetration testing.
- Private Supabase Storage and database RLS protect signature images and rows; signed URLs are short-lived and only generated for current evidence in authorized server views.
- Responsive public and authenticated navigation, current-section identification, and keyboard-accessible skip navigation support the presentation workflow. No backend capability is added by these interface improvements.

## 4. Partial or Demonstration-Only Capabilities

- The current registration output is a browser-print **draft registration form**, not final official COR generation.
- The deployment is a temporary client preview and should use limited demonstration data.
- The program catalog contains ten canonical programs, and the Subject List includes 245 unique workbook-derived offerings for all ten programs. Online enrollment uses 36 active, complete `standard_load_sets` rows and exact matching `course_offerings` for AY 2025-2026, 2nd Semester.
- The client-provided workbook is the active MVP course-enrollment source for that term. Curriculum rows from `public.subjects` remain a separate BSAIS curriculum reference; students cannot select subjects on the Subject List page.
- The browser cannot choose a student's program, year level, student type, term, status, or subjects. The current term is coordinated by the application configuration and the authoritative Supabase `enrollment_terms` and standard-load migrations.
- BSAIS 4th Year, BSMA 4th Year, and CRIM 3rd and 4th Year have no ACTIVE load because the workbook does not contain complete course rows for those combinations. No missing rows are invented.
- Transferee and Irregular Student records require Registrar-managed subject assignment. The MVP does not invent transfer-credit, irregular-load, full requirement-checklist, or subject-adjustment rules.
- Registrar review is limited to submitted pending requests. Stale concurrent review attempts cannot overwrite the first decision. A rejected automatic enrollment request is terminal for that academic year and semester; students cannot automatically resubmit for the same term under the existing database term-unique index. Note: This terminal rejection behavior is a provisional project-owner MVP rule, not confirmed institutional policy; any future return-for-correction or versioned resubmission workflow requires explicit PKM approval.
- Enrollment creation and subject attachment use one database transaction. The student-term unique index remains the concurrent duplicate safeguard.
- Account claiming for every student type depends on manually encoded official student records; no approved import workflow exists.
- The FRD describes generated credentials delivered by email, while the default MVP path uses a self-selected password so the account flow can be tested. A configured server-only setup-link delivery path remains disabled by default and does not send generated passwords.
- Enrollment decision notifications are a partial, optional delivery path. A successful approval or rejection creates a durable outbox record, but email is disabled by default; when enabled, delivery uses the trusted server configuration, records safe retryable failures, and never undoes the saved Registrar decision. Rejection remarks remain in the authenticated portal and are not stored in the outbox or included in email.
- The signed account-claim proof protects the MVP workflow state but is not production-grade institutional identity verification; account-claim rate limiting remains future hardening.
- Official student record fields and controlled options are guided MVP inputs, not finalized institutional value lists.
- Official student records are Registrar source data. Each claimed student account is linked via `students.official_record_id`. Official record updates by an admin automatically synchronize account-safe fields (`profiles.first_name`, `profiles.last_name`, `students.program_id`, `students.year_level`, `students.student_type`, `students.student_id_number`) through an atomic RPC, while Supabase Auth and profile email addresses require separate Auth-aware handling. Unambiguous legacy records are backfilled; ambiguous records remain unlinked. Their source enrollment-status field does not create or change an enrollment request.
- Reports use browser printing, not an approved export, PDF, or registrar report format.

## 5. Placeholder Modules

The following routes show proposed system scope but are not operational modules:

- Grades
- Class Schedule
- Balances
- Encode Grades/Schedule

The draft registration form also contains non-operational placeholders for schedule values, section, address, fees, scholarship, and payment details. Its signature/clearance blocks are operational within this branch but remain a research-MVP workflow, not an official institutional approval record. It targets readable Letter browser printing and fits the standard load on a single page.

## 6. Explicit MVP Non-Goals

- Production operation using real student data.
- Real financial transactions or official assessment processing.
- Official grade processing or release.
- Official class scheduling or section assignment.
- Email-generated password delivery. A setup-link delivery path is demonstration-only until PKM approves sender, templates, and operating rules.
- Live enrollment-decision email delivery or proof of delivery in the public preview. The durable outbox and retry path demonstrate the boundary only; sender approval and operational monitoring remain future inputs.
- Production institutional approval of the clearance order, signer assignments, and e-signature evidence policy.
- Complete institutional audit and compliance implementation.
- Full production security certification.
- Complete support for every academic program before approved current-term standard-load configurations are supplied.
- Replacement of the official Registrar process.

## 7. Demonstration Data Policy

- Use only fictional or anonymized data in the client preview.
- Do not enter real student information into the preview environment.
- Distribute preview credentials privately; do not reuse them for institutional or personal accounts.
- Demo data may be reset before or after research presentations.

## 8. Success Criteria

The research MVP is successful when:

- The main student-to-Registrar workflow can be demonstrated end to end.
- The client understands the proposed process and its boundaries.
- Implemented features correspond to documented requirements.
- Partial, placeholder, deferred, and confirmation-dependent items are clearly identified.
- The presentation produces useful client feedback for the next implementation phase.
- A failed live deployment does not invalidate the research because screenshots or recordings can demonstrate the same workflow.

## 9. Post-Presentation Work

After client validation, the next phase should prioritize production hardening, full data modeling, security redesign, institutional policy confirmation, approved data imports, official output templates, and the additional modules identified in the traceability matrix. These changes should be sequenced only after PKM validates the proposed workflow and supplies the required institutional rules, formats, and source data.

### 4. Requirements & Email Scope
- **Email Delivery Service**: A server-only Gmail SMTP adapter can send a one-time setup link and an enrollment decision notification after a successful Registrar approval or rejection when explicitly configured with an authorized PKM mailbox and Google App Password. Delivery is disabled by default in the preview environment, does not send generated passwords, and does not include rejection remarks. If delivery is unavailable, the saved decision remains authoritative and the Registrar sees a manual-contact warning.
- **Health Record Requirement**: Nurse Health Clearance is required for every enrollment. A dedicated status-only, current-term `HEALTH_RECORD_UPDATE` verification form gates clearance for Transferees and Incoming 1st Year Students whose Registrar-managed official record has an explicitly confirmed `Female` value. All other students receive standard Nurse Health Clearance. No sensitive medical data is stored.
