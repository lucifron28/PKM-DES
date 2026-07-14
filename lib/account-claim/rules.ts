import type { StudentType } from "@/types/database";

export const GENERIC_CLAIM_FAILURE =
  "We could not verify a claimable official record using those details. Check your information or contact the Registrar.";

const OLD_STUDENT_COMPATIBLE_TYPES: StudentType[] = [
  "Old Student",
  "Continuing Student",
  "Regular Student",
  "Irregular Student"
];

export function normalizeClaimEmail(value: string | null | undefined) {
  return String(value ?? "").trim().toLowerCase();
}

export function normalizeStudentId(value: string | null | undefined) {
  return String(value ?? "").trim().replace(/\s+/g, " ");
}

export function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export type ClaimLookupInputResult =
  | { valid: true; email: string; studentIdNumber: string }
  | { valid: false; code: "missing_email" | "missing_student_id" | "invalid_email" };

export function validateClaimLookupInput({
  email,
  studentIdNumber
}: {
  email: string | null | undefined;
  studentIdNumber: string | null | undefined;
}): ClaimLookupInputResult {
  const normalizedEmail = normalizeClaimEmail(email);
  const normalizedStudentId = normalizeStudentId(studentIdNumber);

  if (!normalizedEmail) {
    return { valid: false, code: "missing_email" };
  }
  if (!normalizedStudentId) {
    return { valid: false, code: "missing_student_id" };
  }
  if (!isValidEmail(normalizedEmail)) {
    return { valid: false, code: "invalid_email" };
  }

  return { valid: true, email: normalizedEmail, studentIdNumber: normalizedStudentId };
}

export function isCompatibleStudentType(claimedType: StudentType, storedType: StudentType) {
  return claimedType === "Old Student"
    ? OLD_STUDENT_COMPATIBLE_TYPES.includes(storedType)
    : claimedType === storedType;
}
