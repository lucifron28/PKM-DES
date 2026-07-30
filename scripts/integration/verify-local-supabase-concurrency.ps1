param(
  [string]$ContainerName = "supabase_db_PKM-DES"
)

$ErrorActionPreference = "Stop"

function Invoke-LocalSql {
  param([string]$Sql)

  $output = $Sql | & docker exec -i $ContainerName psql -U postgres -d postgres -qAt -v ON_ERROR_STOP=1
  if ($LASTEXITCODE -ne 0) {
    throw "Local Supabase SQL command failed."
  }

  return @($output | Where-Object { $_ -and $_.Trim() })
}

function Invoke-ParallelLocalSql {
  param([string[]]$Statements)

  $jobs = foreach ($statement in $Statements) {
    Start-Job -ScriptBlock {
      param($Sql, $DatabaseContainer)
      $Sql | & docker exec -i $DatabaseContainer psql -U postgres -d postgres -qAt -v ON_ERROR_STOP=1
      if ($LASTEXITCODE -ne 0) {
        throw "Concurrent local Supabase SQL command failed."
      }
    } -ArgumentList $statement, $ContainerName
  }

  try {
    $results = @($jobs | Wait-Job | Receive-Job)
    return @($results | Where-Object { $_ -and $_.Trim() })
  } finally {
    $jobs | Remove-Job -Force -ErrorAction SilentlyContinue
  }
}

$adminId = "00000000-0000-4000-8000-000000000010"
$studentId = "00000000-0000-4000-8000-000000000020"
$resendId = "00000000-0000-4000-8000-000000000030"
$programId = $null
$studentRecordId = "20000000-0000-4000-8000-000000000010"
$enrollmentId = "40000000-0000-4000-8000-000000000010"

try {
  $programLookup = Invoke-LocalSql @"
insert into public.programs (id, name, code)
values ('10000000-0000-4000-8000-000000000010', 'Bachelor of Science in Accounting Information System', 'BSAIS')
on conflict (code) do nothing;
select id from public.programs where code = 'BSAIS' limit 1;
"@
  $programId = ($programLookup | Select-Object -Last 1).ToString().Trim()
  if (-not $programId) {
    throw "No canonical BSAIS program was available for the concurrency fixture."
  }

  Invoke-LocalSql @"
insert into auth.users (id, aud, role, email, encrypted_password, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values
  ('$adminId', 'authenticated', 'authenticated', 'concurrent.registrar@example.test', 'not-used', '{}'::jsonb, '{}'::jsonb, now(), now()),
  ('$studentId', 'authenticated', 'authenticated', 'concurrent.student@example.test', 'not-used', '{}'::jsonb, '{}'::jsonb, now(), now()),
  ('$resendId', 'authenticated', 'authenticated', 'concurrent.resend@example.test', 'not-used', '{}'::jsonb, '{}'::jsonb, now(), now());

insert into public.profiles (id, role, first_name, last_name, email, account_status)
values
  ('$adminId', 'admin', 'Concurrent', 'Registrar', 'concurrent.registrar@example.test', 'ACTIVE'),
  ('$studentId', 'student', 'Concurrent', 'Student', 'concurrent.student@example.test', 'ACTIVE'),
  ('$resendId', 'student', 'Concurrent', 'Resend', 'concurrent.resend@example.test', 'SETUP');

insert into public.students (id, profile_id, student_id_number, program_id, year_level, student_type, enrollment_status)
values ('$studentRecordId', '$studentId', '26-00010', '$programId', '1st Year', 'Incoming 1st Year Student', 'NOT ENROLLED');

insert into public.official_student_records (
  student_id_number, first_name, last_name, email, program_id, year_level, student_type, gender_sex, enrollment_status
)
values ('26-00010', 'Concurrent', 'Student', 'concurrent.student@example.test', '$programId', '1st Year', 'Incoming 1st Year Student', 'Female', 'NOT ENROLLED');

insert into public.enrollments (id, student_id, program_id, year_level, academic_year, semester, status)
values ('$enrollmentId', '$studentRecordId', '$programId', '1st Year', '2026-2027', '1st Semester', 'PENDING');
"@ | Out-Null

  Invoke-LocalSql @"
begin;
set local role authenticated;
select set_config('request.jwt.claim.sub', '$adminId', true);
select outcome
from public.update_enrollment_requirement_status(
  '$enrollmentId', 'HEALTH_RECORD_UPDATE', 'VERIFIED', 'Paper form checked'
);
commit;
"@ | Out-Null

  $reviewSql = @"
begin;
set local role authenticated;
select set_config('request.jwt.claim.sub', '$adminId', true) as jwt \gset
select outcome from public.review_pending_enrollment('$enrollmentId', 'APPROVED', null);
commit;
"@
  $reviewOutcomes = @(Invoke-ParallelLocalSql @($reviewSql, $reviewSql) | Sort-Object)
  if (($reviewOutcomes -join ',') -ne 'already_reviewed,approved') {
    throw "Concurrent enrollment review did not return one approved and one already_reviewed outcome: $($reviewOutcomes -join ',')."
  }

  Invoke-LocalSql @"
do `$verify`$
begin
  if (select status from public.enrollments where id = '$enrollmentId') <> 'APPROVED' then
    raise exception 'concurrent review did not preserve approved decision';
  end if;
  if (select count(*) from public.audit_logs where target_id = '$enrollmentId' and action = 'APPROVE_ENROLLMENT') <> 1 then
    raise exception 'concurrent review wrote an unexpected audit count';
  end if;
end;
`$verify`$;
"@ | Out-Null

  $resendSql = @"
begin;
set local role service_role;
select outcome from public.reserve_student_setup_email_delivery('$resendId');
commit;
"@
  $resendOutcomes = @(Invoke-ParallelLocalSql @($resendSql, $resendSql) | Sort-Object)
  if (($resendOutcomes -join ',') -ne 'cooldown,reserved') {
    throw "Concurrent setup-email reservation did not return one reserved and one cooldown outcome: $($resendOutcomes -join ',')."
  }

  Write-Host "Local Supabase concurrency verification passed."
} finally {
  Start-Sleep -Seconds 1
  & npx.cmd supabase db reset --local --no-seed --yes
  if ($LASTEXITCODE -ne 0) {
    throw "Local Supabase cleanup reset failed."
  }
}
