import { EmptyState } from "@/components/ui/empty-state";
import { SubjectReferenceBrowser, type DBOfferingRow } from "@/components/student/subject-reference-browser";
import { getStudentQueryResult, requireRole } from "@/lib/auth/session";
import type { SubjectSeed } from "@/lib/constants/subjects";
import type { Program, Semester, YearLevel } from "@/types/database";

type RawOfferingQueryRow = {
  id: string;
  program_id: string;
  academic_year: string;
  semester: Semester;
  year_level: YearLevel;
  course_code: string;
  course_description: string;
  units: number;
  source_document: string;
  programs?: { code: string } | { code: string }[] | null;
};

type RawSubjectQueryRow = {
  id: string;
  program_id: string;
  course_code: string;
  course_description: string;
  units: number;
  year_level: YearLevel;
  semester: Semester;
  programs?: { code: string } | { code: string }[] | null;
};

export default async function SubjectListPage() {
  const { supabase, profile } = await requireRole("student");
  const studentResult = await getStudentQueryResult(profile.id);

  if (studentResult.status === "query_failed") {
    return (
      <EmptyState
        title="Student record could not be loaded."
        description="A database query error occurred. Please refresh or try again later."
      />
    );
  }

  if (studentResult.status === "not_found") {
    return <EmptyState title="Student record not found" description="Please contact the Registrar." />;
  }

  const student = studentResult.student;

  const [programsResult, offeringsResult, curriculumResult] = await Promise.all([
    supabase
      .from("programs")
      .select("id, name, code")
      .order("code", { ascending: true }),
    supabase
      .from("course_offerings")
      .select("id, program_id, academic_year, semester, year_level, course_code, course_description, units, source_document, programs(code)")
      .order("year_level", { ascending: true })
      .order("course_code", { ascending: true }),
    supabase
      .from("subjects")
      .select("id, program_id, course_code, course_description, units, year_level, semester, programs(code)")
      .order("year_level", { ascending: true })
      .order("semester", { ascending: true })
      .order("course_code", { ascending: true })
  ]);

  if (programsResult.error) {
    console.error("subject_list:programs_load_failed", programsResult.error);
    return (
      <EmptyState
        title="Subject list information could not be loaded."
        description="Please try again. If this problem persists, contact the Registrar."
      />
    );
  }

  const programs = (programsResult.data as Array<Pick<Program, "id" | "name" | "code">> | null) ?? [];
  const rawOfferings = (offeringsResult.data as unknown as RawOfferingQueryRow[] | null) ?? [];
  const rawSubjects = (curriculumResult.data as unknown as RawSubjectQueryRow[] | null) ?? [];

  const historicalOfferings: DBOfferingRow[] = rawOfferings.map((row) => {
    const progCode = Array.isArray(row.programs) ? row.programs[0]?.code : row.programs?.code;
    return {
      id: row.id,
      program_id: row.program_id,
      program_code: progCode ?? "",
      academic_year: row.academic_year,
      semester: row.semester,
      year_level: row.year_level,
      course_code: row.course_code,
      course_description: row.course_description,
      units: row.units,
      source_document: row.source_document
    };
  });

  const curriculumSubjects: SubjectSeed[] = rawSubjects
    .filter((row) => {
      const progCode = Array.isArray(row.programs) ? row.programs[0]?.code : row.programs?.code;
      return progCode === "BSAIS";
    })
    .map((row) => ({
      course_code: row.course_code,
      course_description: row.course_description,
      units: row.units,
      year_level: row.year_level,
      semester: row.semester
    }));

  const studentProgram = student.programs;
  const studentProgramCode = studentProgram?.code ?? null;
  const studentProgramName = studentProgram?.name ?? "Unassigned Program";

  return (
    <SubjectReferenceBrowser
      studentProgramCode={studentProgramCode}
      studentProgramName={studentProgramName}
      programs={programs}
      historicalOfferings={historicalOfferings}
      curriculumSubjects={curriculumSubjects}
      historicalOfferingsError={Boolean(offeringsResult.error)}
      curriculumSubjectsError={Boolean(curriculumResult.error)}
    />
  );
}
