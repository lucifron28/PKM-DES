# Client Inputs and Remaining Questions

This document records client-provided answers received after reviewing the FRD gaps. These inputs should guide future implementation, but they do not automatically authorize adding advanced modules outside the agreed MVP scope.

## Confirmed Client Inputs

### Account and Verification

- Incoming 1st Year Students and Transferees should not self-register freely.
- The Registrar should input or provide the student's data before the student can have an account.
- Alternatively, the student should already have a registrar-provided account before sign-in.
- Old Student verification can rely on Student ID Number alone.
- Account activation should use automatic matching against an official student/admitted-applicant list.
- The system should generate initial passwords and email them to students.
- Students should be allowed to change their passwords after account creation.

### Initial Registrar Role

- Role: Registrar
- The designated account identity and email are distributed privately and are not included in public project documentation.

### Academic Calendar

- Earlier client input identified First Semester, Academic Year 2026-2027 as the academic-calendar direction. For this research MVP branch, the supplied `LIST OF COURSES FOR 2ND SEM AY 25-26.xlsx` is the operational client-provided load for AY 2025-2026, 2nd Semester. Changing the active term still requires coordinated Registrar confirmation and application/database configuration.

### Enrollment Approval and Rejection

- Enrollment is approvable when all requirements and documents are complete and accurate.
- Enrollment is rejectable when the student's data does not match official records or is incorrect.
- Rejection remarks should be free-text only.
- Rejected enrollment cannot be automatically resubmitted for the same academic year and semester. Note: This terminal rejection behavior is a provisional project-owner MVP rule, not confirmed institutional policy; any future return-for-correction or versioned resubmission workflow requires explicit PKM approval.
- The official requirements and document checklist remains an outstanding client input; the MVP does not invent document verification steps.

### Enrollment Subjects and Classification

- Enrollment should automatically attach all subjects according to the student's year level and semester.
- For irregular students, the Registrar should load the specific subjects to be taken.
- The Registrar is responsible for assigning Regular, Irregular, and Continuing classification tags.
- For transferees, credited subjects from the previous school should reduce or adjust the subject load during enrollment.
- The current research MVP therefore directs Transferee and Irregular Student records to Registrar-managed handling instead of automatically attaching a standard load. It does not implement transfer-credit evaluation or adjusted subject loading without the required official rules.

### Student Records

Required student profile fields beyond the current MVP:

- Birthdate
- Gender/Sex
- Address
- Contact Number
- Guardian
- Emergency Contact Person
- Nationality
- Civil Status
- Previous School Information
- Admission Status
- Enrollment Status

- Official Student Record Authority: The Official Student Record is the authoritative Registrar source for student identity, address, and academic classification.
- Linked Account Fields: `students.official_record_id` links a student account directly and atomically to its official record.
- Fields Synchronized: Updating an official record atomically synchronizes linked student account fields (`profiles.first_name`, `profiles.last_name`, `students.program_id`, `students.year_level`, `students.student_type`, `students.student_id_number`).
- Email Exception: Official record email changes surface an explicit `email_mismatch` warning; Supabase Auth and profile email addresses are never changed silently without a separate Auth-aware operation.
- Ambiguous Legacy Records: Unambiguous 1-to-1 legacy matches are backfilled by exact Student ID and email; ambiguous or competing records remain unlinked until resolved.
- Official student-record enrollment status remains Registrar source metadata in the MVP. It is separate from a student's submitted enrollment request and must not be treated as an approval, rejection, or account update.
Student ID examples:

- `23-00340`
- `23-00341`
- `23-00342`

The examples were given with names, but the likely ID pattern is the two-digit year followed by a hyphen and five digits. This still needs final confirmation before strict validation is implemented.

### Outputs and Reports

- COR / registration form generation is required.
- Printable enrollment/masterlist reports are required.
- The client emphasized that the most important next output is the ability to generate, report, and produce a printable registration form.
- The dashboard should remain accessible to both students and administrators.
- The current research MVP report and masterlist present submitted enrollment requests through browser printing only; PKM still needs to supply the approved final report/export format.

### Future Modules

- Grades should use the `1.00-5.00` grading scale.
- Standard grade remarks include `INC`, `DRP`, and `Fail`.
- Grades must be officially released by the Registrar at the end of the semester.
- Official class schedule fields: section, instructor, room, days, and time.
- Balances/payment details are handled by the Finance Office.
- Digital clearance/signature order: Dean, Librarian, Nurse, Accountant, Registrar.


### Provisional Email Decisions

These are provisional implementation boundaries. They do not constitute formal institutional policy.
- Use Gmail SMTP through a server-only adapter and an authorized PKM mailbox.
- Use a one-time password-setup or recovery link.
- Never email or log a plaintext password.
- Keep email delivery disabled by default; actual delivery requires explicit server configuration.
- Preserve generic responses to avoid email/account enumeration.
- Preserve existing official-record claim and duplicate-account protections.
- Failed delivery must not leave an active usable account without a completed setup flow.
- Support safe setup-email re-delivery with cooldown or idempotency protection.
- Enrollment approval/rejection notices use a durable status-only outbox; rejection remarks remain in the student portal and are not included in email.
- A notification failure must not reverse the Registrar's saved enrollment decision; an authorized Registrar may retry a failed notification.

### Provisional Health Record Update Decisions

These are provisional implementation boundaries. They do not constitute formal institutional policy.
- Applies to Incoming 1st Year Student records identified as female from the Registrar-managed official record.
- Never infer sex from a name.
- The physical form remains with PKM Health Services.
- PKM-DES stores requirement status only. Do not store medical conditions, medications, allergies, menstrual information, scans, or detailed medical notes.
- The Registrar records whether Health Services verified the paper form (a separate Health Services user role is deferred).
- Enrollment submission may remain PENDING, but final approval is blocked until all applicable required items are VERIFIED.

## Still Missing or Needs Client Files

These items remain needed before implementation can be considered official:

- Official PKM logo file
- Official COR / registration form template file
- Official printable enrollment/masterlist report format
- Official admitted-applicant/student import file format
- Final formal program title for the AIS program
- Exact Student ID validation rule
- Official student-record bulk import format and validation rules
- Complete student record/import sample, even if anonymized
- Email sender/service approval and email templates
- Official requirements/document checklist used for enrollment approval
- Official process for loading irregular/transferee adjusted subjects
- Official Finance Office payment/balance fields and statuses

## Suggested Next Implementation Priority

1. Registrar-managed official student/admitted-applicant list.
2. Automatic matching during account creation.
3. Registrar account setup for the designated internal Registrar account.
4. Generated password and email delivery workflow.
5. Printable registration form/COR output using the official template.
6. Student record fields expansion.
7. Irregular/transferee subject loading by Registrar.

Do not implement grades encoding, class schedule encoding, balances/payment processing, or digital clearance until the official detailed rules and formats are provided.
