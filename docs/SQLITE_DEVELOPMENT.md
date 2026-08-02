# SQLite Development Setup

SQLite is supported for local development database setup only.

PKM-DES is planned for Vercel deployment. Vercel should use Supabase as the production database because local SQLite files are not reliable as deployed application storage in serverless environments.

## Environment

Use Supabase for Vercel and production-like environments:

```bash
DATABASE_PROVIDER=supabase
```

Use SQLite only when developing locally:

```bash
DATABASE_PROVIDER=sqlite
```

The app has a deployment guard that throws a clear error if `DATABASE_PROVIDER=sqlite` is used on Vercel.

Production/Vercel readiness can be checked with:

```bash
npm run check:production-env
```

## Initialize Local SQLite

Run:

```bash
npm run db:sqlite:init
```

This creates:

```text
data/sqlite/pkm-des.dev.sqlite
```

The generated SQLite database file is ignored by git.

## Seed Data

The SQLite init script:

- Creates local development tables equivalent to the current MVP schema.
- Seeds a separate local-development catalog of 10 programs.
- Seeds 56 BSAIS curriculum subjects from `lib/constants/subjects.ts`.
- Creates `course_offerings` and `standard_load_sets` tables for parity with Supabase, but does not invent current-term load rows.
- Keeps `enrollment_subjects` compatible with legacy subject-backed rows and course-offering-backed snapshot rows.
- Enforces one enrollment record per student, academic year, and semester.
- A fresh local database has these expected totals:
  - Programs: 10
  - Subjects: 56
  - Total units: 167
- Re-running the initializer preserves compatible local rows, so an existing
  development database may report additional records from earlier tests.

This local seed is independent from the deployed Supabase environment. Refer to [SUPABASE_SETUP.md](./SUPABASE_SETUP.md) for the current Supabase seed definition and deployment guidance.

## Current Boundary

The SQLite init script does not import the ignored client workbook. Historical workbook rows and active standard-load sets must be supplied through an explicit local fixture when a safe test needs them; the script never relabels historical rows as the current term.

Current app routes still use Supabase clients. Moving individual app flows to a database adapter should happen in later small branches, one workflow at a time.

Recommended next adapter slices:

1. Subject/program reads
2. Official student record reads/inserts
3. Enrollment submission reads/writes
4. Admin enrollment approval/rejection

Do not use SQLite as a deployed fallback on Vercel.
