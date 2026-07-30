import type { SupabaseClient } from "@supabase/supabase-js";
import type { Semester } from "@/types/database";

export interface ActiveEnrollmentTerm {
  id: string;
  academicYear: string;
  semester: Semester;
  enrollmentOpen: boolean;
  isActive: boolean;
  label: string;
}

export async function getActiveEnrollmentTerm(
  supabase: SupabaseClient
): Promise<ActiveEnrollmentTerm | null> {
  const { data, error } = await supabase
    .from("enrollment_terms")
    .select("id, academic_year, semester, enrollment_open, is_active")
    .eq("is_active", true)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  const semester = data.semester as Semester;

  return {
    id: data.id,
    academicYear: data.academic_year,
    semester,
    enrollmentOpen: Boolean(data.enrollment_open),
    isActive: Boolean(data.is_active),
    label: `AY ${data.academic_year}, ${semester}`
  };
}
