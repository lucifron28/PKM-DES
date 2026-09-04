# Supabase operations

## Runtime configuration

Set `DATABASE_PROVIDER=supabase` for the application runtime. The variables below are defined by `.env.example` and are used by the Next.js and Supabase integrations:

| Variable | Use | Exposure |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | Browser-safe |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public Supabase client key | Browser-safe; RLS applies |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only privileged Supabase operations | Never expose to the browser |
| `ACCOUNT_CLAIM_SECRET` | Server-side account-claim signing | Server-only |
| `APP_BASE_URL` | Application origin used by server workflows | Server configuration |
| `EMAIL_DELIVERY_ENABLED` | Enables the email delivery path when configured | Server configuration |
| `GMAIL_SMTP_USER`, `GMAIL_SMTP_APP_PASSWORD`, `EMAIL_FROM` | Email delivery settings when email is enabled | Server-only |

Keep secrets out of source control and out of variables prefixed with `NEXT_PUBLIC_`.

## Local Supabase

The local configuration is in `supabase/config.toml`. It enables local Auth, PostgreSQL, Storage, migrations, and seed loading. The default local API port is `54321` and the database port is `54322`.

Start and stop the local stack with:

```powershell
npx supabase start
npx supabase stop
```

To rebuild the local database from migrations without loading seed data:

```powershell
npx supabase db reset --local --no-seed --yes
```

Run these commands only against the local Supabase stack. A reset removes local database state.

## Migrations and seed data

Migration files in `supabase/migrations/` are applied in filename order. Add a new forward migration for schema, policy, function, or index changes. `supabase/seed.sql` is the local seed source configured by `supabase/config.toml`.

The local migration directory and the hosted migration history are separate records. Before a hosted deployment, inspect the Supabase project migration history and apply any unapplied repository migrations through the Supabase project workflow. Do not infer hosted state from a local reset.

## Access model

The database stores base profiles and separate official assignments. Clearance access is determined by the authenticated profile, active assignment, enrollment, and applicable program. The assignment codes are `LIBRARIAN`, `NURSE`, `PROGRAM_CHAIR`, `ACCOUNTANT`, and `DEAN`.

RLS policies protect student, enrollment, clearance, health-record, and signature data. The signature Storage bucket is private. Server-side code uploads signature files and records the resulting signature metadata through the protected database workflow.

The Health Record Update currently stores medical-condition details, identification dates, medications, allergy, last menstrual period, and other notes. Student-owner and assigned-Nurse policies control access to those records.

## Hosted deployment checks

Before deploying the hosted application:

1. Set the Supabase URL, public key, service-role key, account-claim secret, and application URL in the hosting environment.
2. Confirm `DATABASE_PROVIDER=supabase`.
3. Confirm the hosted migration history contains the migrations required by the application revision.
4. Run `npm run check:production-env` and the relevant checks in [Testing and verification](TESTING.md).

The Vercel build runs `scripts/check-vercel-env.mjs` through the `prebuild` script. A hosted build must pass the Supabase provider check.

## Security review state

RLS was enabled on the application tables inspected in the current Supabase project review. The Supabase advisor still reports warnings, including mutable function search paths, executable security-definer functions, and disabled leaked-password protection. The repository does not treat the current state as a security certification. Review advisor findings before changing authentication, RLS, database functions, or signature storage.

## Troubleshooting

- If the provider check fails, verify that `DATABASE_PROVIDER` is exactly `supabase` in the process that runs the build.
- If a server workflow cannot access Supabase, verify the server-only URL, service-role key, and account-claim secret in the same deployment environment.
- If a new workflow fails after deployment, compare the hosted migration history with `supabase/migrations/` before changing application code.
- If a staff member sees the wrong workspace, verify the authenticated profile and its active `official_role_assignments` row.
- If a signature image is unavailable, verify the private Storage object, the authenticated access path, and the signed-URL operation.
