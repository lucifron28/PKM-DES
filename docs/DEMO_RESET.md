# PKM-DES Demo Reset Procedure

> The reset command is destructive only for the exact fictional demo identities defined in `scripts/demo/demo-records.mjs`. It must never truncate tables or target live student records.

## Required Environment Variables

Set these values in the terminal environment used to run the command. Do not commit them.

- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `DEMO_STUDENT_PASSWORD`
- `DEMO_RESET_CONFIRM=RESET_PKM_DES_DEMO`
- `DEMO_REGISTRAR_EMAIL` is optional and must be supplied privately when reviewed records should reference an existing admin profile.

The reset script uses the service-role key only in this explicitly invoked development command. It never prints the key, password, token, or session data.

## Dry Run

Validate the target project, BSAIS program, configured term, and subject count without changing data:

```bash
npm run demo:reset -- --dry-run
```

The command prints `DRY RUN - NO DATA WAS CHANGED` before it exits. Dry run confirms configuration only; it is not a replacement for verification.

## Guarded Reset

Run only against a dedicated preview or test Supabase project that contains no live institutional information:

```bash
npm run demo:reset
```

The script deletes and recreates only the exact fictional `example.com` identities and reserved Student IDs defined in `scripts/demo/demo-records.mjs`. It does not truncate tables or select records by broad date, status, program, or email-domain filters.

## Verify the Result

```bash
npm run demo:verify
```

Verification is read-only. It checks the claim-only record, three account-backed enrollment states, subject attachments, current-term uniqueness, and expected dashboard counts.

## Expected Record Counts

- Official student records: 4 fictional records
- Auth-backed profiles and students: 3
- Current-term enrollment requests: 3
- Pending: 1
- Approved: 1
- Rejected: 1

## Recovery After an Interrupted Reset

If a reset stops midway, do not use broad deletes. Correct the configuration error, rerun the guarded reset with the exact confirmation value, then run `npm run demo:verify`.

If manual cleanup is necessary, remove only the exact fictional users from Supabase Dashboard -> Authentication -> Users. Then remove only the matching fictional official records by their exact email and Student ID. Never remove live accounts, bulk-delete tables, or use a broad `example.com` filter.

## Registrar Privacy

The optional `DEMO_REGISTRAR_EMAIL` only looks up an existing admin profile for reviewed demo records. The script never creates a Registrar account, and active Registrar credentials remain private.
