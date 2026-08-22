import { SEMESTERS } from "@/lib/constants/pkm";
import type {
  RequirementApplicability,
  RequirementCode,
  RequirementStatus,
  RequirementTerm,
  StudentRequirementRecord,
  StudentRequirementTarget
} from "./types";

const REQUIREMENT_CODES: RequirementCode[] = ["HEALTH_RECORD_UPDATE"];
const REQUIREMENT_STATUSES: RequirementStatus[] = ["PENDING", "VERIFIED", "REJECTED"];
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ACADEMIC_YEAR_PATTERN = /^\d{4}-\d{4}$/;

export function getRequirementApplicability(
  code: RequirementCode,
  student: StudentRequirementTarget
): RequirementApplicability {
  if (code !== "HEALTH_RECORD_UPDATE") return "NOT_APPLICABLE";

  const studentType = student.student_type?.trim();
  const confirmedFemale = student.official_gender_sex?.trim().toLowerCase() === "female";
  return (
    studentType === "Transferee" ||
    (studentType === "Incoming 1st Year Student" && confirmedFemale)
  )
    ? "APPLICABLE"
    : "NOT_APPLICABLE";
}

export function isRequirementAppliableToStudent(
  code: RequirementCode,
  student: StudentRequirementTarget
): boolean {
  return getRequirementApplicability(code, student) === "APPLICABLE";
}

export function isRequirementCode(value: string): value is RequirementCode {
  return REQUIREMENT_CODES.includes(value as RequirementCode);
}

export function isRequirementStatus(value: string): value is RequirementStatus {
  return REQUIREMENT_STATUSES.includes(value as RequirementStatus);
}

export function isRequirementUuid(value: string) {
  return UUID_PATTERN.test(value);
}

export function isValidRequirementTerm({ academicYear, semester }: RequirementTerm) {
  return ACADEMIC_YEAR_PATTERN.test(academicYear) && SEMESTERS.includes(semester);
}

export function normalizeRequirementNote(value: FormDataEntryValue | null) {
  const note = String(value ?? "").replace(/\s+/g, " ").trim();
  if (!note) return { valid: true as const, note: null };
  if (note.length > 240 || /[\u0000-\u001F]/.test(note)) {
    return { valid: false as const, note: null };
  }

  return { valid: true as const, note };
}

export function findRequirementForTerm(
  records: StudentRequirementRecord[],
  code: RequirementCode,
  term: RequirementTerm
) {
  return records.find(
    (record) =>
      record.requirement_code === code &&
      record.academic_year === term.academicYear &&
      record.semester === term.semester
  );
}

export function areRequirementsFulfilled(
  requiredCodes: RequirementCode[],
  records: StudentRequirementRecord[],
  term?: RequirementTerm
): boolean {
  for (const code of requiredCodes) {
    const record = term
      ? findRequirementForTerm(records, code, term)
      : records.find((item) => item.requirement_code === code);
    if (!record || record.applicability !== "APPLICABLE" || record.status !== "VERIFIED") {
      return false;
    }
  }
  return true;
}

export function getMissingOrUnverifiedRequirements(
  requiredCodes: RequirementCode[],
  records: StudentRequirementRecord[],
  term?: RequirementTerm
): RequirementCode[] {
  return requiredCodes.filter((code) => {
    const record = term
      ? findRequirementForTerm(records, code, term)
      : records.find((item) => item.requirement_code === code);
    return !record || record.applicability !== "APPLICABLE" || record.status !== "VERIFIED";
  });
}
