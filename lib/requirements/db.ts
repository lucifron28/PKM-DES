import { createSupabaseServerClient, createSupabaseAdminClient } from "@/lib/supabase/server";
import { RequirementCode, RequirementStatus, StudentRequirementRecord } from "./types";

export async function getStudentRequirements(studentId: string): Promise<StudentRequirementRecord[]> {
  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("student_requirements")
      .select("*")
      .eq("student_id", studentId);

    if (error || !data) {
      return [];
    }

    return data as StudentRequirementRecord[];
  } catch {
    return [];
  }
}

export async function updateRequirementStatusAction(
  studentId: string,
  requirementCode: RequirementCode,
  status: RequirementStatus
): Promise<{ success: boolean; message?: string }> {
  try {
    const admin = createSupabaseAdminClient();
    const { error } = await admin
      .from("student_requirements")
      .upsert(
        {
          student_id: studentId,
          requirement_code: requirementCode,
          status,
          updated_at: new Date().toISOString()
        },
        { onConflict: "student_id,requirement_code" }
      );

    if (error) {
      return { success: false, message: error.message };
    }

    return { success: true };
  } catch (e) {
    return { success: false, message: e instanceof Error ? e.message : "Failed to update status" };
  }
}
