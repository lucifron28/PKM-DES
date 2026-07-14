# Development Sample Accounts

These are development-only sample values for local testing and demos. They are not official PKM student records, registrar records, or production credentials.

Preview credentials must be distributed privately. Do not use them for production, institutional, or personal accounts.

## Admin / Registrar

Create the Supabase Auth user manually first, then run `supabase/registrar_admin_setup.example.sql`.

| Role | Name | Email | Password |
| --- | --- | --- | --- |
| Registrar/Admin | Shaira Mae E. Pajares | `pkmregistrarofficial@gmail.com` | `<provided privately>` |

Set or update the preview password in Supabase Auth before the demo, then distribute it privately to authorized presenters.

## Tested Demo Student Account

This account has been verified through end-to-end browser testing for official record creation, account claiming, and online enrollment submission.

Before testing the student login flow, you must add this official record via the Admin dashboard (`/admin/students`).

| Field | Tested Value |
| --- | --- |
| Student ID Number | `25-00100` |
| First Name | `John` |
| Last Name | `Doe` |
| Email | `johndoe100@example.com` |
| Program | `Accounting Information System` |
| Year Level | `1st Year` |
| Student Type / Classification | `Incoming 1st Year Student` |
| Enrollment Status | `NOT ENROLLED` (Changes to `PENDING` after enrollment submission) |

### Account Claiming Details

Use `/create-account`, choose `Incoming 1st Year Student`, and find the record using either the email or Student ID Number above.

| Field | Tested Value |
| --- | --- |
| Email | `johndoe100@example.com` |
| Student ID Number | `25-00100` |
| Password | `<provided privately>` |

**Expected result**: 
1. The official record summary is shown.
2. Account creation succeeds after setting the password.
3. The student can log in, navigate to **Online Enrollment**, and submit their registration application for the upcoming term.
4. The dashboard will show **PENDING** status.
