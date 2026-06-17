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
- Seeds one program: Accounting Information System / AIS.
- Reads the source-grounded AIS subjects from `lib/constants/subjects.ts`.
- Verifies the expected local totals:
  - Programs: 1
  - Subjects: 56
  - Total units: 167

## Current Boundary

This branch adds the local SQLite database foundation and provider guard.

Current app routes still use Supabase clients. Moving individual app flows to a database adapter should happen in later small branches, one workflow at a time.

Recommended next adapter slices:

1. Subject/program reads
2. Official student record reads/inserts
3. Enrollment submission reads/writes
4. Admin enrollment approval/rejection

Do not use SQLite as a deployed fallback on Vercel.
