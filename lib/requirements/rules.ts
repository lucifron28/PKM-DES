import { RequirementCode, RequirementStatus, StudentRequirementRecord, StudentRequirementTarget } from "./types";

export function isRequirementAppliableToStudent(
  code: RequirementCode,
  student: StudentRequirementTarget
): boolean {
  if (code === "HEALTH_RECORD_UPDATE") {
    // Provisional rule: Applies to Incoming 1st Year female students (or female 1st years)
    const is1stYear = student.year_level === "1st Year" || student.student_type === "Incoming 1st Year Student";
    const isFemale = !student.sex || student.sex.toLowerCase() === "female" || student.sex.toLowerCase() === "f";
    return is1stYear && isFemale;
  }
  return false;
}

export function areRequirementsFulfilled(
  requiredCodes: RequirementCode[],
  records: StudentRequirementRecord[]
): boolean {
  for (const code of requiredCodes) {
    const record = records.find((r) => r.requirement_code === code);
    if (!record || record.status !== "VERIFIED") {
      return false;
    }
  }
  return true;
}

export function getMissingOrUnverifiedRequirements(
  requiredCodes: RequirementCode[],
  records: StudentRequirementRecord[]
): RequirementCode[] {
  return requiredCodes.filter((code) => {
    const record = records.find((r) => r.requirement_code === code);
    return !record || record.status !== "VERIFIED";
  });
}
