import type { SupabaseClient } from "@supabase/supabase-js";
import type { CourseOffering, StandardLoadSet, Student } from "@/types/database";
import type { ActiveEnrollmentTerm } from "@/lib/enrollment/term-authority";

export type StandardLoadAvailability =
  | "configured_complete"
  | "not_configured"
  | "incomplete"
  | "query_failed";

export type StandardLoadQueryResult =
  | {
      status: "configured_complete";
      loadSet: StandardLoadSet;
      offerings: CourseOffering[];
    }
  | {
      status: "not_configured";
      loadSet: null;
      offerings: [];
    }
  | {
      status: "incomplete";
      loadSet: StandardLoadSet;
      offerings: CourseOffering[];
    }
  | {
      status: "query_failed";
      loadSet: null;
      offerings: [];
    };

function isCompleteLoad(loadSet: StandardLoadSet, offerings: CourseOffering[]) {
  const totalUnits = offerings.reduce((total, offering) => total + offering.units, 0);
  return (
    loadSet.status === "ACTIVE" &&
    loadSet.expected_course_count > 0 &&
    offerings.length === loadSet.expected_course_count &&
    totalUnits === loadSet.expected_total_units
  );
}

export async function getStandardLoadForStudent(
  supabase: SupabaseClient,
  student: Pick<Student, "program_id" | "year_level">,
  activeTerm: Pick<ActiveEnrollmentTerm, "academicYear" | "semester">
): Promise<StandardLoadQueryResult> {
  const { data: loadSetData, error: loadSetError } = await supabase
    .from("standard_load_sets")
    .select(
      "id, program_id, academic_year, semester, year_level, status, expected_course_count, expected_total_units, source_document, created_at, updated_at, programs(*)"
    )
    .eq("program_id", student.program_id)
    .eq("academic_year", activeTerm.academicYear)
    .eq("semester", activeTerm.semester)
    .eq("year_level", student.year_level)
    .maybeSingle();

  if (loadSetError) {
    console.error("standard_load:load_set_query_failed", { stage: "load_set" });
    return { status: "query_failed", loadSet: null, offerings: [] };
  }

  if (!loadSetData) {
    return { status: "not_configured", loadSet: null, offerings: [] };
  }

  const loadSet = loadSetData as unknown as StandardLoadSet;

  const { data: offeringsData, error: offeringsError } = await supabase
    .from("course_offerings")
    .select(
      "id, program_id, academic_year, semester, year_level, course_code, course_description, units, source_document, created_at, updated_at, programs(*)"
    )
    .eq("program_id", student.program_id)
    .eq("academic_year", activeTerm.academicYear)
    .eq("semester", activeTerm.semester)
    .eq("year_level", student.year_level)
    .eq("source_document", loadSet.source_document)
    .order("course_code", { ascending: true })
    .order("id", { ascending: true });

  if (offeringsError) {
    console.error("standard_load:offerings_query_failed", { stage: "offerings" });
    return { status: "query_failed", loadSet: null, offerings: [] };
  }

  const offerings = (offeringsData as unknown as CourseOffering[] | null) ?? [];
  return isCompleteLoad(loadSet, offerings)
    ? { status: "configured_complete", loadSet, offerings }
    : { status: "incomplete", loadSet, offerings };
}
