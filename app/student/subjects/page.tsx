import { EmptyState } from "@/components/ui/empty-state";
import { SubjectReferenceBrowser } from "@/components/student/subject-reference-browser";
import { getStudentForProfile, requireRole } from "@/lib/auth/session";
import { AIS_SUBJECTS } from "@/lib/constants/subjects";
import { SECOND_SEMESTER_AY_2025_2026_OFFERINGS_BY_PROGRAM } from "@/lib/constants/course-offerings";

export default async function SubjectListPage() {
  const { profile } = await requireRole("student");
  const student = await getStudentForProfile(profile.id);

  if (!student) {
    return <EmptyState title="Student record not found" description="Please contact the Registrar." />;
  }

  const program = student.programs;

  if (!program?.code) {
    return (
      <EmptyState
        title="Program information is unavailable"
        description="Please contact the Registrar before viewing the subject reference."
      />
    );
  }

  const programOfferings = SECOND_SEMESTER_AY_2025_2026_OFFERINGS_BY_PROGRAM[program.code] ?? [];

  return (
    <SubjectReferenceBrowser
      programCode={program.code}
      programName={program.name}
      historicalOfferings={programOfferings}
      curriculumSubjects={program.code === "BSAIS" ? AIS_SUBJECTS : []}
    />
  );
}
