import type { SupabaseClient } from "@supabase/supabase-js";
import type { OfficialRecordInput } from "./input";

export type SyncRpcOutcome = {
  outcome: string;
  record_id: string;
  email_mismatch: boolean;
};

export async function findDuplicateOfficialRecord(
  supabase: SupabaseClient,
  input: OfficialRecordInput,
  recordId?: string
): Promise<"duplicate_email" | "duplicate_student_id" | null> {
  let emailQuery = supabase.from("official_student_records").select("id").eq("email", input.email);
  let studentIdQuery = input.studentIdNumber
    ? supabase.from("official_student_records").select("id").eq("student_id_number", input.studentIdNumber)
    : null;

  if (recordId) {
    emailQuery = emailQuery.neq("id", recordId);
    studentIdQuery = studentIdQuery?.neq("id", recordId) ?? null;
  }

  const [emailResult, studentIdResult] = await Promise.all([
    emailQuery.maybeSingle(),
    studentIdQuery ? studentIdQuery.maybeSingle() : Promise.resolve({ data: null, error: null })
  ]);

  if (emailResult.error || studentIdResult.error) return null;
  if (emailResult.data) return "duplicate_email";
  if (studentIdResult.data) return "duplicate_student_id";
  return null;
}

export async function insertOfficialStudentRecord(
  supabase: SupabaseClient,
  payload: Record<string, unknown>
): Promise<{ error: Error | null }> {
  const { error } = await supabase.from("official_student_records").insert(payload as unknown as Record<string, never>);
  return { error: error as Error | null };
}

export async function updateOfficialStudentRecordAndSyncRpc(
  supabase: SupabaseClient,
  payload: {
    p_record_id: string;
    p_student_id_number: string | null;
    p_first_name: string;
    p_last_name: string;
    p_email: string;
    p_program_id: string;
    p_year_level: string;
    p_student_type: string;
    p_birthdate: string | null;
    p_gender_sex: string | null;
    p_address: string | null;
    p_contact_number: string | null;
    p_guardian: string | null;
    p_emergency_contact_person: string | null;
    p_nationality: string | null;
    p_civil_status: string | null;
    p_previous_school_information: string | null;
    p_admission_status: string | null;
    p_enrollment_status: string;
  }
): Promise<{ data: SyncRpcOutcome | null; error: Error | null }> {
  const { data, error } = await supabase.rpc("update_official_student_record_and_sync", payload as unknown as Record<string, unknown>);
  const result = (data as SyncRpcOutcome[] | null)?.[0] ?? null;
  return { data: result, error: error as Error | null };
}
