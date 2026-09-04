# Technical documentation

This directory documents the current repository implementation.

## Documents

- [System architecture](architecture/ARCHITECTURE.md) - runtime boundaries, access model, enrollment flow, signatures, and printing
- [Supabase operations](dev/SUPABASE.md) - environment variables, local stack, migrations, RLS, Storage, and hosted deployment checks
- [Testing and verification](dev/TESTING.md) - CI commands, application tests, local Supabase checks, and workflow smoke tests

## Source of truth

When this documentation and the implementation disagree, verify the behavior in `app/`, `components/`, `lib/`, `supabase/migrations/`, `package.json`, and `.github/workflows/ci.yml`. Update the documentation with the same change when the repository behavior is intentionally changed.
