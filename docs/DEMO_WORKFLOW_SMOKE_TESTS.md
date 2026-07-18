# Demo Workflow Smoke Tests

This repository includes a Playwright-based browser smoke test suite for the PKM-DES demonstration workflow. 

## Purpose
These browser smoke tests verify the core demonstration path:
- Account claiming
- Student enrollment submission
- Registrar approval
- Reporting and Masterlist updates
- Registration form generation

**Note:** Browser smoke tests are not a replacement for focused unit and integration tests. They verify the demonstration path only. They do not prove production readiness, nor do they authorize real student data.

## Disposable-Project Requirement
The full serial workflow test mutates Auth and database state. It must **only** be run against a separately authorized, disposable, fictional-data Supabase project.

- It **does not** run against the public Vercel deployment.
- It **is not** enabled in CI.
- The full workflow cannot be run unless a separately authorized disposable project is supplied.

## Fictional-Data-Only Boundary
The workflow operates strictly using canonical fictional data (e.g., `pkm.demo.claim@example.com`).

## Local-Only Application URL
The suite strictly enforces a local-only loopback application URL (`http://localhost:3000` or `127.0.0.1`). It will reject any remote target (including Vercel or production deployments).

## Setup Order
1. Ensure your local application is running on port 3000.
2. Create `.env.smoke.local` with the following variables (do not commit this file):
   - `SMOKE_BASE_URL` (must be a local URL)
   - `SMOKE_EXPECTED_SUPABASE_HOST`
   - `SMOKE_WORKFLOW_CONFIRM=RUN_PKM_DES_DISPOSABLE_SMOKE`
   - `SMOKE_REGISTRAR_EMAIL`
   - `SMOKE_REGISTRAR_PASSWORD`
   - `SMOKE_NEW_STUDENT_PASSWORD`
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `ACCOUNT_CLAIM_SECRET`
   - `DATABASE_PROVIDER=supabase`
3. Run the tests (see Commands below).

## Suites
- **Public Read-Only Suite:** Checks public pages, security headers, and basic redirects. Does not mutate state.
- **Mutating Serial Suite:** Checks the full lifecycle of an enrollment request. Must be run serially with 1 worker against a disposable database.

## Expected State Transitions
The test assumes the claim-only demo identity has no account initially, claims the account, submits an enrollment (PENDING), and then the Registrar approves it (APPROVED). 

## Cleanup and Recovery After Partial Failure
If the browser test fails halfway, the database and Auth state may be partially mutated.
- The orchestrator will not hide the failure.
- Form values, cookies, and credentials are never printed.
- To recover, you must run the guarded demo reset (`npm run demo:reset`) against your disposable project before retrying.

## Secret-Handling Rules
- Never commit `.env.smoke.local`.
- Playwright traces, screenshots, and videos are disabled by default.
- No passwords, keys, or secrets are printed in console logs or assertion errors.

## Commands

Run the environment guard tests:
```bash
npm run test:smoke-env
```

Run the public read-only suite:
```bash
npm run test:smoke:public
```

Run the guarded serial workflow suite:
```bash
npm run test:smoke:workflow
```

## Limitations
These smoke tests are minimal and sequential. They do not cover negative edge cases (e.g., abusive claims, duplicate enrollment), which are covered extensively by standard unit tests.
