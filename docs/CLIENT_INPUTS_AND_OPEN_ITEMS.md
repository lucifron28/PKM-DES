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

### Initial Admin User

- Name: Shaira Mae E. Pajares
- Email: `pkmregistrarofficial@gmail.com`
- Role: Registrar

### Academic Calendar

- Current confirmed academic term: First Semester, Academic Year 2026-2027

### Enrollment Approval and Rejection

- Enrollment is approvable when all requirements and documents are complete and accurate.
- Enrollment is rejectable when the student's data does not match official records or is incorrect.
- Rejection remarks should be free-text only.
- Rejected enrollment should not be resubmitted for the same academic year and semester.

### Enrollment Subjects and Classification

- Enrollment should automatically attach all subjects according to the student's year level and semester.
- For irregular students, the Registrar should load the specific subjects to be taken.
- The Registrar is responsible for assigning Regular, Irregular, and Continuing classification tags.
- For transferees, credited subjects from the previous school should reduce or adjust the subject load during enrollment.

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

### Future Modules

- Grades should use the `1.00-5.00` grading scale.
- Standard grade remarks include `INC`, `DRP`, and `Fail`.
- Grades must be officially released by the Registrar at the end of the semester.
- Official class schedule fields: section, instructor, room, days, and time.
- Balances/payment details are handled by the Finance Office.
- Digital clearance/signature order: Dean, Librarian, Nurse, Accountant, Registrar.

## Still Missing or Needs Client Files

These items remain needed before implementation can be considered official:

- Official PKM logo file
- Official COR / registration form template file
- Official printable enrollment/masterlist report format
- Official admitted-applicant/student import file format
- Final formal program title for the AIS program
- Exact Student ID validation rule
- Complete student record/import sample, even if anonymized
- Email sender/service approval and email templates
- Official requirements/document checklist used for enrollment approval
- Official process for loading irregular/transferee adjusted subjects
- Official Finance Office payment/balance fields and statuses

## Suggested Next Implementation Priority

1. Registrar-managed official student/admitted-applicant list.
2. Automatic matching during account creation.
3. Registrar account setup for Shaira Mae E. Pajares.
4. Generated password and email delivery workflow.
5. Printable registration form/COR output using the official template.
6. Student record fields expansion.
7. Irregular/transferee subject loading by Registrar.

Do not implement grades encoding, class schedule encoding, balances/payment processing, or digital clearance until the official detailed rules and formats are provided.
