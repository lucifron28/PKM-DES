import { STUDENT_TYPE_TAGS } from "@/lib/constants/pkm";
import type { StudentType } from "@/types/database";

export function readStudentType(value: FormDataEntryValue | null): StudentType | null {
  const text = String(value ?? "").trim();
  if (STUDENT_TYPE_TAGS.includes(text as StudentType)) {
    return text as StudentType;
  }
  return null;
}

export function validatePasswordInput(password: string, confirmPassword: string): { valid: boolean; errorKey?: string } {
  if (!password) {
    return { valid: false, errorKey: "missing_password" };
  }
  if (password.length < 8) {
    return { valid: false, errorKey: "password_too_short" };
  }
  if (password !== confirmPassword) {
    return { valid: false, errorKey: "password_mismatch" };
  }
  return { valid: true };
}
