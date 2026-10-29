import { ButtonLink } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { RegistrarIrregularLoadForm } from "@/components/admin/registrar-irregular-load-form";
import { requireRegistrarAdmin } from "@/lib/auth/session";
import { getActiveEnrollmentTermResult } from "@/lib/enrollment/term-authority";
import { requiresRegistrarAssignedLoad } from "@/lib/enrollment/registrar-load";
import type { CourseOffering, Profile, StandardLoadSet, Student, StudentType } from "@/types/database";

type StudentOption = Pick<Student, "id" | "student_id_number" | "program_id" | "year_level" | "student_type"> & {
  profiles?: Pick<Profile, "first_name" | "last_name"> | null;
  programs?: { name: string; code: string | null } | null;
};

const ERROR_MESSAGES: Record<string, string> = {
  duplicate: "This student already has an enrollment record for the active term.",
  invalid_request: "Choose one student and at least one unique course offering.",
  invalid_enrollment_load: "The selected load has duplicate course codes or invalid/bounded units.",
  standard_load_available: "This student has a complete standard load. They should submit enrollment from their student account.",
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
      .order("student_id_number", { ascending: true })
      .limit(1000)
  ]);
  const params = (await searchParams) ?? {};

  if (!activeTermResult.ok || !activeTermResult.term) {
    return <EmptyState title="Active enrollment term unavailable" description="Configure an active term before creating a Registrar-managed load." action={<ButtonLink href="/admin/enrollments">Back to Enrollments</ButtonLink>} />;
  }
  if (studentsResult.error) {
    console.error("registrar_load:student_list");
    return <EmptyState title="Students could not be loaded" description="Refresh the page or try again later." action={<ButtonLink href="/admin/enrollments">Back to Enrollments</ButtonLink>} />;
  }

  const { academicYear, semester } = activeTermResult.term;
  const [offeringsResult, standardLoadsResult] = await Promise.all([
    supabase
      .from("course_offerings")
      .select("id, program_id, academic_year, semester, year_level, course_code, course_description, units, source_document, created_at, updated_at")
      .eq("academic_year", academicYear)
      .eq("semester", semester)
      .order("course_code", { ascending: true }),
    supabase
      .from("standard_load_sets")
      .select("id, program_id, academic_year, semester, year_level, status, expected_course_count, expected_total_units, source_document, created_at, updated_at")
      .eq("academic_year", academicYear)
      .eq("semester", semester)
  ]);
  if (offeringsResult.error || standardLoadsResult.error) {
    console.error("registrar_load:course_configuration");
    return <EmptyState title="Course-load configuration could not be checked" description="No Registrar-managed enrollment can be created until the active term’s course configuration is available." action={<ButtonLink href="/admin/enrollments">Back to Enrollments</ButtonLink>} />;
  }

  const offerings = (offeringsResult.data as CourseOffering[] | null) ?? [];
  const standardLoads = (standardLoadsResult.data as StandardLoadSet[] | null) ?? [];
  const students = ((studentsResult.data ?? []) as unknown as StudentOption[]).filter((student) => {
    const loadSet = standardLoads.find((item) =>
      item.program_id === student.program_id && item.year_level === student.year_level
    ) ?? null;
    const standardLoadOfferings = loadSet
      ? offerings.filter((item) => item.program_id === student.program_id
        && item.year_level === student.year_level
        && item.source_document === loadSet.source_document)
      : [];
    return requiresRegistrarAssignedLoad(student.student_type as StudentType, loadSet, standardLoadOfferings);
  });

  const errorMessage = ERROR_MESSAGES[params.error ?? ""] ?? null;
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slateui-text">Create Registrar-managed enrollment</h1>
          <p className="mt-1 text-sm text-slateui-secondary">Use this when a student needs an assigned subject load because no complete standard load is available.</p>
        </div>
        <ButtonLink href="/admin/enrollments" variant="outline">Back to Enrollments</ButtonLink>
      </div>
      <Card>
        <CardHeader title="Registrar-managed subject assignment" description="Select only existing offerings for the student’s program and active term. The saved year level and classification stay unchanged." />
        {students.length ? (
          <div className="p-5">
            <RegistrarIrregularLoadForm
              students={students.map((row) => ({
                ...row,
                profiles: Array.isArray(row.profiles) ? row.profiles[0] ?? null : row.profiles,
                programs: Array.isArray(row.programs) ? row.programs[0] ?? null : row.programs
              }))}
              offerings={offerings}
              academicYear={academicYear}
              semester={semester}
              errorMessage={errorMessage}
            />
          </div>
        ) : (
          <div className="p-5"><EmptyState title="No students need Registrar assignment" description="Students with a complete standard load should submit enrollment from their student account." /></div>
        )}
      </Card>
    </div>
  );
}
