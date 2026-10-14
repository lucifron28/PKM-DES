import { ButtonLink } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { RegistrarIrregularLoadForm } from "@/components/admin/registrar-irregular-load-form";
import { requireRegistrarAdmin } from "@/lib/auth/session";
import { getActiveEnrollmentTermResult } from "@/lib/enrollment/term-authority";
import type { CourseOffering, Profile, Student } from "@/types/database";

type StudentOption = Pick<Student, "id" | "student_id_number" | "program_id" | "year_level"> & {
  profiles?: Pick<Profile, "first_name" | "last_name"> | null;
  programs?: { name: string; code: string | null } | null;
};

const ERROR_MESSAGES: Record<string, string> = {
  duplicate: "This student already has an enrollment record for the active term.",
  invalid_request: "Choose one student and at least one unique course offering.",
  invalid_enrollment_load: "The selected load has duplicate course codes or invalid/bounded units.",
  term_unavailable: "There is no active enrollment term configured.",
  unauthorized: "Registrar access is required to create this enrollment.",
  load_failed: "The pending enrollment could not be created. Check the selected student and course offerings, then try again."
};

export default async function RegistrarIrregularEnrollmentLoadPage({
  searchParams
}: {
  searchParams?: Promise<{ error?: string }>;
}) {
  const { supabase } = await requireRegistrarAdmin();
  const [activeTermResult, studentsResult] = await Promise.all([
    getActiveEnrollmentTermResult(supabase),
    supabase
      .from("students")
      .select("id, student_id_number, program_id, year_level, student_type, profiles(first_name, last_name), programs(name, code)")
      .eq("student_type", "Irregular Student")
      .order("student_id_number", { ascending: true })
  ]);
  const params = (await searchParams) ?? {};

  if (!activeTermResult.ok || !activeTermResult.term) {
    return <EmptyState title="Active enrollment term unavailable" description="Configure an active term before creating a Registrar-managed load." action={<ButtonLink href="/admin/enrollments">Back to Enrollments</ButtonLink>} />;
  }
  if (studentsResult.error) {
    console.error("registrar_load:student_list");
    return <EmptyState title="Irregular students could not be loaded" description="Refresh the page or try again later." action={<ButtonLink href="/admin/enrollments">Back to Enrollments</ButtonLink>} />;
  }

  const { academicYear, semester } = activeTermResult.term;
  const { data: offeringsData, error: offeringsError } = await supabase
    .from("course_offerings")
    .select("id, program_id, academic_year, semester, year_level, course_code, course_description, units, source_document, created_at, updated_at")
    .eq("academic_year", academicYear)
    .eq("semester", semester)
    .order("course_code", { ascending: true });
  if (offeringsError) console.error("registrar_load:course_offerings");

  const errorMessage = ERROR_MESSAGES[params.error ?? ""] ?? null;
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slateui-text">Create irregular-student enrollment</h1>
          <p className="mt-1 text-sm text-slateui-secondary">Create a PENDING enrollment that enters the existing review, clearance, and approval process.</p>
        </div>
        <ButtonLink href="/admin/enrollments" variant="outline">Back to Enrollments</ButtonLink>
      </div>
      <Card>
        <CardHeader title="Registrar-managed initial load" description="The Registrar selects from configured course offerings. The student and any older enrollment history remain unchanged." />
        {offeringsError ? (
          <div className="p-5"><EmptyState title="Course offerings could not be loaded" description="No enrollment can be created until the active term offerings are available." /></div>
        ) : studentsResult.data?.length ? (
          <div className="p-5">
            <RegistrarIrregularLoadForm
              students={(studentsResult.data ?? []).map((row) => ({
                ...row,
                profiles: Array.isArray(row.profiles) ? row.profiles[0] ?? null : row.profiles,
                programs: Array.isArray(row.programs) ? row.programs[0] ?? null : row.programs
              })) as StudentOption[]}
              offerings={(offeringsData as CourseOffering[] | null) ?? []}
              academicYear={academicYear}
              semester={semester}
              errorMessage={errorMessage}
            />
          </div>
        ) : (
          <div className="p-5"><EmptyState title="No irregular students found" description="The student must first have a linked student account and an Irregular Student classification." /></div>
        )}
      </Card>
    </div>
  );
}
