param(
  [string]$PgBin = "$env:ProgramFiles\PostgreSQL\18\bin",
  [string]$ThroughMigration,
  [string]$IntegrationTestName,
  [switch]$SkipWorkflowSql,
  [string]$ReuseClusterName,
  [string]$DatabaseName = 'client_requirements'
)

$ErrorActionPreference = "Stop"

function Invoke-CheckedNative {
  param(
    [string]$Executable,
    [string[]]$Arguments,
    [string]$Description
  )

  & $Executable @Arguments
  if ($LASTEXITCODE -ne 0) {
    throw "$Description failed with exit code $LASTEXITCODE."
  }
}

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "../..")).Path
$clusterPath = Join-Path $repoRoot "tmp/client-requirements-pg-$([Guid]::NewGuid().ToString('N'))"
if ($ReuseClusterName) {
  if ($ReuseClusterName -notmatch '^client-requirements-pg-[a-f0-9]+$' -or $DatabaseName -notmatch '^client_req_p3_[a-f0-9]+$') { throw 'Invalid task cluster or database name.' }
  $taskTmpRoot = (Resolve-Path (Join-Path $repoRoot 'tmp')).Path
  $clusterPath = (Resolve-Path (Join-Path $taskTmpRoot $ReuseClusterName)).Path
  if (-not $clusterPath.StartsWith($taskTmpRoot + [IO.Path]::DirectorySeparatorChar, [StringComparison]::OrdinalIgnoreCase) -or (Get-Content (Join-Path $clusterPath 'PG_VERSION')) -ne '18') { throw 'Invalid existing disposable cluster.' }
  if (Test-Path (Join-Path $clusterPath 'postmaster.pid')) { throw 'Existing task cluster must be stopped.' }
}
$logPath = Join-Path $repoRoot 'artifacts/client-requirements/database/postgres-bootstrap.log'
$toolNames = @("initdb.exe", "pg_ctl.exe", "createdb.exe", "psql.exe")
foreach ($toolName in $toolNames) {
  if (-not (Test-Path -LiteralPath (Join-Path $PgBin $toolName))) {
    throw "PostgreSQL tool unavailable: $(Join-Path $PgBin $toolName)"
  }
}
if (-not $ReuseClusterName -and (Test-Path -LiteralPath $clusterPath)) {
  throw "Refusing to reuse an existing cluster path: $clusterPath"
}

$portListener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Loopback, 0)
$portListener.Start()
$port = $portListener.LocalEndpoint.Port
$portListener.Stop()

$previousPath = $env:PATH
$previousEnvironment = @{}
foreach ($name in @("PKM_LOCAL_SUPABASE_TEST_DB_URL", "PGHOST", "PGPORT", "PGUSER", "PGDATABASE")) {
  $previousEnvironment[$name] = [Environment]::GetEnvironmentVariable($name, "Process")
}
$serverStarted = $false
if (-not $ReuseClusterName) { New-Item -ItemType Directory -Path $clusterPath | Out-Null }

