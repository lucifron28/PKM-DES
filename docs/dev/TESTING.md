# Testing and verification

## CI checks

The workflow in `.github/workflows/ci.yml` installs dependencies with `npm ci`, checks the diff, runs type checking and linting, executes the application tests, and builds the Next.js application with public Supabase variables supplied by CI.

Run the main local checks with:

```powershell
npm run typecheck
npm run lint
npm run test:deployment-env
npm run test:smoke-env
npm run build
```

## Application test groups

The package scripts expose focused checks for account claims, student enrollment, enrollment reporting, admin enrollment review, admin student records, registration-form presentation, signatures, health records, and signature UI. Use the focused script that matches the code being changed; use the CI workflow for the complete repository check.

The registration-form presentation test covers the rendered signature blocks and verifies that the enrolled stamp is not present. Health-record tests cover the student form and Nurse review behavior.

## Local Supabase verification

Start the local Supabase stack before running database verification:

```powershell
npx supabase start
npx supabase db reset --local --no-seed --yes
```

Run the repository SQL checks against the local database:

```powershell
psql -h 127.0.0.1 -p 54322 -U postgres -d postgres -f scripts/integration/verify-local-supabase-workflows.sql
psql -h 127.0.0.1 -p 54322 -U postgres -d postgres -f scripts/integration/verify-bsais-migration-collision.sql
psql -h 127.0.0.1 -p 54322 -U postgres -d postgres -f scripts/integration/verify-multi-program-standard-load.sql
```

The concurrency check is a PowerShell script:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/integration/verify-local-supabase-concurrency.ps1
```

Stop the local stack after verification with `npx supabase stop`. These checks are local-only and must not target a hosted database.

## Browser checks

Use the public smoke test for unauthenticated routes:

```powershell
npm run test:smoke:public
```

The workflow smoke test requires a running local application and the environment file expected by `scripts/smoke/run-demo-workflow.mjs`:

```powershell
npm run test:smoke:workflow
```

Run browser checks at a desktop viewport when validating responsive layout and print-preview behavior. The workflow smoke test mutates local data; do not point it at a hosted project.

## Documentation and change validation

For documentation-only changes, inspect the staged diff, run `git diff --check`, and verify every relative Markdown link. For application changes, include the focused test for the affected route or domain area and run the relevant Supabase checks when migrations, RLS, functions, Storage, or server-side data access changed.
