export type RequirementStatus = "PENDING" | "VERIFIED" | "REJECTED";

export type RequirementCode = "HEALTH_RECORD_UPDATE";

export type StudentRequirementRecord = {
  id: string;
  student_id: string;
  requirement_code: RequirementCode;
  status: RequirementStatus;
  created_at: string;
  updated_at: string;
};

export type StudentRequirementTarget = {
  student_type: string;
  year_level: string;
  sex?: string | null;
};
