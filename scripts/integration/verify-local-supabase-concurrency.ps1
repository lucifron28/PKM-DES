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

$runSuffix = [Guid]::NewGuid().ToString("N")
$adminId = [Guid]::NewGuid().ToString()
$studentId = [Guid]::NewGuid().ToString()
$submitStudentAId = [Guid]::NewGuid().ToString()
$submitStudentBId = [Guid]::NewGuid().ToString()
$submitStudentCId = [Guid]::NewGuid().ToString()
$deliveryId = [Guid]::NewGuid().ToString()
$candidateProgramId = [Guid]::NewGuid().ToString()
$programId = $null
$studentRecordId = [Guid]::NewGuid().ToString()
$enrollmentId = [Guid]::NewGuid().ToString()
$submitStudentARecordId = [Guid]::NewGuid().ToString()
$submitStudentBRecordId = [Guid]::NewGuid().ToString()
$submitStudentCRecordId = [Guid]::NewGuid().ToString()
$adminEmail = "concurrent.$runSuffix.registrar@example.test"
$studentEmail = "concurrent.$runSuffix.student@example.test"
$submitStudentAEmail = "concurrent.$runSuffix.submit-a@example.test"
$submitStudentBEmail = "concurrent.$runSuffix.submit-b@example.test"
$submitStudentCEmail = "concurrent.$runSuffix.submit-c@example.test"
$deliveryEmail = "concurrent.$runSuffix.delivery@example.test"
$studentNumber = "26-$runSuffix-10"
$submitStudentANumber = "26-$runSuffix-11"
$submitStudentBNumber = "26-$runSuffix-12"
$submitStudentCNumber = "26-$runSuffix-13"

