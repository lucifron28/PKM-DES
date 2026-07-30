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

export type ActiveTermQueryResult =
  | { ok: true; term: ActiveEnrollmentTerm }
  | { ok: true; term: null }
  | { ok: false; reason: "query_failed"; error?: unknown };

export async function getActiveEnrollmentTermResult(
  supabase: SupabaseClient
): Promise<ActiveTermQueryResult> {
  const { data, error } = await supabase
    .from("enrollment_terms")
    .select("id, academic_year, semester, enrollment_open, is_active")
    .eq("is_active", true)
    .maybeSingle();

  if (error) {
    console.error("getActiveEnrollmentTerm:query_failed", error);
    return { ok: false, reason: "query_failed", error };
  }

  if (!data) {
    return { ok: true, term: null };
  }

  const semester = data.semester as Semester;

  return {
    ok: true,
    term: {
      id: data.id,
      academicYear: data.academic_year,
      semester,
      enrollmentOpen: Boolean(data.enrollment_open),
      isActive: Boolean(data.is_active),
      label: `AY ${data.academic_year}, ${semester}`
    }
  };
}

export async function getActiveEnrollmentTerm(
  supabase: SupabaseClient
): Promise<ActiveEnrollmentTerm | null> {
  const result = await getActiveEnrollmentTermResult(supabase);
  if (!result.ok || !result.term) {
    return null;
  }
  return result.term;
}
