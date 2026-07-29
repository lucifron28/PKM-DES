import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { RequirementTerm, StudentRequirementRecord } from "./types";

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

export async function getStudentRequirementForTerm(
  studentId: string,
  term: RequirementTerm
): Promise<StudentRequirementRecord | null> {
  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("student_requirements")
      .select("*")
      .eq("student_id", studentId)
      .eq("requirement_code", "HEALTH_RECORD_UPDATE")
      .eq("academic_year", term.academicYear)
      .eq("semester", term.semester)
      .maybeSingle();

    if (error || !data) return null;
    return data as StudentRequirementRecord;
  } catch {
    return null;
  }
}
