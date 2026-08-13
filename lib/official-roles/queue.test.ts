import assert from "node:assert/strict";
import test from "node:test";
import { filterOfficialClearanceQueue, type OfficialClearanceQueueRow } from "./queue";

const rows: OfficialClearanceQueueRow[] = [
  {
    enrollmentId: "enrollment-1",
    studentId: "student-1",
    studentName: "Ana Santos",
    studentIdNumber: "2026-0001",
    programName: "BSAIS",
    yearLevel: "1st Year",
    academicYear: "2025-2026",
    semester: "2nd Semester",
    enrollmentStatus: "PENDING",
    clearanceStatus: "PENDING",
    signerName: null,
    signedAt: null,
    actionable: true
  },
  {
    enrollmentId: "enrollment-2",
    studentId: "student-2",
    studentName: "Ben Cruz",
    studentIdNumber: "2026-0002",
    programName: "BSMA",
    yearLevel: "2nd Year",
    academicYear: "2025-2026",
    semester: "2nd Semester",
    enrollmentStatus: "APPROVED",
    clearanceStatus: "SIGNED",
    signerName: "Librarian Demo",
    signedAt: "2026-08-14T00:00:00.000Z",
    actionable: false
  },
  {
    enrollmentId: "enrollment-3",
    studentId: "student-3",
    studentName: "Cara Dela Cruz",
    studentIdNumber: "2026-0003",
    programName: "BEED",
    yearLevel: "1st Year",
    academicYear: "2025-2026",
    semester: "2nd Semester",
    enrollmentStatus: "PENDING",
    clearanceStatus: "INVALIDATED",
    signerName: "Previous Librarian",
    signedAt: "2026-08-13T00:00:00.000Z",
    actionable: true
  }
];

test("queue filters keep invalidated records in the pending work view", () => {
  assert.deepEqual(filterOfficialClearanceQueue(rows, "pending").map((row) => row.enrollmentId), ["enrollment-1", "enrollment-3"]);
  assert.deepEqual(filterOfficialClearanceQueue(rows, "signed").map((row) => row.enrollmentId), ["enrollment-2"]);
  assert.deepEqual(filterOfficialClearanceQueue(rows, "all", "2026-0003").map((row) => row.enrollmentId), ["enrollment-3"]);
  assert.deepEqual(filterOfficialClearanceQueue(rows, "all", "bsma").map((row) => row.enrollmentId), ["enrollment-2"]);
});
