import type { Semester } from "@/types/database";

export type HealthRecordUpdate = {
  id: string;
  enrollment_id: string;
  student_id: string;
  academic_year: string;
  semester: Semester;
  medical_condition_1: string | null;
  medical_condition_1_identified_on: string | null;
  medical_condition_1_medication: string | null;
  medical_condition_2: string | null;
  medical_condition_2_identified_on: string | null;
  medical_condition_2_medication: string | null;
  allergy: string | null;
  last_menstrual_period: string | null;
  others: string | null;
  submitted_at: string;
  created_at: string;
  updated_at: string;
};
export type HealthRecordUpdateState = {
  message?: string;
  success?: boolean;
};
