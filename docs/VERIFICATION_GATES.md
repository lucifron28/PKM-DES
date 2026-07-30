# Verification Gates and Testing Procedures

This document details the functional quality assurance gates, testing layers, and verification procedures for PKM-DES.

## 1. Non-Secret Continuous Integration (GitHub Actions)

The repository workflow (`.github/workflows/ci.yml`) runs automatically on pull requests and pushes to `main`. It uses Node.js 20 and requires no live credentials or secrets.

### Automated Checks Run by CI:
- **Dependency installation**: `npm ci`
- **TypeScript type checking**: `npm run typecheck` (`tsc --noEmit`)
- **ESLint validation**: `npm run lint` (`eslint .`)
- **Unit & Domain test suites**:
  - `npm run test:smoke-env`
  - `npm run test:account-claim`
  - `npm run test:admin-enrollment-review`
  - `npx tsx --test lib/account-claim/*.test.ts`
  - `npx tsx --test lib/account-setup/*.test.ts`
  - `npx tsx --test lib/admin-student-records/*.test.ts`
  - `npx tsx --test lib/course-offerings/*.test.ts`
  - `npx tsx --test lib/email/*.test.ts`
  - `npx tsx --test lib/enrollment/*.test.ts`
  - `npx tsx --test lib/registration-form/*.test.ts`
  - `npx tsx --test lib/requirements/*.test.ts`
  - `npx tsx --test lib/auth/*.test.ts`
  - `npx tsx --test components/ui/*.test.ts`
- **Production Next.js Build**: `npm run build`

## 2. Local Supabase Database Integration Testing

Database migrations, RLS policies, atomic RPCs (`submit_standard_student_enrollment`, `review_pending_enrollment`, `update_official_student_record_and_sync`, `reserve_student_setup_email_delivery`, `release_student_setup_email_delivery`), and unique indexes are validated against a disposable local Supabase instance.

### Prerequisites:
- Docker Desktop running locally.
- Supabase CLI installed.

### Commands:
```bash
# Start local Supabase containers
npx supabase start

# Reset local database and apply all migrations
npx supabase db reset --local --no-seed --yes

# Execute database workflow and SQL integration scripts
npx tsx --test lib/enrollment/*.test.ts
npx tsx --test lib/admin-student-records/*.test.ts

# Stop local Supabase containers when finished
npx supabase stop
```

## 3. Playwright End-to-End Browser Testing

Browser scenarios validate user-facing flows using fictional demonstration credentials against a local development server or disposable local Supabase deployment.

### Fictional Data Constraints:
- Use only fictional example identities (`example.com` domain, test Student IDs).
- Do not configure or send live emails during browser tests.
- Do not run against institutional or production databases.

### Commands:
```bash
# Execute public smoke tests
npm run test:smoke:public

# Execute full demo workflow smoke tests
npm run test:smoke:workflow
```

## 4. Expected Cleanup Procedure

After executing manual or automated testing cycles on local environments:
1. Reset local database state: `npx supabase db reset --local --no-seed --yes`
2. Stop background containers: `npx supabase stop`
3. Ensure no local secrets or `.env` files are tracked by git (`git status --short`).
