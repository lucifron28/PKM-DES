# PKM-DES Demo Accounts

> **DEMO / DEVELOPMENT USE ONLY**
>
> These are fictional disposable accounts for the PKM-DES browser demonstration. They are not production credentials and must not be reused outside the controlled demo environment.

Every account below is a separate fictional login. All six staff accounts use the same demo password:

```text
Demo1234!
```

| Demo role | Email | Application access |
| --- | --- | --- |
| Registrar | `pkmregistrarofficial@gmail.com` | Registrar/Admin-management |
| Librarian | `pkm.demo.librarian@example.com` | Library Clearance |
| Nurse | `pkm.demo.nurse@example.com` | Health Clearance / Digital Health Record Verification |
| Program Chair | `pkm.demo.programchair@example.com` | Program Clearance |
| Accountant | `pkm.demo.accountant@example.com` | Accounting Clearance |
| Dean | `pkm.demo.dean@example.com` | Dean Clearance |
| Student | `pkm.demo.student@example.com` | Student portal |

The Registrar is the only standard demo account without an official signing assignment. Each other staff login has exactly the capability shown in the table. The shared password is only a convenience for this fictional demonstration; it does not make the staff accounts one account and it must not be used for real staff.

The account verifier performs a real Supabase login for each staff email without printing the password:

```powershell
npm run demo:verify:accounts
```

The primary student fixture is fictional Maria Demo Student (`26-DEMO-001`), a Female Incoming 1st Year BSAIS student. The preparation command keeps the student at a clean starting state with no current-term enrollment or official signatures.

Never commit infrastructure secrets, service-role keys, database passwords, email credentials, or Vercel secrets to this file.
