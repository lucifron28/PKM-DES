import { normalizeClaimEmail, normalizeStudentId } from "@/lib/account-claim/rules";
import {
  STUDENT_TYPE_TAGS,
  YEAR_LEVELS
} from "@/lib/constants/pkm";
import type { EnrollmentStatus, StudentType, YearLevel } from "@/types/database";

const ENROLLMENT_STATUSES: EnrollmentStatus[] = ["NOT ENROLLED", "PENDING", "ENROLLED"];

export type OfficialRecordInput = {
  studentIdNumber: string | null;
  firstName: string;
  lastName: string;
  email: string;
  programId: string;
  yearLevel: YearLevel;
  studentType: StudentType;
  enrollmentStatus: EnrollmentStatus;
};

export function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function optionalValue(value: FormDataEntryValue | null) {
  const text = String(value ?? "").trim();
  return text || null;
}

export function optionalGuidedValue(value: FormDataEntryValue | null, options: string[]) {
  const text = optionalValue(value);
  return text && options.includes(text) ? text : null;
}

export function isValidIsoDate(value: FormDataEntryValue | null) {
  const text = optionalValue(value);
  if (!text) return true;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return false;

  const [year, month, day] = text.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

export function extractSubmittedValues(formData: FormData): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [key, value] of formData.entries()) {
    if (typeof value === "string") {
      result[key] = value;
    }
  }
  return result;
}

export function readOfficialRecordInput(formData: FormData): OfficialRecordInput {
  const studentIdNumber = normalizeStudentId(String(formData.get("student_id_number") ?? "")) || null;
  const firstName = String(formData.get("first_name") ?? "").trim();
  const lastName = String(formData.get("last_name") ?? "").trim();
  const email = normalizeClaimEmail(String(formData.get("email") ?? ""));
  const programId = String(formData.get("program_id") ?? "").trim();
  const yearLevel = String(formData.get("year_level") ?? "").trim() as YearLevel;
  const studentType = String(formData.get("student_type") ?? "").trim() as StudentType;
  const enrollmentStatus = String(formData.get("enrollment_status") ?? "").trim() as EnrollmentStatus;

  return {
    studentIdNumber,
    firstName,
    lastName,
    email,
    programId,
    yearLevel,
    studentType,
    enrollmentStatus
  };
}

export function validateOfficialRecordInputWithErrors(
  formData: FormData,
  input: OfficialRecordInput
): { message: string; fieldErrors: Record<string, string> } | null {
  const { firstName, lastName, email, programId, yearLevel, studentType, enrollmentStatus } = input;
  const fieldErrors: Record<string, string> = {};

  if (!firstName) fieldErrors.first_name = "First name is required.";
  if (!lastName) fieldErrors.last_name = "Last name is required.";
  if (!email) {
    fieldErrors.email = "Active email address is required.";
  } else if (!isValidEmail(email)) {
    fieldErrors.email = "Please enter a valid email address.";
  }
  if (!programId) fieldErrors.program_id = "Program selection is required.";
  if (!yearLevel || !YEAR_LEVELS.includes(yearLevel)) fieldErrors.year_level = "Valid year level selection is required.";
  if (!studentType || !STUDENT_TYPE_TAGS.includes(studentType)) fieldErrors.student_type = "Valid student type selection is required.";
  if (!enrollmentStatus || !ENROLLMENT_STATUSES.includes(enrollmentStatus)) fieldErrors.enrollment_status = "Valid enrollment status is required.";

  if (!isValidIsoDate(formData.get("birthdate"))) {
    fieldErrors.birthdate = "Birthdate must be a valid YYYY-MM-DD date.";
  }

  if (Object.keys(fieldErrors).length > 0) {
    return {
      message: "Please correct the highlighted errors below.",
      fieldErrors
    };
  }

  return null;
}
