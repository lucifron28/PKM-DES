param(
  [string]$ClusterName = 'client-requirements-pg-6695beff8db547eda2e27106a4274be5',
  [string]$Database = 'client_req_p3_98f1d9',
  [string]$LogSuffix = 'p3-final',
  [string]$PgBin = 'C:\Program Files\PostgreSQL\18\bin',
  [switch]$IncludeFinance,
  [switch]$ApplyP4,
  [switch]$IncludeMedical
)

$ErrorActionPreference = 'Stop'
$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '../..')).Path
if ($ClusterName -notmatch '^client-requirements-pg-[a-f0-9]+$' -or $Database -notmatch '^client_req_p3_[a-f0-9]+$' -or $LogSuffix -notmatch '^[a-z0-9-]+$') {
  throw 'Only named task clusters, task databases, and plain log suffixes are permitted.'
}
$tmpRoot = (Resolve-Path (Join-Path $repoRoot 'tmp')).Path
$clusterPath = (Resolve-Path (Join-Path $tmpRoot $ClusterName)).Path
if (-not $clusterPath.StartsWith($tmpRoot + [IO.Path]::DirectorySeparatorChar, [StringComparison]::OrdinalIgnoreCase) -or (Get-Content (Join-Path $clusterPath 'PG_VERSION')) -ne '18') {
  throw 'Invalid disposable PostgreSQL target.'
}
if (Test-Path (Join-Path $clusterPath 'postmaster.pid')) { throw 'Task cluster must be stopped before resuming.' }
$expectedHashes = @{
  '20261014120000_registrar_workflows.sql' = '890651D9393ED4A0527A4A468BAE955FEC20040DE8E3BE2EE2EB1E2078D85C20'
  '20261014130000_registrar_schedule_management.sql' = '98F1D93B5FBE498E8134083C626E582004E5B9A44E86E04A253D30859E7E9344'
}
if ($IncludeFinance -or $ApplyP4) {
  $expectedHashes['20261014140000_accounting_finance.sql'] = 'CA3CBBFEAE816A83153D3DC6D1464655AF33A03982CBC9E1DBEF142FCC510E9D'
}
if ($IncludeMedical) {
  $expectedHashes['20261014150000_medical_supporting_documents.sql'] = '4E19F85986CC3CB71E3A0144254E7182C1248215C04EF410526A15A09D4CE03A'
}
foreach ($name in $expectedHashes.Keys) {
  $actual = (Get-FileHash (Join-Path $repoRoot "supabase/migrations/$name")).Hash
  if ($actual -ne $expectedHashes[$name]) { throw "Database snapshot differs from current $name. Apply the new snapshot to a task database before retesting." }
  Write-Output "$name SHA256=$actual"
}
$listener = [Net.Sockets.TcpListener]::new([Net.IPAddress]::Loopback, 0)
$listener.Start()
$port = $listener.LocalEndpoint.Port
$listener.Stop()
$logRoot = Join-Path $repoRoot 'artifacts/client-requirements/database'
$oldPath = $env:PATH
$oldUrl = $env:PKM_LOCAL_SUPABASE_TEST_DB_URL
$oldOptions = $env:NODE_OPTIONS
$env:PATH = "$PgBin;$oldPath"
$failures = 0
Push-Location $repoRoot
try {
  & "$PgBin/pg_ctl.exe" -D $clusterPath -o "-h 127.0.0.1 -p $port" -l (Join-Path $logRoot 'postgres-pg18-debug-cluster.log') -w start
  if ($LASTEXITCODE -ne 0) { throw 'PostgreSQL startup failed.' }
  try {
    $env:PKM_LOCAL_SUPABASE_TEST_DB_URL = "postgresql://postgres@127.0.0.1:$port/$Database"
    if ($ApplyP4) {
      $p4Present = & "$PgBin/psql.exe" $env:PKM_LOCAL_SUPABASE_TEST_DB_URL -X -At -c "select count(*) from information_schema.columns where table_schema='public' and table_name='enrollments' and column_name='financial_document_version';"
      if ($p4Present -ne '0') { throw 'P4 already present. Rerun with IncludeFinance only.' }
      & "$PgBin/psql.exe" $env:PKM_LOCAL_SUPABASE_TEST_DB_URL -X -1 -v ON_ERROR_STOP=1 -f supabase/migrations/20261014140000_accounting_finance.sql *> (Join-Path $logRoot "p4-migration-$LogSuffix.log")
      if ($LASTEXITCODE -ne 0) { throw 'Captured P4 migration failed. See preserved log.' }
    }
    & "$PgBin/psql.exe" $env:PKM_LOCAL_SUPABASE_TEST_DB_URL -X -At -c 'select version(),current_database(),datcollate from pg_database where datname=current_database();'
    $checks = @(
      @{ Name = 'health-applicability-sync'; Runner = 'node'; Args = @('--test', 'tests/integration/health-applicability-sync.test.mjs') },
      @{ Name = 'schedule-fingerprint'; Runner = './node_modules/.bin/tsx.cmd'; Args = @('--test', 'tests/integration/registrar-schedule-fingerprint.test.ts') },
      @{ Name = 'direct-update'; Runner = 'node'; Args = @('--test', 'tests/integration/registrar-direct-update.test.mjs') },
      @{ Name = 'irregular-legacy-removal'; Runner = 'node'; Args = @('--test', 'tests/integration/irregular-legacy-removal.test.mjs') },
      @{ Name = 'workflow-sql'; Runner = "$PgBin/psql.exe"; Args = @($env:PKM_LOCAL_SUPABASE_TEST_DB_URL, '-X', '-v', 'ON_ERROR_STOP=1', '-f', 'scripts/integration/verify-local-supabase-workflows.sql') }
    )
    if ($IncludeFinance) {
      $checks += @{ Name = 'accounting-finance'; Runner = './node_modules/.bin/tsx.cmd'; Args = @('--test', 'tests/integration/accounting-finance.test.ts') }
    }
    if ($IncludeMedical) {
      $checks += @{ Name = 'medical-documents'; Runner = './node_modules/.bin/tsx.cmd'; Args = @('--test', 'tests/integration/medical-documents.test.ts') }
      $checks += @{ Name = 'demo-reset-storage-contract'; Runner = './node_modules/.bin/tsx.cmd'; Args = @('--test', 'tests/integration/demo-reset-storage-contract.test.ts') }
    }
    foreach ($check in $checks) {
      $arguments = $check.Args
      & $check.Runner @arguments *> (Join-Path $logRoot "$($check.Name)-$LogSuffix.log")
      Write-Output "$($check.Name) EXIT=$LASTEXITCODE"
      if ($LASTEXITCODE -ne 0) { $failures++ }
    }
    $env:NODE_OPTIONS = '--conditions=react-server'
    & ./node_modules/.bin/tsx.cmd --test lib/signatures/service.test.ts *> (Join-Path $logRoot "signature-service-$LogSuffix.log")
    Write-Output "signature-service EXIT=$LASTEXITCODE"
    if ($LASTEXITCODE -ne 0) { $failures++ }
  } finally {
    & "$PgBin/pg_ctl.exe" -D $clusterPath -m fast -w stop
    Write-Output "STOP_EXIT=$LASTEXITCODE"
  }
} finally {
  $env:PATH = $oldPath
  $env:PKM_LOCAL_SUPABASE_TEST_DB_URL = $oldUrl
  $env:NODE_OPTIONS = $oldOptions
  Pop-Location
  Write-Output "Preserved $clusterPath, database $Database"
}
if ($failures) { throw "$failures verification checks failed. See logs ending in $LogSuffix.log." }
