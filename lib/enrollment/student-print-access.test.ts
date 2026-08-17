import assert from "node:assert/strict";
import test from "node:test";
import {
  canStudentViewRegistrationForm,
  selectCurrentApprovedRegistration,
  studentRegistrationFormHref
} from "./student-print-access";

test("student print access is limited to the student's approved enrollment", () => {
  assert.equal(canStudentViewRegistrationForm({ student_id: "student-1", status: "APPROVED" }, "student-1"), true);
  assert.equal(canStudentViewRegistrationForm({ student_id: "student-2", status: "APPROVED" }, "student-1"), false);
  assert.equal(canStudentViewRegistrationForm({ student_id: "student-1", status: "PENDING" }, "student-1"), false);
  assert.equal(canStudentViewRegistrationForm({ student_id: "student-1", status: "REJECTED" }, "student-1"), false);
});

test("registration form selection handles single, current-term, and historical approved records", () => {
  const records = [
    { id: "old", academic_year: "2025-2026", semester: "2nd Semester", status: "APPROVED" as const },
    { id: "current", academic_year: "2026-2027", semester: "1st Semester", status: "APPROVED" as const }
  ];
  assert.equal(selectCurrentApprovedRegistration([records[0]], { academicYear: "2026-2027", semester: "1st Semester" }), "old");
  assert.equal(selectCurrentApprovedRegistration(records, { academicYear: "2026-2027", semester: "1st Semester" }), "current");
  assert.equal(selectCurrentApprovedRegistration(records, { academicYear: "2027-2028", semester: "1st Semester" }), null);
  assert.equal(studentRegistrationFormHref("record/1"), "/student/enrollments/record%2F1/registration");
});
