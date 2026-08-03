# Demo Workflow Smoke Tests

This repository includes a Playwright-based browser smoke test suite for the PKM-DES demonstration workflow.
## Purpose
These browser smoke tests verify the core demonstration path:
- Two-stage account claiming (find official record, then create account)
- Student enrollment submission (including the certification checkbox requirement)
- Inline Registrar approval with browser confirmation
- Reporting and Masterlist updates
- Registration form generation

**Note:** Browser smoke tests are not a replacement for focused unit and integration tests. They verify the demonstration path only. They do not prove production readiness, nor do they authorize real student data.

## Disposable-Project Requirement
The full serial workflow test mutates Auth and database state. It must **only** be run against a separately authorized, disposable, fictional-data Supabase project.

- It **does not** run against the public Vercel deployment.
- It **is not** enabled in CI.
- The mutating suite was **not** run during development without an authorized disposable project.

## Fictional-Data-Only Boundary
The workflow operates strictly using canonical fictional data (e.g., `pkm.demo.claim@example.com`).

## Local-Only Application URL
The suite strictly enforces a local-only loopback application URL (`http://localhost:3000` or `127.0.0.1`). It will reject any remote target (including Vercel or production deployments).

**Security Guard & Cross-Platform Execution:** The explicit runner (`scripts/smoke/run-demo-workflow.mjs`) is cross-platform and validates all environment and demo preconditions before invoking Playwright via the local repository CLI. Direct Playwright invocation (`npx playwright test tests/smoke/demo-workflow.spec.ts`) also remains independently guarded in its `beforeAll` hook. Neither runner will instantiate Playwright or start browser navigation when preconditions fail.

## Setup Order
1. Ensure your local application is running locally.
2. Create `.env.smoke.local` with the required variables (do not commit this file).
3. Run the tests (see Commands below).

## Suites
- **Public Read-Only Suite:** Checks public pages, security headers, and basic redirects. This public suite may run independently against a safe local app without database changes.
- **Mutating Serial Suite:** Checks the full lifecycle of an enrollment request. Must be run serially with 1 worker against a disposable database.

## Cleanup and Recovery After Partial Failure
If the browser test fails midway, failure stages are sanitized (e.g. `Smoke workflow failed after stage: enrollment_submitted`), ensuring no environment variables or credentials are leaked.
- The orchestrator will not hide the failure.
- Form values, cookies, and credentials are never printed. Password values never appear in selectors or output.
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

Run the public read-only suite (requires a safe local application):
```bash
npm run test:smoke:public
```

Run the guarded serial workflow suite (requires a separately authorized disposable fictional-data Supabase project):
```bash
npm run test:smoke:workflow
```

## Limitations
These smoke tests are minimal and sequential. They do not cover negative edge cases (e.g., abusive claims, duplicate enrollment), which are covered extensively by standard unit tests.
