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

## Access model and authorization boundaries

The database establishes distinct authorization tiers across application routes, RLS policies, and database RPCs:

1. **Registrar/Admin:** An active administrator account with no active official role assignments. Holds authority for institutional enrollment reviews, student record management, official signer assignments, catalog administration, and notification processing.
2. **Official Staff:** An active administrator account holding one or more active role assignments (`LIBRARIAN`, `NURSE`, `PROGRAM_CHAIR`, `ACCOUNTANT`, `DEAN`). Clearance access is strictly scoped to assigned roles and authorized programs (`program_id` match or global when `program_id` is null). Accountants can read and manage balances only for students in assigned programs; a global Accountant assignment retains global balance access. Assigned officials cannot approve/reject enrollments, mutate official assignments, modify sensitive profile fields, or directly read full official student records.
3. **Student:** Access is restricted to their own authorized profile, student record, enrollments, requirements, grades, balances, and signatures.

Direct reads of `official_student_records` and `grades` are limited to the Registrar and the student owner; no official staff route requires either full-record or grade access. Nurses receive only health-applicability context through the existing program-scoped `get_nurse_health_requirement` RPC.

**Signature visibility decision:** A complete registration form is available to the Registrar and the owner Student, so those roles can read all signature metadata and objects for that enrollment. Official Staff do not need peer signers' signature images in clearance workspaces: they can see signatures for their own assigned clearance roles; Nurses additionally see the Student pledge signature used in the Health Record Update form. Enrollment-signature RLS and Storage object RLS enforce the same scope.

Database RLS policies enforce program-level and role-level boundaries on `enrollments`, `enrollment_subjects`, `enrollment_clearances`, `enrollment_signatures`, `students`, `official_student_records`, `student_requirements`, `grades`, `balances`, and `signature_specimens`. Direct table updates to sensitive profile columns (`id`, `role`, `account_status`) are blocked for authenticated users. The signature Storage bucket is private.

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
