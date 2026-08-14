# PKM-DES Legacy Demo Fixture Reset Procedure

> For the final browser demonstration, use [DEMO_PREPARATION.md](../demo/DEMO_PREPARATION.md). This document describes the older claim-only/pending/approved/rejected fixture set.

> The reset command is destructive only for the exact fictional demo identities defined in `scripts/demo/demo-records.mjs`. It must never truncate tables or target live student records. Use it only with a clean, dedicated preview or test database.

## Required Environment Variables

Set these values in the terminal environment used to run the command. Do not commit them.

- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `DEMO_STUDENT_PASSWORD`
- `DEMO_RESET_CONFIRM=RESET_PKM_DES_DEMO`
- `DEMO_REGISTRAR_EMAIL` is optional and must be supplied privately when reviewed records should reference an existing admin profile.

The reset script uses the service-role key only in this explicitly invoked development command. It never prints the key, password, token, or session data. For the complete reset-to-presentation sequence, use the canonical order in [PREVIEW_CREDENTIALS.md](./PREVIEW_CREDENTIALS.md).

## Dry Run

Validate the target project, BSAIS program, configured term, and complete standard-load configuration without changing data:

```bash
npm run demo:reset:legacy -- --dry-run
```

The command prints `DRY RUN - NO DATA WAS CHANGED` before it exits. Dry run confirms configuration only; it is not a replacement for verification.

## Guarded Reset

Run only against a dedicated preview or test Supabase project that contains no live institutional information:

```bash
npm run demo:reset:legacy
```

The script deletes and recreates only exact, account-backed fictional identities whose Auth user, profile email, and Student ID all match the allowlisted demo record. Reserved Student IDs are collision checks only: a missing profile, non-demo profile, mismatched pair, or a student row for the claim-only ID stops the reset before any mutation. The script does not truncate tables or select records by broad date, status, program, or email-domain filters. It must find an active, complete standard-load configuration before creating attached demo enrollment snapshots; the client-provided workbook rows are used only through that matching active configuration.

Before removing those exact demo students, the reset removes only their exact enrollment-decision notification outbox rows so retained notification history cannot block the demo enrollment cleanup. It does not remove notification rows for unrelated students.

## Verify the Result

```bash
npm run demo:verify:legacy
```

Verification is read-only. It checks the claim-only record, all demo Auth identities, three account-backed enrollment states, exact subject attachments, current-term uniqueness, and expected dashboard counts. Dashboard totals require the database to contain only the three fictional enrollment records; additional enrollment records cause verification to fail because the presentation state cannot be guaranteed.

### Automated Smoke Tests
If you maintain a disposable smoke test project, you can run the automated browser test suite after verifying the reset. See [DEMO_WORKFLOW_SMOKE_TESTS.md](./DEMO_WORKFLOW_SMOKE_TESTS.md) for setup.

## Expected Record Counts

- Official student records: 4 fictional records
- Auth-backed profiles and students: 3
- Current-term enrollment requests: 3
- Pending: 1
- Approved: 1
- Rejected: 1

## Recovery After an Interrupted Reset

If a reset stops midway, do not use broad deletes. Correct the configuration error, rerun the guarded reset with the exact confirmation value, then run `npm run demo:verify`. If the claim-only record was used to create a student account, the reset intentionally stops for manual review; remove only that exact fictional account and matching rows through an approved preview-data cleanup process before resetting.

If manual cleanup is necessary, remove only the exact fictional users from Supabase Dashboard -> Authentication -> Users. Then remove only the matching fictional official records by their exact email and Student ID. Never remove live accounts, bulk-delete tables, or use a broad `example.com` filter.

## Registrar Privacy

The optional `DEMO_REGISTRAR_EMAIL` only looks up an existing admin profile for reviewed demo records. The script never creates a Registrar account, and active Registrar credentials remain private.

After a successful reset and `npm run demo:verify`, previously prepared preview passwords may no longer be appropriate. Follow [PREVIEW_CREDENTIALS.md](./PREVIEW_CREDENTIALS.md) to prepare and verify a new private presentation set on the same dedicated preview/test project.
