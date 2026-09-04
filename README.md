# PKM-DES

PKM-DES is a Next.js application for student enrollment, clearance review, electronic signatures, and registration-form printing. The application uses Supabase Auth, PostgreSQL, Row Level Security (RLS), and private Storage. Hosted deployments use Supabase as the database provider.

## Repository map

- `app/` - App Router pages, route handlers, and server actions
- `components/` - shared UI, clearance, health-record, and print components
- `lib/` - authentication, enrollment, requirements, signatures, and data-access code
- `supabase/migrations/` - forward database migrations
- `supabase/seed.sql` - local database seed data
- `scripts/integration/` - local Supabase verification scripts
- `tests/` - browser and application test support
- `docs/` - repository technical documentation

Start with [the technical documentation index](docs/README.md).

## Prerequisites

- Node.js 20, matching the CI workflow
- npm
- Docker Desktop and the Supabase CLI for local database work

## Local setup

1. Copy `.env.example` to `.env.local`.
2. Set the Supabase URL and keys for the environment you are using. Keep `SUPABASE_SERVICE_ROLE_KEY` server-side.
3. Set `DATABASE_PROVIDER=supabase`.
4. Set `APP_BASE_URL` to the origin where the application runs.
5. Install dependencies and start Next.js:

   ```powershell
   npm ci
   npm run dev
   ```

To run the local Supabase stack, use the commands in [Supabase operations](docs/dev/SUPABASE.md).

## Common commands

```powershell
npm run dev
npm run typecheck
npm run lint
npm run build
npm run check:production-env
```

The build runs the Vercel environment check when it runs on Vercel. See [Testing and verification](docs/dev/TESTING.md) for the test suites and local database checks.

## Database changes

Create forward-only migrations under `supabase/migrations/` and apply them through the Supabase project workflow. Do not use a local database reset command against a hosted project. See [Supabase operations](docs/dev/SUPABASE.md) for local and hosted database procedures.

## Data handling

Student and health-record data is protected by authenticated access checks and database RLS. Do not place service-role credentials in browser-exposed variables, and do not use real student or health data for development or verification.
