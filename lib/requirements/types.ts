import type { Semester } from "@/types/database";

export type RequirementStatus = "PENDING" | "VERIFIED" | "REJECTED";

export type RequirementCode = "HEALTH_RECORD_UPDATE";

export type RequirementApplicability = "APPLICABLE" | "NOT_APPLICABLE";

export type RequirementTerm = {
  academicYear: string;
  semester: Semester;
};

export type StudentRequirementRecord = {
  id: string;
  student_id: string;
  requirement_code: RequirementCode;
  status: RequirementStatus;
  academic_year: string | null;
  semester: Semester | null;
  applicability: RequirementApplicability;
  note: string | null;
  verified_at: string | null;
  verified_by: string | null;
  created_at: string;
  updated_at: string;
};

export type StudentRequirementTarget = {
  student_type: string;
  official_gender_sex?: string | null;
};
