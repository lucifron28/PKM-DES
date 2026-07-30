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
6. For an eligible BSAIS standard load, the server saves the request with `PENDING` status and atomically attaches matching curriculum subjects.
7. The Registrar/Admin opens Pending Enrollments and reviews the request.
8. The Registrar/Admin approves or rejects the request and may add free-text rejection remarks.
9. The student views the updated enrollment-status result.
10. Submitted enrollment information appears in the dashboard counts, masterlist, and reports according to its review status.
11. The student or Registrar/Admin views or browser-prints the draft registration form.

The demonstration does not validate real admission requirements, financial obligations, clearances, signatures, grades, or class schedules.

## 3. Implemented MVP Capabilities

### Public

- Home and About Us pages.
- Supabase-backed login and logout.
- Student account claim with the self-selected-password MVP path. A server-only, one-time setup-link path is available only when explicitly configured and remains disabled by default.

### Student

- Dashboard with profile-derived information, enrollment status, and quick actions.
- View-only subject list grouped by year level and semester.
- Trusted server-derived online enrollment request submission for eligible BSAIS standard loads in the configured MVP term.
- Enrollment status result, including free-text rejection remarks when entered.
- Account information display and signed-in password change.

### Registrar/Admin

- Admin dashboard enrollment-status overview.
- Manual creation, search, filtering, and editing of official student records.
- Registrar/Admin reset of an exact active student account password from the linked official-record edit page. The temporary password is shared privately; no password-reset email or forced-change rule is implemented.
- Pending enrollment review, approval, rejection, and audit-log writes. The request decision, summarized student status, and audit row commit atomically. The queue includes only a status-only, current-term Health Record Update check when it applies; it is not a full document or requirements checklist.
- Enrollment masterlist and browser-printable report views.

### Reporting and Printing

- Browser-printable enrollment reports and masterlist output based on complete, canonically filtered submitted enrollment records. Query failures show an unavailable state instead of a misleading empty report or zero dashboard count.
- Browser-printable draft registration form populated from an enrollment request and deterministically ordered attached subjects. Student printing is available only for the latest approved request; Registrar/Admin may preview any review status.

### Authentication and Access Control

- Supabase Auth sessions.
- Active-account and student/admin role checks in server-side route access.
- Row Level Security policies are present for the current database-backed MVP flows. The research MVP has not undergone production security certification or penetration testing.
- Responsive public and authenticated navigation, current-section identification, and keyboard-accessible skip navigation support the presentation workflow. No backend capability is added by these interface improvements.

## 4. Partial or Demonstration-Only Capabilities

- The current registration output is a browser-print **draft registration form**, not final official COR generation.
- The deployment is a temporary client preview and should use limited demonstration data.
- The program catalog contains ten canonical programs (with case/whitespace normalized BSAIS aliases), and the Subject List includes historical workbook-derived offerings for all ten programs. BSAIS curriculum subjects are loaded directly from `public.subjects` for standard-load enrollment; complete standard-load automatic enrollment for non-BSAIS programs remains unsupported until official curricula are supplied.
- Subject List workbook rows are historical AY 2025-2026, 2nd Semester display-only references, not the active enrollment load. BSAIS curriculum rows from `public.subjects` are a separate reference; actual subject attachments belong to submitted enrollment records and cannot be selected by students on the Subject List page.
- The browser cannot choose a student's program, year level, student type, term, status, or subjects. The current term is fixed to AY 2026-2027, 1st Semester until an approved academic-calendar module exists.
- Transferee and Irregular Student records require Registrar-managed subject assignment. The MVP does not invent transfer-credit, irregular-load, full requirement-checklist, or subject-adjustment rules.
- Registrar review is limited to submitted pending requests. Stale concurrent review attempts cannot overwrite the first decision. A rejected automatic enrollment request is terminal for that academic year and semester; students cannot automatically resubmit for the same term under the existing database term-unique index. Note: This terminal rejection behavior is a provisional project-owner MVP rule, not confirmed institutional policy; any future return-for-correction or versioned resubmission workflow requires explicit PKM approval.
- Enrollment creation and subject attachment use one database transaction. The student-term unique index remains the concurrent duplicate safeguard.
- Account claiming for every student type depends on manually encoded official student records; no approved import workflow exists.
- The FRD describes generated credentials delivered by email, while the default MVP path uses a self-selected password so the account flow can be tested. A configured server-only setup-link delivery path remains disabled by default and does not send generated passwords.
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

The draft registration form also contains non-operational placeholders for schedule values, section, address, fees, scholarship, payment details, and signature/clearance completion. It targets readable A4 browser printing; a larger subject load may continue onto an additional page rather than produce an official PDF.

## 6. Explicit MVP Non-Goals

- Production operation using real student data.
- Real financial transactions or official assessment processing.
- Official grade processing or release.
- Official class scheduling or section assignment.
- Email-generated password delivery. A setup-link delivery path is demonstration-only until PKM approves sender, templates, and operating rules.
- Digital clearance routing.
- Electronic signatures.
- Complete institutional audit and compliance implementation.
- Full production security certification.
- Complete support for every academic program.
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
- **Email Delivery Service**: A server-only Resend adapter can send a one-time setup link only when explicitly configured. It is disabled by default in the preview environment and does not send generated passwords.
- **Health Record Requirement**: Status-only, current-term `HEALTH_RECORD_UPDATE` verification gates approval only for Incoming 1st Year Students whose Registrar-managed official record has an explicitly confirmed `Female` value. No sensitive medical data is stored.
