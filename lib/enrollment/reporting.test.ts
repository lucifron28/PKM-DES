import assert from "node:assert/strict";
import test from "node:test";
import {
  countEnrollmentStatuses,
  enrollmentMatchesSearch,
  getEnrollmentReportCriteria,
  nextEnrollmentReportOffset,
  normalizeEnrollmentFilters,
  normalizeEnrollmentSearch,
  programFilterValue,
  serializeEnrollmentFilters
} from "@/lib/enrollment/query";
import type { EnrollmentReportingRow, ProgramOption } from "@/lib/enrollment/query";

const programs: ProgramOption[] = [
  { id: "program-bsais", name: "Bachelor of Science in Accounting Information System", code: "BSAIS" },
  { id: "program-beed", name: "Bachelor of Elementary Education", code: "BEED" }
];

const row = {
  id: "enrollment-1",
  student_id: "student-1",
  program_id: "program-bsais",
  year_level: "1st Year",
  academic_year: "2026-2027",
  semester: "1st Semester",
  status: "PENDING",
  submitted_at: "2026-07-15T00:00:00.000Z",
  reviewed_at: null,
  reviewed_by: null,
  remarks: null,
  students: {
    id: "student-1",
    profile_id: "profile-1",
    student_id_number: "26-00001",
    program_id: "program-bsais",
    year_level: "1st Year",
    student_type: "Incoming 1st Year Student",
    enrollment_status: "PENDING",
    created_at: "2026-07-15T00:00:00.000Z",
    updated_at: "2026-07-15T00:00:00.000Z",
    profiles: {
      id: "profile-1",
      role: "student",
      first_name: "Maria",
      last_name: "Santos",
      email: "maria.santos@example.com",
      account_status: "ACTIVE",
      created_at: "2026-07-15T00:00:00.000Z",
      updated_at: "2026-07-15T00:00:00.000Z"
    }
  }
} satisfies EnrollmentReportingRow;

test("normalizes only supported reporting filters", () => {
  const filters = normalizeEnrollmentFilters(
    {
      search: "  Maria    Santos  ",
      program: "BSAIS",
      academic_year: "2026-2027",
      year_level: "1st Year",
      semester: "1st Semester",
      status: "PENDING"
    },
    programs
  );

  assert.deepEqual(filters, {
    search: "Maria Santos",
    program: "BSAIS",
    academic_year: "2026-2027",
    year_level: "1st Year",
    semester: "1st Semester",
    status: "PENDING"
  });
  assert.equal(normalizeEnrollmentSearch(" "), undefined);
  assert.equal(normalizeEnrollmentSearch("x".repeat(101)), "x".repeat(100));
  assert.deepEqual(normalizeEnrollmentFilters({ program: "unknown", status: "UNKNOWN" }, programs), {});
});

test("uses the program ID when a stored program code is blank", () => {
  const blankCodeProgram: ProgramOption = { id: "program-blank", name: "Program Without Code", code: "   " };
  const filters = normalizeEnrollmentFilters({ program: "program-blank" }, [blankCodeProgram]);

  assert.equal(programFilterValue(blankCodeProgram), "program-blank");
  assert.deepEqual(filters, { program: "program-blank" });
  assert.equal(serializeEnrollmentFilters(filters, [blankCodeProgram]), "program=program-blank");
});

test("advances reporting pagination by actual row counts until a zero-row page", () => {
  const responses = [100, 100, 25, 0];
  const offsets: number[] = [];
  let offset: number | null = 0;

  for (const responseSize of responses) {
    if (offset === null) {
      assert.fail("A zero-row page ended pagination before all test responses were consumed.");
    }
    offsets.push(offset);
    offset = nextEnrollmentReportOffset(offset, responseSize);
  }

  assert.deepEqual(offsets, [0, 100, 200, 225]);
  assert.equal(offset, null);
});

test("searches only student identity fields with normalized partial matching", () => {
  assert.equal(enrollmentMatchesSearch(row, "maria"), true);
  assert.equal(enrollmentMatchesSearch(row, "Santos, Maria"), false);
  assert.equal(enrollmentMatchesSearch(row, "Santos Maria"), true);
  assert.equal(enrollmentMatchesSearch(row, "26-000"), true);
  assert.equal(enrollmentMatchesSearch(row, "unrelated"), false);
});

test("counts canonical filtered enrollment rows", () => {
  const counts = countEnrollmentStatuses([{ status: "PENDING" }, { status: "APPROVED" }]);
  assert.deepEqual(counts, { PENDING: 1, APPROVED: 1, REJECTED: 0, total: 2 });
});

test("formats print criteria without raw program identifiers", () => {
  const filters = normalizeEnrollmentFilters({ program: "program-bsais", search: " Maria " }, programs);
  assert.deepEqual(getEnrollmentReportCriteria(filters, programs[0]), [
    ["Search Query", "Maria"],
    ["Program", "Bachelor of Science in Accounting Information System (BSAIS)"],
    ["Academic Year", "All"],
    ["Year Level", "All"],
    ["Semester", "All"],
    ["Review Status", "All"]
  ]);
  assert.equal(serializeEnrollmentFilters(filters, programs), "search=Maria&program=BSAIS");
});
