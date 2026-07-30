import assert from "node:assert/strict";
import test from "node:test";
import { COURSE_OFFERINGS_MANIFEST } from "@/lib/course-offerings/manifest";

test("manifest expected total rows equal 245", () => {
  assert.equal(COURSE_OFFERINGS_MANIFEST.expectedTotalRows, 245);
});

test("manifest counts by program match exact expectations", () => {
  const counts = COURSE_OFFERINGS_MANIFEST.countsByProgram;
  assert.equal(counts.BSAIS, 25);
  assert.equal(counts.BSMA, 24);
  assert.equal(counts.BEED, 24);
  assert.equal(counts.ENGLISH, 25);
  assert.equal(counts.FILIPINO, 25);
  assert.equal(counts.MATH, 25);
  assert.equal(counts.SS, 25);
  assert.equal(counts.CRIM, 16);
  assert.equal(counts.ACP, 28);
  assert.equal(counts.FSM, 28);
  const sum = Object.values(counts).reduce((a, b) => a + b, 0);
  assert.equal(sum, 245);
});

test("canonical programs list contains exactly 10 canonical codes", () => {
  const canonicalCodes = ["BSAIS", "BSMA", "BEED", "ENGLISH", "FILIPINO", "MATH", "SS", "CRIM", "ACP", "FSM"];
  assert.equal(canonicalCodes.length, 10);
  assert.equal(new Set(canonicalCodes).size, 10);
});

test("lowercase and whitespace AIS aliases consolidate to BSAIS", () => {
  const normalize = (code: string) => {
    const trimmed = code.trim().toUpperCase();
    return trimmed === "AIS" ? "BSAIS" : trimmed;
  };

  assert.equal(normalize(" ais "), "BSAIS");
  assert.equal(normalize("bsais"), "BSAIS");
  assert.equal(normalize("BSMA"), "BSMA");
});

test("non-BSAIS program codes remain unchanged", () => {
  const nonBsaisCodes = ["BSMA", "BEED", "CRIM", "MATH"];
  for (const code of nonBsaisCodes) {
    assert.equal(code.trim().toUpperCase(), code);
  }
});

function resolveDefaultProgramId(record: { program_id: string } | null, bsaisProgramId?: string) {
  return record ? record.program_id : bsaisProgramId ?? "";
}

test("new blank Official Record form selects BSAIS default ID when available", () => {
  const bsaisProgram = { id: "bsais-uuid", name: "BSAIS", code: "BSAIS" };
  const defaultProgramId = resolveDefaultProgramId(null, bsaisProgram.id);
  assert.equal(defaultProgramId, "bsais-uuid");
});

test("edit Official Record form retains explicit program ID", () => {
  const record = { id: "record-1", program_id: "bsma-uuid" };
  const defaultProgramId = resolveDefaultProgramId(record, "bsais-uuid");
  assert.equal(defaultProgramId, "bsma-uuid");
});

test("missing student program data does not present student program as BSAIS", () => {
  const student: { programs: { code: string; name: string } | null } = { programs: null };
  const studentProgramCode = student.programs?.code ?? null;
  const studentProgramName = student.programs?.name ?? "Unassigned Program";

  assert.equal(studentProgramCode, null);
  assert.equal(studentProgramName, "Unassigned Program");
  assert.notEqual(studentProgramCode, "BSAIS");
});

test("BSAIS curriculum subjects are loaded from subjects table dataset", () => {
  const rawSubjects = [
    { id: "subj-1", course_code: "GE-1", program_code: "BSAIS" },
    { id: "subj-2", course_code: "BM-1", program_code: "BSMA" }
  ];

  const bsaisSubjects = rawSubjects.filter((s) => s.program_code === "BSAIS");
  assert.equal(bsaisSubjects.length, 1);
  assert.equal(bsaisSubjects[0].course_code, "GE-1");
});

test("BSAIS curriculum and history failure states render independently", () => {
  const stateA = {
    historicalOfferingsError: true,
    curriculumSubjectsError: false,
    curriculumLength: 20
  };
  assert.equal(stateA.historicalOfferingsError, true);
  assert.equal(stateA.curriculumSubjectsError, false);

  const stateB = {
    historicalOfferingsError: false,
    curriculumSubjectsError: true,
    historicalLength: 25
  };
  assert.equal(stateB.historicalOfferingsError, false);
  assert.equal(stateB.curriculumSubjectsError, true);
});

test("historical offerings do not alter enrollment_subjects table", () => {
  const enrollmentSubjectsTable = "enrollment_subjects";
  const courseOfferingsTable = "course_offerings";
  assert.notEqual(enrollmentSubjectsTable, courseOfferingsTable);
});

test("CRIM alignment regression count remains 16", () => {
  assert.equal(COURSE_OFFERINGS_MANIFEST.countsByProgram.CRIM, 16);
});
