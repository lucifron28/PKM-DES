import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { execFileSync } from "node:child_process";
import test from "node:test";
import { REGISTRATION_POLICY_VERSION } from "../../lib/registration-form/policy";
import { computeEnrollmentDocumentHash } from "../../lib/signatures/fingerprint";

const dbUrl = process.env.PKM_LOCAL_SUPABASE_TEST_DB_URL;
if (!dbUrl) {
  throw new Error("Set PKM_LOCAL_SUPABASE_TEST_DB_URL to an isolated local PostgreSQL database.");
}
const parsedDbUrl = new URL(dbUrl);
if (parsedDbUrl.protocol !== "postgresql:" || parsedDbUrl.hostname !== "127.0.0.1") {
  throw new Error("Integration tests require a local PostgreSQL URL on 127.0.0.1.");
}

function hash(material: string) {
  return createHash("sha256").update(material, "utf8").digest("hex");
}

function compareText(left: string, right: string) {
  return left < right ? -1 : left > right ? 1 : 0;
}

test("multi-subject SQL and TypeScript fingerprints match for student and official signatures without changing blank legacy hashes", () => {
  assert.equal(REGISTRATION_POLICY_VERSION, "pledge-v1");
  const profileId = randomUUID();
  const studentId = randomUUID();
  const enrollmentId = randomUUID();
  const codeSuffix = randomUUID().replace(/-/g, "").slice(0, 8).toUpperCase();
  const subjects = [
    {
      id: randomUUID(), enrollmentSubjectId: randomUUID(),
      course_code: `IT-${codeSuffix} 201`, course_description: "Information Technology", units: 4,
      day: "Tuesday", time: "1:00 PM-3:00 PM", room: "Lab 2",
      inputDay: " Tuesday ", inputTime: " 1:00 PM-3:00 PM ", inputRoom: " Lab 2 "
    },
    {
      id: randomUUID(), enrollmentSubjectId: randomUUID(),
      course_code: `GE-${codeSuffix} 102`, course_description: "General Education", units: 2,
      day: null, time: "10:00 AM", room: null,
      inputDay: "  ", inputTime: " 10:00 AM ", inputRoom: " "
    },
    {
      id: randomUUID(), enrollmentSubjectId: randomUUID(),
      course_code: `ACCT-${codeSuffix} 101`, course_description: "Accounting Systems", units: 3,
      day: "M/W", time: null, room: "Room 101",
      inputDay: " M/W ", inputTime: "  ", inputRoom: " Room 101 "
    }
  ];
  const targetSubject = subjects[2];
  const subjectId = targetSubject.enrollmentSubjectId;
  const subjectCode = targetSubject.course_code;
  const subjectMasterRows = subjects.map((subject) =>
    `('${subject.id}', v_program_id, '${subject.course_code}', '${subject.course_description}', ${subject.units}, '1st Year', '2nd Semester')`
  ).join(",\n");
  const enrollmentSubjectRows = subjects.map((subject) =>
    `('${subject.enrollmentSubjectId}', '${enrollmentId}', '${subject.id}', '${subject.course_code}', '${subject.course_description}', ${subject.units}, null, null, null)`
  ).join(",\n");
  const initialScheduleJson = JSON.stringify(subjects.map((subject) => ({
    id: subject.enrollmentSubjectId,
    units: subject.units,
    day: subject.inputDay,
    time: subject.inputTime,
    room: subject.inputRoom
  })));
  const scheduleJson = (overrides?: { day: string | null; time: string | null; room: string | null }) =>
    JSON.stringify(subjects.map((subject) => ({
      id: subject.enrollmentSubjectId,
      units: subject.units,
      day: subject.enrollmentSubjectId === subjectId && overrides ? overrides.day : subject.day,
      time: subject.enrollmentSubjectId === subjectId && overrides ? overrides.time : subject.time,
      room: subject.enrollmentSubjectId === subjectId && overrides ? overrides.room : subject.room
    })));
  const blankScheduleJson = JSON.stringify(subjects.map((subject) => ({
    id: subject.enrollmentSubjectId, units: subject.units, day: "  ", time: "", room: null
  })));
  const pipeAJson = scheduleJson({ day: "M|T", time: "9", room: null });
  const pipeBJson = scheduleJson({ day: "M", time: "T|9", room: null });
  const newlineAJson = scheduleJson({ day: "M|\nT", time: "9", room: null });
  const newlineBJson = scheduleJson({ day: "M", time: "\nT|9", room: null });
  const invalidDayJson = scheduleJson({ day: "x".repeat(81), time: "9", room: null });
  const invalidRoomJson = scheduleJson({ day: "Monday", time: "9", room: "x".repeat(121) });
  const approvedScheduleJson = scheduleJson();
  const email = `dbverify-${profileId}@example.test`;

  const sql = `
    begin;
    do $fixture$
    declare
      v_program_id uuid;
    begin
      select id into v_program_id from public.programs where code = 'BSAIS' limit 1;
      if v_program_id is null then raise exception 'BSAIS fixture program is unavailable'; end if;

      insert into auth.users (id, aud, role, email, raw_app_meta_data, raw_user_meta_data)
      values ('${profileId}', 'authenticated', 'authenticated', '${email}', '{}'::jsonb, '{}'::jsonb);
      insert into public.profiles (id, role, first_name, last_name, email, account_status)
      values ('${profileId}', 'admin', 'Database', 'Verifier', '${email}', 'ACTIVE');
      insert into public.students (id, profile_id, student_id_number, program_id, year_level, student_type)
      values ('${studentId}', '${profileId}', 'DBVERIFY-${profileId}', v_program_id, '1st Year', 'Old Student');
      insert into public.subjects (id, program_id, course_code, course_description, units, year_level, semester)
      values
      ${subjectMasterRows};
      insert into public.enrollments (
        id, student_id, program_id, year_level, academic_year, semester, registration_pledge_version
      ) values (
        '${enrollmentId}', '${studentId}', v_program_id, '1st Year', '2098-2099', '2nd Semester', null
      );
      insert into public.enrollment_subjects (
        id, enrollment_id, subject_id, course_code, course_description, units, day, time, room
      ) values
      ${enrollmentSubjectRows};
    end;
    $fixture$;

    select 'legacy_blank', coalesce(private.enrollment_document_hash(
      '${enrollmentId}', 'STUDENT', 'STUDENT_ENROLLMENT_SIGNATURE', 'ENROLLMENT_REGISTRATION'
    ), 'null');

    update public.enrollments set registration_pledge_version = 'pledge-v1' where id = '${enrollmentId}';
    select 'pledge_blank', coalesce(private.enrollment_document_hash(
      '${enrollmentId}', 'STUDENT', 'STUDENT_ENROLLMENT_SIGNATURE', 'ENROLLMENT_REGISTRATION'
    ), 'null');
    select 'official_blank', coalesce(private.enrollment_document_hash(
      '${enrollmentId}', 'NURSE', 'HEALTH_CLEARANCE', 'ENROLLMENT_CLEARANCE'
    ), 'null');
    select 'sql_sort', (select datcollate from pg_database where datname = current_database()), string_agg(
      course_code, ',' order by course_code, course_description, units
    ) from public.enrollment_subjects where enrollment_id = '${enrollmentId}';

    set local role authenticated;
    select 'schedule_rpc', result.outcome, result.updated_subject_count::text
    from (select set_config('request.jwt.claim.sub', '${profileId}', true)) jwt
    cross join lateral public.registrar_update_pending_enrollment_schedule(
      '${enrollmentId}', '${initialScheduleJson}'::jsonb
    ) result;
    reset role;

    select 'pledge_scheduled', coalesce(private.enrollment_document_hash(
      '${enrollmentId}', 'STUDENT', 'STUDENT_ENROLLMENT_SIGNATURE', 'ENROLLMENT_REGISTRATION'
    ), 'null');
    select 'official_scheduled', coalesce(private.enrollment_document_hash(
      '${enrollmentId}', 'NURSE', 'HEALTH_CLEARANCE', 'ENROLLMENT_CLEARANCE'
    ), 'null');
    update public.enrollments set registration_pledge_version = null where id = '${enrollmentId}';
    select 'legacy_scheduled', private.enrollment_document_hash('${enrollmentId}', 'STUDENT', 'STUDENT_ENROLLMENT_SIGNATURE', 'ENROLLMENT_REGISTRATION');
    update public.enrollments set registration_pledge_version = 'pledge-v1' where id = '${enrollmentId}';

    set local role authenticated;
    select 'pipe_a_rpc', result.outcome, result.updated_subject_count::text
    from (select set_config('request.jwt.claim.sub', '${profileId}', true)) jwt
    cross join lateral public.registrar_update_pending_enrollment_schedule(
      '${enrollmentId}', '${pipeAJson}'::jsonb
    ) result;
    reset role;
    select 'pipe_a_hash', coalesce(private.enrollment_document_hash(
      '${enrollmentId}', 'STUDENT', 'STUDENT_ENROLLMENT_SIGNATURE', 'ENROLLMENT_REGISTRATION'
    ), 'null');

    set local role authenticated;
    select 'pipe_b_rpc', result.outcome, result.updated_subject_count::text
    from (select set_config('request.jwt.claim.sub', '${profileId}', true)) jwt
    cross join lateral public.registrar_update_pending_enrollment_schedule(
      '${enrollmentId}', '${pipeBJson}'::jsonb
    ) result;
    reset role;
    select 'pipe_b_hash', coalesce(private.enrollment_document_hash(
      '${enrollmentId}', 'STUDENT', 'STUDENT_ENROLLMENT_SIGNATURE', 'ENROLLMENT_REGISTRATION'
    ), 'null');

    set local role authenticated;
    select 'newline_a_rpc', result.outcome, result.updated_subject_count::text
    from (select set_config('request.jwt.claim.sub', '${profileId}', true)) jwt
    cross join lateral public.registrar_update_pending_enrollment_schedule(
      '${enrollmentId}', '${newlineAJson}'::jsonb
    ) result;
    reset role;
    select 'newline_a_hash', coalesce(private.enrollment_document_hash(
      '${enrollmentId}', 'STUDENT', 'STUDENT_ENROLLMENT_SIGNATURE', 'ENROLLMENT_REGISTRATION'
    ), 'null');

    set local role authenticated;
    select 'newline_b_rpc', result.outcome, result.updated_subject_count::text
    from (select set_config('request.jwt.claim.sub', '${profileId}', true)) jwt
    cross join lateral public.registrar_update_pending_enrollment_schedule(
      '${enrollmentId}', '${newlineBJson}'::jsonb
    ) result;
    reset role;
    select 'newline_b_hash', coalesce(private.enrollment_document_hash(
      '${enrollmentId}', 'STUDENT', 'STUDENT_ENROLLMENT_SIGNATURE', 'ENROLLMENT_REGISTRATION'
    ), 'null');

    set local role authenticated;
    select 'invalid_day_rpc', result.outcome, result.updated_subject_count::text
    from (select set_config('request.jwt.claim.sub', '${profileId}', true)) jwt
    cross join lateral public.registrar_update_pending_enrollment_schedule(
      '${enrollmentId}', '${invalidDayJson}'::jsonb
    ) result;
    reset role;
    select 'invalid_day_hash', coalesce(private.enrollment_document_hash(
      '${enrollmentId}', 'STUDENT', 'STUDENT_ENROLLMENT_SIGNATURE', 'ENROLLMENT_REGISTRATION'
    ), 'null');

    set local role authenticated;
    select 'invalid_room_rpc', result.outcome, result.updated_subject_count::text
    from (select set_config('request.jwt.claim.sub', '${profileId}', true)) jwt
    cross join lateral public.registrar_update_pending_enrollment_schedule(
      '${enrollmentId}', '${invalidRoomJson}'::jsonb
    ) result;
    reset role;
    select 'invalid_room_hash', coalesce(private.enrollment_document_hash(
      '${enrollmentId}', 'STUDENT', 'STUDENT_ENROLLMENT_SIGNATURE', 'ENROLLMENT_REGISTRATION'
    ), 'null');

    set local role authenticated;
    select 'blank_rpc', result.outcome, result.updated_subject_count::text
    from (select set_config('request.jwt.claim.sub', '${profileId}', true)) jwt
    cross join lateral public.registrar_update_pending_enrollment_schedule(
      '${enrollmentId}', '${blankScheduleJson}'::jsonb
    ) result;
    reset role;

    select 'pledge_whitespace', coalesce(private.enrollment_document_hash(
      '${enrollmentId}', 'STUDENT', 'STUDENT_ENROLLMENT_SIGNATURE', 'ENROLLMENT_REGISTRATION'
    ), 'null');

    select 'approved_hash_before', coalesce(private.enrollment_document_hash(
      '${enrollmentId}', 'STUDENT', 'STUDENT_ENROLLMENT_SIGNATURE', 'ENROLLMENT_REGISTRATION'
    ), 'null');
    update public.enrollments set status = 'APPROVED' where id = '${enrollmentId}';
    set local role authenticated;
    select 'approved_rpc', result.outcome
    from (select set_config('request.jwt.claim.sub', '${profileId}', true)) jwt
    cross join lateral public.registrar_update_pending_enrollment_schedule(
      '${enrollmentId}', '${approvedScheduleJson}'::jsonb
    ) result;
    reset role;

    select 'approved_hash_after', coalesce(private.enrollment_document_hash(
      '${enrollmentId}', 'STUDENT', 'STUDENT_ENROLLMENT_SIGNATURE', 'ENROLLMENT_REGISTRATION'
    ), 'null');

    do $demo_reset_probe$
    declare
      v_deleted integer;
    begin
      perform set_config('pkm.demo_reset', 'true', true);
      delete from public.enrollment_subjects where id = '${subjectId}';
      get diagnostics v_deleted = row_count;
      if v_deleted <> 1 then
        raise exception 'Approved demo-reset cleanup did not remove its exact enrollment snapshot.';
      end if;
    end;
    $demo_reset_probe$;

    update public.enrollments set registration_pledge_version = 'pledge-v2' where id = '${enrollmentId}';
    select 'unknown_pledge', coalesce(private.enrollment_document_hash(
      '${enrollmentId}', 'STUDENT', 'STUDENT_ENROLLMENT_SIGNATURE', 'ENROLLMENT_REGISTRATION'
    ), 'null');
    rollback;
  `;

  const output = execFileSync("psql", [dbUrl, "-X", "-q", "-A", "-t", "-F", "\t", "-v", "ON_ERROR_STOP=1", "-c", sql], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
  const rows = new Map(
    output
      .replace(/\r/g, "")
      .trim()
      .split("\n")
      .filter(Boolean)
      .map((line) => {
        const [label, ...values] = line.split("\t");
        return [label, values];
      })
  );
  console.info('SQL fingerprint evidence', JSON.stringify(Object.fromEntries(rows)));

  const programId = readProgramId(dbUrl);
  const sortedSubjects = [...subjects].sort((left, right) =>
    compareText(left.course_code, right.course_code)
    || compareText(left.course_description, right.course_description)
    || left.units - right.units
  );
  const totalUnits = subjects.reduce((total, subject) => total + subject.units, 0);
  const baseEnrollment = {
    id: enrollmentId,
    academic_year: "2098-2099",
    semester: "2nd Semester",
    program_id: programId,
    year_level: "1st Year"
  };
  const baseSubjects = subjects.map(({ course_code, course_description, units }) => ({
    course_code, course_description, units
  }));
  const blankSubjects = baseSubjects.map((subject) => ({ ...subject, day: null, time: null, room: null }));
  const legacyInput = { ...baseEnrollment, enrollment_subjects: baseSubjects };
  const pledgeBlankInput = {
    ...baseEnrollment,
    registration_pledge_version: REGISTRATION_POLICY_VERSION,
    enrollment_subjects: blankSubjects
  };
  const baseMaterialFor = (signerRole: string, clearanceType: string, documentType: string) => [
    "ENROLLMENT",
    `enrollment_id=${enrollmentId}`,
    "academic_year=2098-2099",
    "semester=2nd Semester",
    `program_id=${programId}`,
    "year_level=1st Year",
    `subjects=${sortedSubjects.map((subject) => `${subject.course_code}|${subject.course_description}|${subject.units}`).join("\n")}`,
    `total_units=${totalUnits}`,
    `signer_role=${signerRole}`,
    `clearance_type=${clearanceType}`,
    `document_type=${documentType}`
  ].join("\n");
  const scheduleMaterialFor = (baseMaterial: string, scheduleSubjects: typeof subjects) =>
    `${baseMaterial}\nsubject_schedules=${[...scheduleSubjects]
      .sort((left, right) =>
        compareText(left.course_code, right.course_code)
        || compareText(left.course_description, right.course_description)
        || left.units - right.units
        || compareText(left.day ?? "", right.day ?? "")
        || compareText(left.time ?? "", right.time ?? "")
        || compareText(left.room ?? "", right.room ?? "")
      )
      .map((subject) => `${subject.course_code}|${subject.course_description}|${subject.units}|${subject.day ?? ""}|${subject.time ?? ""}|${subject.room ?? ""}`)
      .join("\n")}`;
  const studentBaseMaterial = baseMaterialFor(
    "STUDENT", "STUDENT_ENROLLMENT_SIGNATURE", "ENROLLMENT_REGISTRATION"
  );
  const officialBaseMaterial = baseMaterialFor("NURSE", "HEALTH_CLEARANCE", "ENROLLMENT_CLEARANCE");
  const legacyHash = hash(studentBaseMaterial);
  const pledgeHash = hash(`${studentBaseMaterial}\npledge_policy_version=pledge-v1`);
  const officialBlankHash = hash(officialBaseMaterial);
  const scheduledHash = hash(
    `${scheduleMaterialFor(studentBaseMaterial, subjects)}\npledge_policy_version=pledge-v1`
  );
  const officialScheduledHash = hash(scheduleMaterialFor(officialBaseMaterial, subjects));
  const officialInput = {
    ...baseEnrollment,
    registration_pledge_version: REGISTRATION_POLICY_VERSION,
    enrollment_subjects: subjects
  };
  const pledgeScheduledInput = { ...pledgeBlankInput, enrollment_subjects: subjects };
  const boundaryHash = (day: string, time: string) => computeEnrollmentDocumentHash({
    ...baseEnrollment,
    registration_pledge_version: REGISTRATION_POLICY_VERSION,
    enrollment_subjects: subjects.map((subject) => ({
      course_code: subject.course_code,
      course_description: subject.course_description,
      units: subject.units,
      day: subject.enrollmentSubjectId === subjectId ? day : subject.day,
      time: subject.enrollmentSubjectId === subjectId ? time : subject.time,
      room: subject.enrollmentSubjectId === subjectId ? null : subject.room
    }))
  }, "STUDENT", "STUDENT_ENROLLMENT_SIGNATURE", "ENROLLMENT_REGISTRATION");
  const assertBoundaryOutcome = (label: string, outcome: string | undefined, actualHash: string | undefined, previousHash: string | undefined) => {
    assert.ok(
      ["updated", "unchanged", "invalid_enrollment_load", "invalid_schedule_text"].includes(outcome ?? ""),
      `${label} must be rejected as invalid or accepted as a schedule update, received ${outcome}`
    );
    if (["invalid_enrollment_load", "invalid_schedule_text"].includes(outcome ?? "")) {
      assert.equal(actualHash, previousHash, `${label} rejection must leave the signed schedule hash unchanged`);
    }
  };
  const pledgeWhitespaceInput = {
    ...pledgeBlankInput,
    enrollment_subjects: blankSubjects.map((subject) => ({
      ...subject,
      ...(subject.course_code === subjectCode ? { day: "  ", time: "", room: null } : {})
    }))
  };

  assert.equal(computeEnrollmentDocumentHash(legacyInput, "STUDENT", "STUDENT_ENROLLMENT_SIGNATURE", "ENROLLMENT_REGISTRATION"), legacyHash);
  assert.equal(computeEnrollmentDocumentHash(pledgeBlankInput, "STUDENT", "STUDENT_ENROLLMENT_SIGNATURE", "ENROLLMENT_REGISTRATION"), pledgeHash);
  assert.equal(computeEnrollmentDocumentHash(pledgeWhitespaceInput, "STUDENT", "STUDENT_ENROLLMENT_SIGNATURE", "ENROLLMENT_REGISTRATION"), pledgeHash);
  assert.equal(computeEnrollmentDocumentHash(officialInput, "NURSE", "HEALTH_CLEARANCE", "ENROLLMENT_CLEARANCE"), officialScheduledHash);
  assert.equal(computeEnrollmentDocumentHash({ ...officialInput, enrollment_subjects: blankSubjects }, "NURSE", "HEALTH_CLEARANCE", "ENROLLMENT_CLEARANCE"), officialBlankHash);
  assert.equal(computeEnrollmentDocumentHash(pledgeScheduledInput, "STUDENT", "STUDENT_ENROLLMENT_SIGNATURE", "ENROLLMENT_REGISTRATION"), scheduledHash);
  assert.equal(rows.get("legacy_blank")?.[0], legacyHash);
  assert.equal(rows.get("pledge_blank")?.[0], pledgeHash);
  assert.equal(rows.get("official_blank")?.[0], officialBlankHash);
  const [sqlCollation, sqlSubjectOrder] = rows.get("sql_sort") ?? [];
  assert.equal(
    sqlSubjectOrder,
    sortedSubjects.map((subject) => subject.course_code).join(","),
    `PostgreSQL collation ${sqlCollation} must order these imported-style course codes like the TypeScript comparator`
  );
  assert.deepEqual(rows.get("schedule_rpc"), ["updated", "3"]);
  assert.equal(rows.get("pledge_scheduled")?.[0], scheduledHash);
  assert.equal(rows.get("official_scheduled")?.[0], officialScheduledHash);
  assert.equal(rows.get('legacy_scheduled')?.[0], hash(scheduleMaterialFor(studentBaseMaterial, subjects)));
  assert.equal(rows.get('legacy_scheduled')?.[0], computeEnrollmentDocumentHash({ ...baseEnrollment, enrollment_subjects: subjects }, 'STUDENT', 'STUDENT_ENROLLMENT_SIGNATURE', 'ENROLLMENT_REGISTRATION'));
  const pipeA = rows.get("pipe_a_rpc") ?? [];
  const pipeB = rows.get("pipe_b_rpc") ?? [];
  const pipeAHash = rows.get("pipe_a_hash")?.[0];
  const pipeBHash = rows.get("pipe_b_hash")?.[0];
  let latestBoundaryHash = scheduledHash;
  assertBoundaryOutcome("pipe_a", pipeA[0], pipeAHash, latestBoundaryHash);
  if (["updated", "unchanged"].includes(pipeA[0])) {
    assert.equal(pipeAHash, boundaryHash("M|T", "9"));
    latestBoundaryHash = pipeAHash!;
  }
  assertBoundaryOutcome("pipe_b", pipeB[0], pipeBHash, latestBoundaryHash);
  if (["updated", "unchanged"].includes(pipeB[0])) {
    assert.equal(pipeBHash, boundaryHash("M", "T|9"));
    latestBoundaryHash = pipeBHash!;
  }
  if (["updated", "unchanged"].includes(pipeA[0]) && ["updated", "unchanged"].includes(pipeB[0])) {
    assert.notEqual(pipeAHash, pipeBHash, "distinct accepted pipe-delimited schedules must not collide");
  }
  const newlineA = rows.get("newline_a_rpc") ?? [];
  const newlineB = rows.get("newline_b_rpc") ?? [];
  const newlineAHash = rows.get("newline_a_hash")?.[0];
  const newlineBHash = rows.get("newline_b_hash")?.[0];
  assertBoundaryOutcome("newline_a", newlineA[0], newlineAHash, latestBoundaryHash);
  if (["updated", "unchanged"].includes(newlineA[0])) {
    assert.equal(newlineAHash, boundaryHash("M|\nT", "9"));
    latestBoundaryHash = newlineAHash!;
  }
  assertBoundaryOutcome("newline_b", newlineB[0], newlineBHash, latestBoundaryHash);
  if (["updated", "unchanged"].includes(newlineB[0])) {
    assert.equal(newlineBHash, boundaryHash("M", "\nT|9"));
    latestBoundaryHash = newlineBHash!;
  }
  if (["updated", "unchanged"].includes(newlineA[0]) && ["updated", "unchanged"].includes(newlineB[0])) {
    assert.notEqual(newlineAHash, newlineBHash, "distinct accepted newline-containing schedules must not collide");
  }
  assert.equal(rows.get("invalid_day_rpc")?.[0], "invalid_enrollment_load");
  assert.equal(rows.get("invalid_day_hash")?.[0], latestBoundaryHash);
  assert.equal(rows.get("invalid_room_rpc")?.[0], "invalid_enrollment_load");
  assert.equal(rows.get("invalid_room_hash")?.[0], rows.get("invalid_day_hash")?.[0]);
  assert.deepEqual(rows.get("blank_rpc"), ["updated", "3"]);
  assert.equal(rows.get("pledge_whitespace")?.[0], pledgeHash);
  assert.deepEqual(rows.get("approved_rpc"), ["enrollment_not_pending"]);
  assert.equal(rows.get("approved_hash_before")?.[0], pledgeHash);
  assert.equal(rows.get("approved_hash_after")?.[0], pledgeHash, "approved subject snapshots and schedule hash must remain unchanged");
  assert.equal(rows.get("unknown_pledge")?.[0], "null");
});

function readProgramId(url: string) {
  return execFileSync("psql", [url, "-X", "-q", "-A", "-t", "-v", "ON_ERROR_STOP=1", "-c", "select id from public.programs where code = 'BSAIS' limit 1;"], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  }).trim();
}
