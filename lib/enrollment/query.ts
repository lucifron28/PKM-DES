import type { SupabaseClient } from "@supabase/supabase-js";
import { ENROLLMENT_REVIEW_STATUSES } from "@/lib/constants/enrollment";
import { ACADEMIC_YEAR_OPTIONS, PROGRAM, SEMESTERS, YEAR_LEVELS } from "@/lib/constants/pkm";
import type { EnrollmentReviewStatus, Semester, YearLevel } from "@/types/database";

export type ProgramOption = {
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
  search?: string;
};

function applyEnrollmentFilters<T>(
  query: T,
  selectedProgram: ProgramOption | null,
  params: FetchEnrollmentsParams
): T {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let q = query as any;

  if (selectedProgram && selectedProgram.id !== PROGRAM.code) {
    q = q.eq("program_id", selectedProgram.id);
  }

  if (params.academic_year && ACADEMIC_YEAR_OPTIONS.includes(params.academic_year)) {
    q = q.eq("academic_year", params.academic_year);
  }

  if (params.year_level && YEAR_LEVELS.includes(params.year_level)) {
    q = q.eq("year_level", params.year_level);
  }

  if (params.semester && SEMESTERS.includes(params.semester)) {
    q = q.eq("semester", params.semester);
  }

  if (params.status && ENROLLMENT_REVIEW_STATUSES.includes(params.status)) {
    q = q.eq("status", params.status);
  }

  return q as T;
}

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
    ? programOptions.find((program) => program.id === params.program || program.code === params.program) || null
    : null;

  const baseQuery = supabase
    .from("enrollments")
    .select("*, students(*, profiles(*)), programs(*)")
    .order("submitted_at", { ascending: false });

  const query = applyEnrollmentFilters(baseQuery, selectedProgram, params);

  const { data } = await query;
  let enrollments = data || [];

  if (params.search) {
    const term = params.search.toLowerCase();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    enrollments = enrollments.filter((e: any) => {
      const studentId = e.students?.student_id_number?.toLowerCase() || "";
      const firstName = e.students?.profiles?.first_name?.toLowerCase() || "";
      const lastName = e.students?.profiles?.last_name?.toLowerCase() || "";
      const fullName = `${firstName} ${lastName}`;
      return studentId.includes(term) || firstName.includes(term) || lastName.includes(term) || fullName.includes(term);
    });
  }

  return {
    programOptions,
    selectedProgram,
    enrollments
  };
}
