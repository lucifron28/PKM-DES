# Verification Gates and Testing Procedures

This document details the functional quality assurance gates, testing layers, and verification procedures for PKM-DES.

## 1. Non-Secret Continuous Integration (GitHub Actions)

The repository workflow (`.github/workflows/ci.yml`) runs automatically on pull requests and pushes to `main`. It uses Node.js 20 and requires no live credentials or secrets.

### Automated Gates Run in Hosted CI:
- **Dependency Installation**: `npm ci`
- **Git Diff & Whitespace Verification**: `git diff --check`
- **TypeScript Type Checking**: `npm run typecheck` (`tsc --noEmit`)
- **ESLint Code Quality**: `npm run lint` (`eslint .`)
- **Unit & Domain Test Suites**:
  - `npm run test:smoke-env`
  - `npm run test:account-claim`
  - `npm run test:admin-enrollment-review`
  - `npm run test:admin-student-records`
  - `npm run test:student-enrollment`
  - `npm run test:registration-form`
  - `npx tsx --test lib/account-setup/*.test.ts`
  - `npx tsx --test lib/course-offerings/*.test.ts`
  - `npx tsx --test lib/email/*.test.ts`
  - `npx tsx --test lib/requirements/*.test.ts`
  - `npx tsx --test lib/auth/*.test.ts`
  - `npx tsx --test components/ui/*.test.ts`
- **Production Next.js Build**: `npm run build`

*Note: TypeScript unit tests validate application business logic, state transformations, and input sanitization. They do not validate PostgreSQL database migrations, RLS policies, RPC execution, or database concurrency.*

## 2. Local Supabase Database & Concurrency Verification (Separate Local/Manual Gate)

Database migrations, RLS policies, atomic RPCs (`submit_standard_student_enrollment`, `review_pending_enrollment`, `update_official_student_record_and_sync`, `reserve_student_setup_email_delivery`, `release_student_setup_email_delivery`), and unique indexes are separate gates executed against a disposable local Supabase deployment.

### Prerequisites:
- Docker Desktop running locally.
- Supabase CLI installed (`npx supabase`).

### Execution Commands for Local Database Verification:
```bash
# 1. Start local Supabase containers
npx supabase start

# 2. Reset local database and apply all forward-only migrations
npx supabase db reset --local --no-seed --yes

# 3. Run the SQL workflow and RLS verification script
# (Executes scripts/integration/verify-local-supabase-workflows.sql inside local Postgres)
psql -h 127.0.0.1 -p 54322 -U postgres -d postgres -f scripts/integration/verify-local-supabase-workflows.sql

# 4. Run the BSAIS program alias migration collision verification script
psql -h 127.0.0.1 -p 54322 -U postgres -d postgres -f scripts/integration/verify-bsais-migration-collision.sql

# 5. Run the generic multi-program standard-load verification script
# (Uses fictional BSAIS, BSMA, and BEED configurations, then rolls them back.)
psql -h 127.0.0.1 -p 54322 -U postgres -d postgres -f scripts/integration/verify-multi-program-standard-load.sql

# 6. Run the concurrency verification script
powershell -ExecutionPolicy Bypass -File scripts/integration/verify-local-supabase-concurrency.ps1

# 7. Stop local Supabase containers when finished
npx supabase stop
```

The multi-program fixture verifies exact offering-backed attachment IDs and
course snapshots for multiple programs, routes Transferee records to Registrar
handling, rejects unconfigured programs, and rolls back all fictional rows.
Historical workbook offerings remain historical and are never relabelled as the
current enrollment term.

## 3. Playwright End-to-End Browser Testing

Browser scenarios validate user-facing flows using fictional demonstration credentials against a local development server or disposable local Supabase deployment.

### Fictional Data Constraints:
- Use only fictional example identities (`example.com` domain, test Student IDs).
- Do not configure or send live emails during browser tests.
- Do not run against institutional or production databases.

### Commands:
```bash
# Execute public smoke tests (does not require secrets or live services)
npm run test:smoke:public

# Execute full demo workflow smoke tests (requires local server running)
npm run test:smoke:workflow
```

## 4. Expected Cleanup Procedure

After executing manual or automated testing cycles on local environments:
1. Reset local database state: `npx supabase db reset --local --no-seed --yes`
2. Stop background containers: `npx supabase stop`
3. Ensure no local secrets, `.env` files, or temporary artifacts are tracked by git (`git status --short`).
