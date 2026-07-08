# Development Sample Accounts

These are development-only sample values for local testing and demos. They are not official PKM student records, registrar records, or production credentials.

Do not use these passwords in production.

## Admin / Registrar

Create the Supabase Auth user manually first, then run `supabase/registrar_admin_setup.example.sql`.

| Role | Name | Email | Password |
| --- | --- | --- | --- |
| Registrar/Admin | Shaira Mae E. Pajares | `pkmregistrarofficial@gmail.com` | `Demo1234!` for the shared demo setup |

If the Supabase Auth user was created with a different password, update it in Supabase Auth before the demo.

## Old Student Self-Registration

Use `/create-account`, choose `Old Student`, and enter Student ID Number `23-00340`.

| Field | Sample Value |
| --- | --- |
| Student ID Number | `23-00340` |
| First Name | `Juan` |
| Last Name | `Dela Cruz` |
| Email | `juan.delacruz@pkm-des.local` |
| Program | `Accounting Information System` |
| Year Level | `1st Year` |
| Student Type | `Old Student` |
| Password | `ChangeMe123!` |

Expected result: account is created as `ACTIVE` and can log in immediately.

## Incoming 1st Year Student

Before account creation, add this official record in `/admin/students`.

| Field | Sample Value |
| --- | --- |
| Student ID Number | Leave blank or use `26-00001` |
| First Name | `Maria` |
| Last Name | `Santos` |
| Email | `maria.santos@pkm-des.local` |
| Program | `Accounting Information System` |
| Year Level | `1st Year` |
| Student Type / Classification | `Incoming 1st Year Student` |
| Enrollment Status | `NOT ENROLLED` |

Then use `/create-account`, choose `Incoming 1st Year Student`, and find the record using either email or Student ID Number.

| Field | Sample Value |
| --- | --- |
| Email | `maria.santos@pkm-des.local` |
| Student ID Number | `26-00001` if supplied in the official record |
| Student Type | `Incoming 1st Year Student` |
| Password | `ChangeMe123!` |

Expected result: the official record summary is shown, then account creation succeeds after setting a password.

## Transferee Student

Before account creation, add this official record in `/admin/students`.

| Field | Sample Value |
| --- | --- |
| Student ID Number | Leave blank or use `26-00002` |
| First Name | `Carlos` |
| Last Name | `Reyes` |
| Email | `carlos.reyes@pkm-des.local` |
| Program | `Accounting Information System` |
| Year Level | `2nd Year` |
| Student Type / Classification | `Transferee` |
| Enrollment Status | `NOT ENROLLED` |
| Previous School Information | `Sample previous college` |

Then use `/create-account`, choose `Transferee`, and find the record using either email or Student ID Number.

| Field | Sample Value |
| --- | --- |
| Email | `carlos.reyes@pkm-des.local` |
| Student ID Number | `26-00002` if supplied in the official record |
| Student Type | `Transferee` |
| Password | `ChangeMe123!` |

Expected result: the official record summary is shown, then account creation succeeds after setting a password.
