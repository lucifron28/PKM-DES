# PKM-DES Research MVP Scope

## 1. Purpose

PKM-DES is a research MVP for the proposed Digital Enrollment System of Pambayang Kolehiyo ng Mauban. It is intended to support research presentation, client workflow demonstration, requirements validation, interface and process evaluation, and collection of client feedback.

The hosted deployment is a client preview environment. It demonstrates a proposed enrollment workflow using controlled demonstration data. It is not ready for real institutional data, official enrollment operations, or replacement of the Registrar's current process.

## 2. Primary Demonstration Workflow

1. A Registrar/Admin creates or verifies an official student record.
2. A student claims the matching record or, for the Old Student MVP path, completes the limited fallback registration form.
3. The student logs in.
4. The student views the dashboard and available subjects.
5. The student submits an enrollment request for the configured MVP term.
6. The enrollment request is saved with `PENDING` status and matching seed subjects are attached.
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
- Student account claim and MVP registration paths.

### Student

- Dashboard with profile-derived information, enrollment status, and quick actions.
- View-only subject list grouped by year level and semester.
- Online enrollment request submission for the configured MVP term.
- Enrollment status result, including free-text rejection remarks when entered.
- Account information display and signed-in password change.

### Registrar/Admin

- Admin dashboard enrollment-status overview.
- Manual creation, search, filtering, and editing of official student records.
- Pending enrollment review, approval, rejection, and audit-log writes.
- Enrollment masterlist and browser-printable report views.

### Reporting and Printing

- Browser-printable enrollment reports and masterlist output.
- Browser-printable draft registration form populated from an enrollment request and attached subjects.

### Authentication and Access Control

- Supabase Auth sessions.
- Active-account and student/admin role checks in server-side route access.
- Row Level Security policies are present for the current database-backed MVP flows. The research MVP has not undergone production security certification or penetration testing.

## 4. Partial or Demonstration-Only Capabilities

- The current registration output is a browser-print **draft registration form**, not final official COR generation.
- The deployment is a temporary client preview and should use limited demonstration data.
- The program catalog contains multiple programs, and the Subject List includes workbook-derived offerings for several programs. Only BSAIS currently has seeded curriculum subjects used by online enrollment, so complete multi-program enrollment is not supported.
- Account claiming for Incoming First Year Students and Transferees depends on manually encoded official student records; no approved import workflow exists.
- The FRD describes generated credentials delivered by email, while the MVP uses a self-selected password so the account flow can be tested.
- Official student record fields and controlled options are guided MVP inputs, not finalized institutional value lists.
- Reports use browser printing, not an approved export, PDF, or registrar report format.

## 5. Placeholder Modules

The following routes show proposed system scope but are not operational modules:

- Grades
- Class Schedule
- Balances
- Encode Grades/Schedule

The draft registration form also contains non-operational placeholders for schedule values, section, fees, scholarship, payment details, and signature/clearance completion.

## 6. Explicit MVP Non-Goals

- Production operation using real student data.
- Real financial transactions or official assessment processing.
- Official grade processing or release.
- Official class scheduling or section assignment.
- Email-generated password delivery.
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
