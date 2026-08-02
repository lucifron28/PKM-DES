# PKM-DES Demonstration Data

## Purpose

The fictional records in `scripts/demo/demo-records.mjs` make the PKM-DES research presentation repeatable. They prepare clear examples of account claiming and enrollment review without using institutional records.

## Data Policy

- Every committed identity is fictional.
- `example.com` addresses are reserved fictional values, not active preview credentials.

After resetting a dedicated Supabase preview project, use [PREVIEW_CREDENTIALS.md](./PREVIEW_CREDENTIALS.md) to prepare private, unique fictional student passwords. The reset password is bootstrap-only and must not be used as a presentation credential.
- Passwords are supplied through environment variables and are never committed.
- Active Registrar credentials are distributed privately.
- Do not run the scripts against a real institutional database containing live student information.
- Exact dashboard verification requires a clean, dedicated preview or test Supabase database. Unrelated enrollment records make the documented presentation totals unreliable.

## Demonstration States

| Demo record | Student ID | Intended state | Presentation purpose |
| --- | --- | --- | --- |
| Andrea Reyes | `99-90001` | Claim-only official record | Demonstrate that a student can claim an official record using its exact fictional email, Student ID, and compatible type. No Auth user, profile, student row, or enrollment exists before claiming. |
| Benjamin Cruz | `99-90002` | Pending enrollment | Demonstrate the Registrar queue and pending result. |
| Camille Garcia | `99-90003` | Approved enrollment | Demonstrate enrolled status, masterlist, reports, and draft registration-form printing. |
| Daniel Mendoza | `99-90004` | Rejected enrollment | Demonstrate a rejected result with the neutral fictional remark recorded by the script. |

All four records use BSAIS, `1st Year`, and `Incoming 1st Year Student`. The script resolves the academic year and semester with the same environment-variable convention and fallback as the application. Pre-seeded review examples remain readable with legacy or offering-backed snapshots; a live post-claim submission additionally requires an active, complete BSAIS standard-load configuration for the configured term.

## Expected Dashboard State

The three enrollment records produce:

- Pending: 1
- Approved: 1
- Rejected: 1
- Total enrollment requests: 3

The claim-only official record does not appear in enrollment counts because it has no student row or enrollment request.

## Presentation Use

1. Show the existing pending, approved, and rejected examples.
2. Use the claim-only official record for the live account-claim flow.
3. After claiming it, submit a new enrollment request.
4. Verify that pending and total counts increase.
5. Review the new enrollment through the Registrar/Admin workflow.
6. Reset the fictional demo state before another presentation when the preview database is clean.

If the claim-only record was claimed during a presentation, the guarded reset intentionally stops rather than deleting that student row automatically. Remove only that exact fictional account and its matching rows through an approved preview-data cleanup process before running the reset again.

See [DEMO_RESET.md](./DEMO_RESET.md) for the guarded reset and verification steps.

## Limitations

These scripts prepare an MVP demonstration state only. They are not production fixtures, a student-record import process, or institutional records.
