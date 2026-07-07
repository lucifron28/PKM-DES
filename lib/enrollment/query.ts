import type { SupabaseClient } from "@supabase/supabase-js";
import { ENROLLMENT_REVIEW_STATUSES } from "@/lib/constants/enrollment";
import { ACADEMIC_YEAR_OPTIONS, PROGRAM, SEMESTERS, YEAR_LEVELS } from "@/lib/constants/pkm";
import type { EnrollmentReviewStatus, Semester, YearLevel } from "@/types/database";

type ProgramOption = {
  id: string;
  name: string;
  code: string | null;
};

export type FetchEnrollmentsParams = {
  program?: string;
  academic_year?: string;
  year_level?: YearLevel;
  semester?: Semester;
  status?: EnrollmentReviewStatus;
};

export async function fetchEnrollmentFilterData(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any, any, any>,
  params: FetchEnrollmentsParams
) {
  const { data: programsData } = await supabase
    .from("programs")
    .select("id, name, code")
    .order("name")
    .returns<ProgramOption[]>();

  const programOptions: ProgramOption[] = programsData?.length
    ? programsData
    : [{ id: PROGRAM.code, name: PROGRAM.name, code: PROGRAM.code }];

  const selectedProgram = params.program
    ? programOptions.find((program) => program.id === params.program || program.code === params.program)
    : null;

  let query = supabase
    .from("enrollments")
    .select("*, students(*, profiles(*)), programs(*)")
    .order("submitted_at", { ascending: false });

  if (selectedProgram && selectedProgram.id !== PROGRAM.code) {
    query = query.eq("program_id", selectedProgram.id);
  }

  if (params.academic_year && ACADEMIC_YEAR_OPTIONS.includes(params.academic_year)) {
    query = query.eq("academic_year", params.academic_year);
  }

  if (params.year_level && YEAR_LEVELS.includes(params.year_level)) {
    query = query.eq("year_level", params.year_level);
  }

  if (params.semester && SEMESTERS.includes(params.semester)) {
    query = query.eq("semester", params.semester);
  }

  if (params.status && ENROLLMENT_REVIEW_STATUSES.includes(params.status)) {
    query = query.eq("status", params.status);
  }

  const { data } = await query;
  return {
    programOptions,
    selectedProgram,
    enrollments: data || []
  };
}
