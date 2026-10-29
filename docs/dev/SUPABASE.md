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

## Student account setup and trusted origins

Student account setup uses a two-stage verification process to prevent automated email link scanners (anti-phishing bots and link prefetchers) from consuming single-use magic-link tokens:

1. **Stage A (GET `/auth/callback`):** When a student or link preview bot opens the emailed link (`/auth/callback?token_hash=...&type=magiclink`), the route validates that `type=magiclink` and a non-empty `token_hash` are present. It does **not** invoke `verifyOtp()` on GET. It serializes the validated claim into a short-lived (15 min) `HttpOnly`, `SameSite=Lax` signed cookie (`pkm_setup_claim`) and redirects to `/auth/confirm-setup` on the same trusted origin, stripping sensitive query parameters.
2. **Stage B (POST `/auth/confirm-setup/verify`):** The student confirms setup by clicking "Continue Account Setup", sending a POST request. The server verifies the request origin against explicitly trusted application origins (CSRF protection), verifies the token via `supabase.auth.verifyOtp({ token_hash, type: "magiclink" })`, writes `@supabase/ssr` session cookies to the HTTP 303 redirect response, clears the temporary cookie, and redirects to `/setup-account`.

### Trusted origin configuration

POST confirmation validates `Origin` (or fallback `Referer`) against an exact server-side origin allowlist. The client origin must also equal the destination origin of the request:

- **Production:** Set `APP_BASE_URL` to the canonical production URL (e.g. `https://pkm-des.edu.ph` or `https://pkm-des.vercel.app`). Vercel's server-side `VERCEL_PROJECT_PRODUCTION_URL` is also recognized as an exact hostname.
- **Preview Deployments:** The server-side Vercel values `VERCEL_URL` and `VERCEL_BRANCH_URL` are normalized to HTTPS origins and accepted only by exact match. Other `*.vercel.app` names, including project-name lookalikes, are not implicitly trusted. Do not use a `NEXT_PUBLIC_*` alias as server-side authorization evidence.
- **Origin handling:** A present `Origin` header is authoritative; malformed or empty values fail closed rather than falling back. `Referer` is used only when `Origin` is absent and must be an HTTP(S) URL. The request destination must be that same origin.
- **Localhost Development:** Loopback origins are permitted only outside production when `APP_BASE_URL` itself is configured to a loopback origin. Port variation is limited to this explicitly configured local development/test case. Hosted production always rejects loopback origins.
- **Security Enforcement:** `Host`, `x-forwarded-host`, and `x-forwarded-proto` are not evidence of authorization. Requests with missing, malformed, cross-origin, or unlisted origins fail closed and redirect to `/setup-account?error=invalid_origin` with the temporary claim cookie cleared.

### Disposable Supabase Auth lifecycle test

`npm run test:student-account-setup-integration` drives the real application flow through local Supabase Auth, PostgREST, PostgreSQL, and Playwright. It requires an explicitly configured disposable local stack, verifies loopback URLs, the local PostgreSQL database/user/version, Supabase Auth tables, and migration history before creating fixtures, then cleans up only run-specific record IDs in `finally`. It never links to or targets a hosted Supabase project.

GitHub Actions runs this suite in a dedicated job with a fresh, unlinked Supabase CLI stack and no repository secrets. Starting the stack applies the checked-in migrations and local seed. To run it manually, start the local stack with `supabase start`, export its environment using `supabase status -o env`, start the app at `http://localhost:3000`, set `APP_BASE_URL=http://localhost:3000`, `PKM_SUPABASE_INTEGRATION_ENV=disposable-local`, and `PKM_SUPABASE_INTEGRATION_PROJECT_ID=PKM-DES`, then run the script. Do not point the test at hosted databases or add production credentials to CI.

The automated test covers the two-stage link flow, session cookies, password setup, activation, student access, repeated/replayed links, anonymous access, and admin rejection. Mobile Safari remains a manual verification because the automated browser uses Chromium. The third-year enrollment report is separate from account setup: check the configured active-term standard load for the student's program and year; do not invent or modify academic subjects to hide a missing/incomplete load.

## Hosted deployment checks

Before deploying the hosted application:

1. Set the Supabase URL, public key, service-role key, account-claim secret, and application URL in the hosting environment.
2. Confirm `DATABASE_PROVIDER=supabase`.
3. Confirm the hosted migration history contains the migrations required by the application revision.
4. Confirm `APP_BASE_URL` matches the canonical deployment URL.
5. Run `npm run check:production-env` and the relevant checks in [Testing and verification](TESTING.md).

The Vercel build runs `scripts/check-vercel-env.mjs` through the `prebuild` script. A hosted build must pass the Supabase provider check.
## Security review state

RLS was enabled on the application tables inspected in the current Supabase project review. The Supabase advisor still reports warnings, including mutable function search paths, executable security-definer functions, and disabled leaked-password protection. The repository does not treat the current state as a security certification. Review advisor findings before changing authentication, RLS, database functions, or signature storage.

## Troubleshooting

- If the provider check fails, verify that `DATABASE_PROVIDER` is exactly `supabase` in the process that runs the build.
- If a server workflow cannot access Supabase, verify the server-only URL, service-role key, and account-claim secret in the same deployment environment.
- If a new workflow fails after deployment, compare the hosted migration history with `supabase/migrations/` before changing application code.
- If a staff member sees the wrong workspace, verify the authenticated profile and its active `official_role_assignments` row.
- If a signature image is unavailable, verify the private Storage object, the authenticated access path, and the signed-URL operation.
