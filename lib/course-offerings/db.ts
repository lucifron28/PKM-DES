import type { SupabaseClient } from "@supabase/supabase-js";
import type { Semester, YearLevel } from "@/types/database";

export interface CourseOfferingRecord {
  id: string;
  program_id: string;
  academic_year: string;
  semester: Semester;
  year_level: YearLevel;
  course_code: string;
  course_description: string;
  units: number;
  source_document: string;
}

export async function getCourseOfferings(supabase: SupabaseClient): Promise<{
  data: CourseOfferingRecord[] | null;
  error: Error | null;
}> {
  const { data, error } = await supabase
    .from("course_offerings")
    .select("id, program_id, academic_year, semester, year_level, course_code, course_description, units, source_document")
    .order("year_level", { ascending: true })
    .order("course_code", { ascending: true });

  if (error) {
    return { data: null, error: new Error(error.message) };
  }

  return { data: data as CourseOfferingRecord[], error: null };
}
