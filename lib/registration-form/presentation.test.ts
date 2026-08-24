import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  canStudentPrintRegistrationForm,
  getAcademicClassificationLabel,
  getRegistrationClassificationMarks,
  getRegistrationTotalUnits,
  sortRegistrationSubjects,
  REGISTRATION_FORM_MISCELLANEOUS_FEE_LABELS,
  REGISTRATION_FORM_SIGNATURE_BLOCKS,
  REGISTRATION_FORM_SIGNATURE_LABELS,
  REGISTRATION_FORM_SOURCE_SECTIONS,
  REGISTRATION_FORM_SUBJECT_ROW_COUNT
} from "./presentation";
import type { Subject } from "@/types/database";

function subject(id: string, courseCode: string, courseDescription: string, units: number): Subject {
  return {
    id,
    program_id: "program-id",
    course_code: courseCode,
    course_description: courseDescription,
    units,
    year_level: "1st Year",
    semester: "1st Semester",
    created_at: "2026-01-01T00:00:00.000Z"
  };
}

test("maps stored student classifications to visible registration marks", () => {
  assert.deepEqual(getRegistrationClassificationMarks("Incoming 1st Year Student"), {
    newStudent: true,
    oldStudent: false,
    transferee: false,
    regular: false,
    irregular: false
  });
  assert.equal(getRegistrationClassificationMarks("Transferee").transferee, true);
  assert.equal(getRegistrationClassificationMarks("Old Student").oldStudent, true);
  assert.equal(getRegistrationClassificationMarks("Continuing Student").oldStudent, true);
  assert.deepEqual(getRegistrationClassificationMarks("Regular Student"), {
    newStudent: false,
    oldStudent: true,
    transferee: false,
    regular: true,
    irregular: false
  });
  assert.deepEqual(getRegistrationClassificationMarks("Irregular Student"), {
    newStudent: false,
    oldStudent: true,
    transferee: false,
    regular: false,
    irregular: true
  });
  assert.deepEqual(getRegistrationClassificationMarks("Unknown"), {
    newStudent: false,
    oldStudent: false,
    transferee: false,
    regular: false,
    irregular: false
  });
  assert.equal(getAcademicClassificationLabel("Unknown"), "For Registrar classification");
});

test("sorts registration subjects by code, description, then ID", () => {
  const sorted = sortRegistrationSubjects([
    subject("b", "AE-1", "Zeta", 3),
    subject("c", "AE-1", "Alpha", 3),
    subject("a", "AE-1", "Alpha", 3),
    subject("d", "GE-1", "Understanding the Self", 3)
  ]);

  assert.deepEqual(sorted.map((item) => item.id), ["a", "c", "b", "d"]);
});

test("calculates registration units without dropping zero-unit rows", () => {
  assert.equal(getRegistrationTotalUnits([]), 0);
  assert.equal(getRegistrationTotalUnits([subject("one", "A", "One", 3), subject("zero", "B", "Zero", 0)]), 3);
  assert.equal(getRegistrationTotalUnits([subject("fraction", "C", "Fraction", 1.5)]), 1.5);
});

test("sorts offering-backed snapshots with the same deterministic presentation rules", () => {
  const sorted = sortRegistrationSubjects([
    { id: "offering-2", course_code: "GE-2", course_description: "Communication", units: 3, source: "course_offering" },
    { id: "offering-1", course_code: "GE-1", course_description: "Self", units: 3, source: "snapshot" }
  ]);

  assert.deepEqual(sorted.map((item) => item.id), ["offering-1", "offering-2"]);
  assert.equal(getRegistrationTotalUnits(sorted), 6);
});

test("allows student printing only for approved enrollment requests", () => {
  assert.equal(canStudentPrintRegistrationForm("APPROVED"), true);
  assert.equal(canStudentPrintRegistrationForm("PENDING"), false);
  assert.equal(canStudentPrintRegistrationForm("REJECTED"), false);
});

test("keeps the source form sections and signature blocks explicit", () => {
  assert.equal(REGISTRATION_FORM_SUBJECT_ROW_COUNT, 10);
  assert.deepEqual(REGISTRATION_FORM_SOURCE_SECTIONS, [
    "REGISTRATION FORM",
    "ASSESSMENT OF TUITION AND OTHER SCHOOL FEES (TOSF)",
    "MISCELLANEOUS FEE:",
    "TUITION FEE:",
    "NSTP FEE (CWTS):",
    "TOTAL TOSF:",
    "SCHOLARSHIP:"
  ]);
  assert.deepEqual(REGISTRATION_FORM_MISCELLANEOUS_FEE_LABELS.slice(0, 3), [
    "Admission Fee",
    "Athletic Fee",
    "Computer Fee"
  ]);
  assert.deepEqual(REGISTRATION_FORM_SIGNATURE_BLOCKS, [
    { label: "Student", clearanceType: "STUDENT_ENROLLMENT_SIGNATURE" },
    { label: "Librarian", clearanceType: "LIBRARY_CLEARANCE" },
    { label: "School Nurse", clearanceType: "HEALTH_CLEARANCE" },
    { label: "Program Chair", clearanceType: "PROGRAM_CLEARANCE" },
    { label: "Accountant", clearanceType: "ACCOUNTING_CLEARANCE" },
    { label: "Dean", clearanceType: "DEAN_CLEARANCE" }
  ]);
  assert.deepEqual(REGISTRATION_FORM_SIGNATURE_LABELS, [
    "Student",
    "Librarian",
    "School Nurse",
    "Program Chair",
    "Accountant",
    "Dean"
  ]);
});

test("the printable registration form does not render an enrolled stamp", () => {
  const componentSource = readFileSync(
    new URL("../../components/print/registration-form.tsx", import.meta.url),
    "utf8"
  );

  assert.doesNotMatch(componentSource, /registration-print-enrolled-stamp/);
  assert.doesNotMatch(componentSource, />ENROLLED</);
});
