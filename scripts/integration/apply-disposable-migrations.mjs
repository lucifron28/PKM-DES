import { execFileSync } from "node:child_process";
import { readdirSync } from "node:fs";
import { join } from "node:path";

const DB_URL = process.env.DISPOSABLE_DB_URL || "postgresql://postgres@127.0.0.1:55433/postgres";

function runSql(sql) {
  execFileSync("psql", [DB_URL, "-v", "ON_ERROR_STOP=1", "-c", sql], {
    encoding: "utf8",
    stdio: ["pipe", "pipe", "pipe"]
  });
}

function runSqlFile(filePath) {
  execFileSync("psql", [DB_URL, "-v", "ON_ERROR_STOP=1", "-f", filePath], {
    encoding: "utf8",
    stdio: ["pipe", "pipe", "pipe"]
  });
}
console.log("Setting up Supabase auth stub and roles on disposable database...");
runSql(`
  do $$
  begin
    if not exists (select 1 from pg_roles where rolname = 'anon') then
      create role anon nologin;
    end if;
    if not exists (select 1 from pg_roles where rolname = 'authenticated') then
      create role authenticated nologin;
    end if;
    if not exists (select 1 from pg_roles where rolname = 'service_role') then
      create role service_role nologin;
    end if;
  end;
  $$;
  create schema if not exists extensions;
  create extension if not exists pgcrypto schema extensions;
  grant usage on schema extensions to postgres, anon, authenticated, service_role;
  create schema if not exists auth;
  create table if not exists auth.users (
    id uuid primary key default gen_random_uuid(),
    aud text default 'authenticated',
    role text default 'authenticated',
    email text unique,
    encrypted_password text,
    email_confirmed_at timestamptz default now(),
    raw_app_meta_data jsonb default '{}'::jsonb,
    raw_user_meta_data jsonb default '{}'::jsonb,
    is_super_admin boolean default false,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
  );
  create or replace function auth.uid()
  returns uuid
  language sql
  stable
  as $$
    select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
  $$;
  create or replace function auth.role()
  returns text
  language sql
  stable
  as $$
    select coalesce(nullif(current_setting('request.jwt.claim.role', true), ''), 'authenticated');
  $$;
  create or replace function auth.email()
  returns text
  language sql
  stable
  as $$
    select nullif(current_setting('request.jwt.claim.email', true), '');
  $$;
  create schema if not exists private;
  create schema if not exists storage;
  create table if not exists storage.buckets (
    id text primary key,
    name text not null,
    public boolean default false,
    file_size_limit bigint,
    allowed_mime_types text[],
    created_at timestamptz default now(),
    updated_at timestamptz default now()
  );
  create table if not exists storage.objects (
    id uuid primary key default gen_random_uuid(),
    bucket_id text references storage.buckets(id),
    name text,
    owner uuid,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
  );
  alter table storage.objects enable row level security;
  alter table storage.buckets enable row level security;
  grant all on schema storage to postgres, authenticated, service_role;
  grant all on all tables in schema storage to postgres, authenticated, service_role;
`);

const migrationsDir = join(process.cwd(), "supabase", "migrations");
const migrationFiles = readdirSync(migrationsDir)
  .filter((f) => f.endsWith(".sql"))
  .sort();

console.log(`Applying ${migrationFiles.length} migrations in order...`);
for (const file of migrationFiles) {
  process.stdout.write(`  Applying ${file}... `);
  try {
    runSqlFile(join(migrationsDir, file));
    console.log("OK");
  } catch (err) {
    console.error(`FAILED: ${file}\n`, err.stderr || err.message);
    process.exit(1);
  }
}

console.log("All migrations successfully applied!");
