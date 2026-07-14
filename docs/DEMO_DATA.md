# PKM-DES Demonstration Data

## Purpose

The fictional records in `scripts/demo/demo-records.mjs` make the PKM-DES research presentation repeatable. They prepare clear examples of account claiming and enrollment review without using institutional records.

## Data Policy

- Every committed identity is fictional.
- `example.com` addresses are reserved fictional values, not active preview credentials.
- Passwords are supplied through environment variables and are never committed.
- Active Registrar credentials are distributed privately.
- Do not run the scripts against a real institutional database containing live student information.

## Demonstration States

| Demo record | Student ID | Intended state | Presentation purpose |
| --- | --- | --- | --- |
| Andrea Reyes | `99-90001` | Claim-only official record | Demonstrate that a student can find an official record and claim an account. No Auth user, profile, student row, or enrollment exists before claiming. |
| Benjamin Cruz | `99-90002` | Pending enrollment | Demonstrate the Registrar queue and pending result. |
| Camille Garcia | `99-90003` | Approved enrollment | Demonstrate enrolled status, masterlist, reports, and draft registration-form printing. |
| Daniel Mendoza | `99-90004` | Rejected enrollment | Demonstrate a rejected result with the neutral fictional remark recorded by the script. |

All four records use BSAIS, `1st Year`, and `Incoming 1st Year Student`. The script resolves the academic year and semester with the same environment-variable convention and fallback as the application.

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
6. Reset the fictional demo state after testing or before another presentation.

See [DEMO_RESET.md](./DEMO_RESET.md) for the guarded reset and verification steps.

## Limitations

These scripts prepare an MVP demonstration state only. They are not production fixtures, a student-record import process, or institutional records.
