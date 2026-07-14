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

export function isCompatibleStudentType(claimedType: StudentType, storedType: StudentType) {
  return claimedType === "Old Student"
    ? OLD_STUDENT_COMPATIBLE_TYPES.includes(storedType)
    : claimedType === storedType;
}
