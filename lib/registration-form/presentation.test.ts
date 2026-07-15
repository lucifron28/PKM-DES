import assert from "node:assert/strict";
import test from "node:test";
import {
  canStudentPrintRegistrationForm,
  getAcademicClassificationLabel,
  getRegistrationClassificationMarks,
  getRegistrationTotalUnits,
  sortRegistrationSubjects
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

test("allows student printing only for approved enrollment requests", () => {
  assert.equal(canStudentPrintRegistrationForm("APPROVED"), true);
  assert.equal(canStudentPrintRegistrationForm("PENDING"), false);
  assert.equal(canStudentPrintRegistrationForm("REJECTED"), false);
});
