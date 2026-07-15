# PKM-DES Demo Runbook

Use this as the short script for a PKM-DES MVP walkthrough. The demo should show the real implemented path and clearly label placeholders.

## Demo URL

- Local: `http://localhost:3000`
- Vercel: `https://pkm-des.vercel.app`

## Demo Accounts

Development credentials depend on the current Supabase Auth or SQLite seed state. Preview credentials must be distributed privately and must not be stored in project documentation.

| Role | Email | Password |
| --- | --- | --- |
| Registrar/Admin | `<provided privately>` | `<provided privately>` |

For student testing, see [SAMPLE_ACCOUNTS.md](./SAMPLE_ACCOUNTS.md). If a sample student has not claimed an account yet, create or confirm the matching Official Student Record first, then claim the account through `/create-account`.

Use [DEMO_DATA.md](./DEMO_DATA.md) for the fictional presentation states and [DEMO_RESET.md](./DEMO_RESET.md) for the guarded reset procedure. Active credentials remain private.

## Main Demo Story

1. Open the Home page and show the PKM-DES public entry point.
2. Open About Us and show the PKM identity, mission, goals, and contact details from the provided source document.
3. Log in as Registrar/Admin and show the existing pending, approved, and rejected fictional enrollment examples.
4. Open Student Records and explain that these are Registrar-managed official records used for account matching.
5. Locate the fictional claim-only official record described in [DEMO_DATA.md](./DEMO_DATA.md).
6. Log out, then open Create Student Account.
7. Use the claim-only record's exact fictional email, Student ID, and `Incoming 1st Year Student` selection as the live account-claim example.
8. Log in as the student and open the Student Dashboard.
9. Open Subject List and show the year/semester grouped tables.
10. Open Online Enrollment and point out the read-only recorded program, year level, student type, and fixed AY 2026-2027, 1st Semester. Submit using an eligible fictional BSAIS standard-load student.
11. Show Enrollment Status Result with `PENDING` status.
12. Log back in as Registrar/Admin.
13. Open Pending Enrollments and approve or reject the submitted request.
14. Show the updated Admin Dashboard counts and Enrollment Masterlist.
15. Open View/Print Form and use browser print preview for the MVP draft registration form based on the supplied sample workbook layout.

## What To Say About Counts

- Official Student Records are not enrollment submissions.
- Admin Dashboard, Pending Enrollments, Reports, and Masterlist count submitted enrollment records only.
- Reports and Masterlist use the same submitted-request source and can filter by program, academic year, year level, semester, review status, and student identity. Overall Student Status in the Masterlist is separate from the request review status.
- A student appears in those enrollment pages after they claim an account and submit Online Enrollment.
- The browser does not choose academic details or subjects. Transferee and Irregular Student records require Registrar-managed subject assignment and are not used for the automatic submission demonstration.

## Placeholder Talking Points

- The registration form follows the supplied sample workbook layout, but it is still a browser-print MVP draft until PKM confirms the final official COR template.
- Fee, scholarship, payment, section, and schedule values remain placeholders unless official encoded data exists.
- Grades, Class Schedule, Balances, Student Records expansion, and Encode Grades/Schedule are placeholder pages.
- Generated-password email delivery is not implemented yet.
- Digital clearance/signature routing is a future workflow after PKM supplies the official order and rules.

## Quick Smoke Test

Before the demo:

```bash
npm run typecheck
npm run lint
npm run build
npm run demo:verify
```

Then verify:

- Admin login works.
- Demo verification passes before the presentation.
- Student claim flow works for one sample official record.
- Student enrollment submission creates a pending enrollment.
- Admin dashboard counts update after submission and approval/rejection.
- Registration form print preview hides sidebar/navigation, keeps the draft disclaimer visible, and shows the sample-style fields, subject table, fee placeholders, and signature labels.
