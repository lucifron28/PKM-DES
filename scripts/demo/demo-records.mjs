export const DEMO_PROGRAM_CODE = "BSAIS";
export const DEMO_PROGRAM_NAME = "Accounting Information System";
export const DEMO_YEAR_LEVEL = "1st Year";
export const DEMO_STUDENT_TYPE = "Incoming 1st Year Student";
export const DEMO_RESET_CONFIRMATION = "RESET_PKM_DES_DEMO";
export const DEMO_REJECTION_REMARK = "Demonstration record: submitted information requires correction.";

export const DEMO_RECORDS = Object.freeze([
  {
    key: "claim-only",
    email: "pkm.demo.claim@example.com",
    studentIdNumber: "99-90001",
    firstName: "Andrea",
    lastName: "Reyes",
    hasAccount: false,
    enrollmentStatus: "NOT ENROLLED",
    reviewStatus: null,
    remarks: null
  },
  {
    key: "pending",
    email: "pkm.demo.pending@example.com",
    studentIdNumber: "99-90002",
    firstName: "Benjamin",
    lastName: "Cruz",
    hasAccount: true,
    enrollmentStatus: "PENDING",
    reviewStatus: "PENDING",
    remarks: null
  },
  {
    key: "approved",
    email: "pkm.demo.approved@example.com",
    studentIdNumber: "99-90003",
    firstName: "Camille",
    lastName: "Garcia",
    hasAccount: true,
    enrollmentStatus: "ENROLLED",
    reviewStatus: "APPROVED",
    remarks: null
  },
  {
    key: "rejected",
    email: "pkm.demo.rejected@example.com",
    studentIdNumber: "99-90004",
    firstName: "Daniel",
    lastName: "Mendoza",
    hasAccount: true,
    enrollmentStatus: "NOT ENROLLED",
    reviewStatus: "REJECTED",
    remarks: DEMO_REJECTION_REMARK
  }
]);

export const CLAIM_ONLY_DEMO_RECORD = DEMO_RECORDS.find((record) => !record.hasAccount);
export const ACCOUNT_DEMO_RECORDS = DEMO_RECORDS.filter((record) => record.hasAccount);
export const DEMO_EMAILS = DEMO_RECORDS.map((record) => record.email);
export const ACCOUNT_DEMO_EMAILS = ACCOUNT_DEMO_RECORDS.map((record) => record.email);
export const DEMO_STUDENT_IDS = DEMO_RECORDS.map((record) => record.studentIdNumber);

export function resolveDemoTerm(environment = process.env) {
  const academicYear = environment.NEXT_PUBLIC_CURRENT_ACADEMIC_YEAR || "2026-2027";
  const semesterValue = environment.NEXT_PUBLIC_CURRENT_SEMESTER || "1st Semester";

  if (semesterValue !== "1st Semester" && semesterValue !== "2nd Semester") {
    throw new Error("NEXT_PUBLIC_CURRENT_SEMESTER must be 1st Semester or 2nd Semester.");
  }

  return {
    academicYear,
    semester: semesterValue
  };
}

export function recordForEmail(email) {
  return DEMO_RECORDS.find((record) => record.email === String(email).toLowerCase()) ?? null;
}

export function recordForStudentId(studentIdNumber) {
  return DEMO_RECORDS.find((record) => record.studentIdNumber === studentIdNumber) ?? null;
}