try {
  $programLookup = Invoke-LocalSql @"
insert into public.programs (id, name, code)
values ('$candidateProgramId', 'Bachelor of Science in Accounting Information System', 'BSAIS')
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
  ('$adminId', 'authenticated', 'authenticated', '$adminEmail', 'not-used', '{}'::jsonb, '{}'::jsonb, now(), now()),
  ('$studentId', 'authenticated', 'authenticated', '$studentEmail', 'not-used', '{}'::jsonb, '{}'::jsonb, now(), now()),
  ('$submitStudentAId', 'authenticated', 'authenticated', '$submitStudentAEmail', 'not-used', '{}'::jsonb, '{}'::jsonb, now(), now()),
  ('$submitStudentBId', 'authenticated', 'authenticated', '$submitStudentBEmail', 'not-used', '{}'::jsonb, '{}'::jsonb, now(), now()),
  ('$submitStudentCId', 'authenticated', 'authenticated', '$submitStudentCEmail', 'not-used', '{}'::jsonb, '{}'::jsonb, now(), now()),
  ('$deliveryId', 'authenticated', 'authenticated', '$deliveryEmail', 'not-used', '{}'::jsonb, '{}'::jsonb, now(), now());

insert into public.profiles (id, role, first_name, last_name, email, account_status)
values
  ('$adminId', 'admin', 'Concurrent', 'Registrar', '$adminEmail', 'ACTIVE'),
  ('$studentId', 'student', 'Concurrent', 'Student', '$studentEmail', 'ACTIVE'),
  ('$submitStudentAId', 'student', 'Concurrent', 'Submit A', '$submitStudentAEmail', 'ACTIVE'),
  ('$submitStudentBId', 'student', 'Concurrent', 'Submit B', '$submitStudentBEmail', 'ACTIVE'),
  ('$submitStudentCId', 'student', 'Concurrent', 'Submit C', '$submitStudentCEmail', 'ACTIVE'),
  ('$deliveryId', 'student', 'Concurrent', 'Delivery', '$deliveryEmail', 'SETUP');

insert into public.students (id, profile_id, student_id_number, program_id, year_level, student_type, enrollment_status)
values
  ('$studentRecordId', '$studentId', '$studentNumber', '$programId', '1st Year', 'Incoming 1st Year Student', 'NOT ENROLLED'),
  ('$submitStudentARecordId', '$submitStudentAId', '$submitStudentANumber', '$programId', '1st Year', 'Incoming 1st Year Student', 'NOT ENROLLED'),
  ('$submitStudentBRecordId', '$submitStudentBId', '$submitStudentBNumber', '$programId', '1st Year', 'Continuing Student', 'NOT ENROLLED'),
  ('$submitStudentCRecordId', '$submitStudentCId', '$submitStudentCNumber', '$programId', '1st Year', 'Regular Student', 'NOT ENROLLED');

insert into public.official_student_records (
  student_id_number, first_name, last_name, email, program_id, year_level, student_type, gender_sex, enrollment_status
)
values ('$studentNumber', 'Concurrent', 'Student', '$studentEmail', '$programId', '1st Year', 'Incoming 1st Year Student', 'Female', 'NOT ENROLLED');

insert into public.enrollments (id, student_id, program_id, year_level, academic_year, semester, status)
values ('$enrollmentId', '$studentRecordId', '$programId', '1st Year', '2025-2026', '2nd Semester', 'PENDING');

insert into public.enrollment_subjects (
  enrollment_id, subject_id, course_offering_id, course_code, course_description, units
)
select
  '$enrollmentId',
  null,
  co.id,
  co.course_code,
  co.course_description,
  co.units
from public.course_offerings co
where co.program_id = '$programId'
  and co.academic_year = '2025-2026'
  and co.semester = '2nd Semester'
  and co.year_level = '1st Year'
order by co.id
limit 1;

do `$verify`$
begin
  if not exists (select 1 from public.enrollment_subjects where enrollment_id = '$enrollmentId') then
    raise exception 'Concurrency fixture could not attach a valid course offering snapshot.';
  end if;
end;
`$verify`$;
"@ | Out-Null

  $distinctSubmissionSql = @"
begin;
set local role authenticated;
select set_config('request.jwt.claim.sub', '$submitStudentAId', true) as jwt \gset
select outcome from public.submit_standard_student_enrollment('2025-2026', '2nd Semester');
commit;
"@
  $distinctSubmissionSqlB = $distinctSubmissionSql.Replace($submitStudentAId, $submitStudentBId)
  $distinctOutcomes = @(Invoke-ParallelLocalSql @($distinctSubmissionSql, $distinctSubmissionSqlB) | Sort-Object)
  if (($distinctOutcomes -join ',') -ne 'submitted,submitted') {
    throw "Concurrent submissions by different students did not both succeed: $($distinctOutcomes -join ',')."
  }

  $sameStudentSql = @"
begin;
set local role authenticated;
select set_config('request.jwt.claim.sub', '$submitStudentCId', true) as jwt \gset
select outcome from public.submit_standard_student_enrollment('2025-2026', '2nd Semester');
commit;
"@
  $sameStudentOutcomes = @(Invoke-ParallelLocalSql @($sameStudentSql, $sameStudentSql) | Sort-Object)
  if (($sameStudentOutcomes -join ',') -ne 'duplicate,submitted') {
    throw "Concurrent submissions by the same student did not return one submitted and one duplicate outcome: $($sameStudentOutcomes -join ',')."
  }

  $lockSql = @"
begin;
select pg_advisory_xact_lock_shared(pg_catalog.hashtextextended('pkm.standard-load-configuration', 0::bigint));
select 'lock-acquired';
select pg_sleep(2);
commit;
"@
  $lockJob = Start-Job -ScriptBlock {
    param($Sql, $DatabaseContainer)
    $Sql | & docker exec -i $DatabaseContainer psql -U postgres -d postgres -qAt -v ON_ERROR_STOP=1
    if ($LASTEXITCODE -ne 0) {
      throw "Shared configuration-lock command failed."
    }
  } -ArgumentList $lockSql, $ContainerName

  try {
    $lockAcquired = $false
    for ($attempt = 0; $attempt -lt 30; $attempt++) {
      $lockOutput = @(Receive-Job $lockJob -Keep)
      if ($lockOutput -contains 'lock-acquired') {
        $lockAcquired = $true
        break
      }
      Start-Sleep -Milliseconds 100
    }
    if (-not $lockAcquired) {
      throw "Shared configuration lock was not acquired before the exclusive-write check."
    }

    $lockStopwatch = [System.Diagnostics.Stopwatch]::StartNew()
    Invoke-LocalSql @"
begin;
set local role service_role;
update public.standard_load_sets
set updated_at = updated_at
where program_id = '$programId'
  and academic_year = '2025-2026'
  and semester = '2nd Semester'
  and year_level = '1st Year';
rollback;
"@ | Out-Null
    $lockStopwatch.Stop()

    if ($lockStopwatch.ElapsedMilliseconds -lt 1500) {
      throw "Exclusive configuration write did not wait for the shared submission lock."
    }
  } finally {
    Wait-Job $lockJob -Timeout 10 | Out-Null
    Remove-Job $lockJob -Force -ErrorAction SilentlyContinue
  }

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
select outcome from public.registrar_review_pending_enrollment('$enrollmentId', 'APPROVED', null);
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
  if (select count(*) from public.enrollment_decision_notifications
    where enrollment_id = '$enrollmentId' and decision = 'APPROVED'
  ) <> 1 then
    raise exception 'concurrent review wrote an unexpected notification count';
  end if;
end;
`$verify`$;
"@ | Out-Null

  $deliverySql = @"
begin;
set local role service_role;
select outcome from public.reserve_student_setup_email_delivery('$deliveryId');
commit;
"@
  $deliveryOutcomes = @(Invoke-ParallelLocalSql @($deliverySql, $deliverySql) | Sort-Object)
  if (($deliveryOutcomes -join ',') -ne 'cooldown,reserved') {
    throw "Concurrent setup-email reservation did not return one reserved and one cooldown outcome: $($deliveryOutcomes -join ',')."
  }

  Write-Host "Local Supabase concurrency verification passed."
} finally {
  $studentIds = @($studentId, $submitStudentAId, $submitStudentBId, $submitStudentCId)
  $studentNumbers = @($studentNumber, $submitStudentANumber, $submitStudentBNumber, $submitStudentCNumber)
  $profileIds = @($adminId) + $studentIds + @($deliveryId)
  $studentIdSql = ($studentIds | ForEach-Object { "'$_'" }) -join ","
  $studentNumberSql = ($studentNumbers | ForEach-Object { "'$_'" }) -join ","
  $profileIdSql = ($profileIds | ForEach-Object { "'$_'" }) -join ","
  $cleanupSql = @(
    "begin;"
    "select set_config('pkm.demo_reset', 'true', true);"
    "delete from public.enrollment_decision_notifications where enrollment_id = '$enrollmentId';"
    "delete from public.enrollment_clearances where enrollment_id in (select id from public.enrollments where student_id in ($studentIdSql));"
    "delete from public.enrollment_signatures where enrollment_id in (select id from public.enrollments where student_id in ($studentIdSql));"
    "delete from public.enrollment_subjects where enrollment_id in (select id from public.enrollments where student_id in ($studentIdSql));"
    "delete from public.enrollments where student_id in ($studentIdSql);"
    "delete from public.student_requirements where student_id in ($studentIdSql);"
    "delete from public.audit_logs where actor_profile_id in ($profileIdSql) or target_id in ($profileIdSql, $studentIdSql, '$enrollmentId');"
    "delete from public.students where id in ($studentIdSql);"
    "delete from public.official_student_records where student_id_number in ($studentNumberSql);"
    "delete from public.profiles where id in ($profileIdSql);"
    "delete from auth.users where id in ($profileIdSql);"
    "delete from public.programs where id = '$candidateProgramId' and not exists (select 1 from public.students where program_id = '$candidateProgramId');"
    "commit;"
  ) -join "`n"
  try {
    Invoke-LocalSql $cleanupSql | Out-Null
  } catch {
    Write-Warning "Exact concurrency-fixture cleanup failed. No database reset was attempted. Inspect only fixture suffix $runSuffix before cleanup."
  }
}