try {
  $env:PATH = "$PgBin;$previousPath"
  $env:PGHOST = "127.0.0.1"
  $env:PGPORT = "$port"
  $env:PGUSER = "postgres"

  if (-not $ReuseClusterName) { Invoke-CheckedNative (Join-Path $PgBin "initdb.exe") @(
    "-D", $clusterPath, "-U", "postgres", "-A", "trust", "--no-instructions", "--encoding=UTF8"
  ) "PostgreSQL cluster initialization" }

  $serverOptions = "-h 127.0.0.1 -p $port -c listen_addresses=127.0.0.1"
  Invoke-CheckedNative (Join-Path $PgBin "pg_ctl.exe") @(
    "-D", $clusterPath, "-o", $serverOptions, "-l", $logPath, "-w", "start"
  ) "PostgreSQL startup"
  $serverStarted = $true

  Invoke-CheckedNative (Join-Path $PgBin "createdb.exe") @(
    "-E", "UTF8", "-T", "template0", $DatabaseName
  ) "Disposable database creation"
  $env:PGDATABASE = $DatabaseName
  $env:PKM_LOCAL_SUPABASE_TEST_DB_URL = "postgresql://postgres@127.0.0.1:$port/$DatabaseName"

  $platformScaffold = @'
do $$ begin
  if not exists(select 1 from pg_roles where rolname='anon') then create role anon nologin; end if;
  if not exists(select 1 from pg_roles where rolname='authenticated') then create role authenticated nologin; end if;
  if not exists(select 1 from pg_roles where rolname='service_role') then create role service_role nologin bypassrls; end if;
end $$;
create schema auth;
create schema storage;
create schema extensions;
create extension pgcrypto with schema extensions;

create table auth.users (
  id uuid primary key,
  aud text,
  role text,
  email text unique,
  encrypted_password text,
  email_confirmed_at timestamptz,
  phone text,
  confirmation_token text,
  recovery_token text,
  email_change_token_new text,
  email_change text,
  raw_app_meta_data jsonb not null default '{}'::jsonb,
  raw_user_meta_data jsonb not null default '{}'::jsonb,
  is_super_admin boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create function auth.uid()
returns uuid
language sql
stable
as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
$$;

create table storage.buckets (
  id text primary key,
  name text not null,
  owner_id text,
  public boolean not null default false,
  file_size_limit bigint,
  allowed_mime_types text[],
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table storage.objects (
  id uuid primary key default gen_random_uuid(),
  bucket_id text references storage.buckets(id),
  name text,
  owner_id text,
  metadata jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
-- Supabase Storage normally supplies these grants and RLS before application migrations.
alter table storage.objects enable row level security;
grant select, insert, update, delete on storage.objects to authenticated;
grant all on storage.objects to service_role;

grant usage on schema public, auth, storage, extensions to anon, authenticated, service_role;
grant execute on function auth.uid() to public;
'@
  $platformScaffold | & (Join-Path $PgBin "psql.exe") @(
    $env:PKM_LOCAL_SUPABASE_TEST_DB_URL, "-X", "-v", "ON_ERROR_STOP=1", "-q"
  )
  if ($LASTEXITCODE -ne 0) {
    throw "Local auth/storage schema scaffold failed with exit code $LASTEXITCODE."
  }

  $migrationPaths = Get-ChildItem -LiteralPath (Join-Path $repoRoot "supabase/migrations") -Filter "*.sql" -File |
    Sort-Object Name
  if (-not $migrationPaths) {
    throw "No Supabase migrations found under $(Join-Path $repoRoot 'supabase/migrations')."
  }
  if ($ThroughMigration) {
    if ($migrationPaths.Name -notcontains $ThroughMigration) {
      throw "Migration cutoff not found: $ThroughMigration"
    }
    $migrationPaths = @($migrationPaths | Where-Object { [StringComparer]::Ordinal.Compare($_.Name, $ThroughMigration) -le 0 })
  }
  foreach ($migration in $migrationPaths) {
    $migrationHash = (Get-FileHash $migration.FullName).Hash
    Write-Host "Applying $($migration.Name) SHA256=$migrationHash"
    Invoke-CheckedNative (Join-Path $PgBin "psql.exe") @(
      $env:PKM_LOCAL_SUPABASE_TEST_DB_URL, "-X", "-q", "-v", "ON_ERROR_STOP=1", "-f", $migration.FullName
    ) "Migration $($migration.Name)"
    if ((Get-FileHash $migration.FullName).Hash -ne $migrationHash) { throw "Migration changed during application: $($migration.Name)" }
  }

  if ($SkipWorkflowSql) {
    Write-Warning "Skipping the shared workflow SQL verification by request."
  } else {
    Invoke-CheckedNative (Join-Path $PgBin "psql.exe") @(
      $env:PKM_LOCAL_SUPABASE_TEST_DB_URL,
      "-X", "-q", "-v", "ON_ERROR_STOP=1", "-f",
      (Join-Path $repoRoot "scripts/integration/verify-local-supabase-workflows.sql")
    ) "Database workflow verification"
  }

  $tsx = Join-Path $repoRoot "node_modules/.bin/tsx.cmd"
  if (-not (Test-Path -LiteralPath $tsx)) {
    throw "Local tsx runner unavailable at $tsx. Install the repository dependencies first."
  }
  $integrationTests = @(Get-ChildItem -LiteralPath (Join-Path $repoRoot "tests/integration") -File |
    Where-Object { $_.Name -match '\.test\.(mjs|ts|tsx)$' } |
    Where-Object { -not $IntegrationTestName -or $_.Name -eq $IntegrationTestName } |
    Sort-Object Name |
    ForEach-Object { $_.FullName })
  if (-not $integrationTests) {
    throw "No integration tests were found under $(Join-Path $repoRoot 'tests/integration')."
  }
  $testArguments = @("--test") + $integrationTests
  Invoke-CheckedNative $tsx $testArguments "Database integration tests"

  Write-Host "Disposable PostgreSQL verification passed on 127.0.0.1:$port."
} finally {
  if ($serverStarted) {
    & (Join-Path $PgBin "pg_ctl.exe") -D $clusterPath -m fast -w stop | Out-Null
    if ($LASTEXITCODE -ne 0) {
      Write-Warning "PostgreSQL stop reported exit code $LASTEXITCODE. Check $logPath."
    }
  }
  $env:PATH = $previousPath
  foreach ($name in $previousEnvironment.Keys) {
    if ($null -eq $previousEnvironment[$name]) {
      Remove-Item "Env:$name" -ErrorAction SilentlyContinue
    } else {
      [Environment]::SetEnvironmentVariable($name, $previousEnvironment[$name], "Process")
    }
  }
  Write-Host "Cluster preserved at $clusterPath"
}
