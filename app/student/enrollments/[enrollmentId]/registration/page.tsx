import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { RegistrationForm, type PrintableEnrollment } from "@/components/print/registration-form";
import { getStudentQueryResult, requireRole } from "@/lib/auth/session";

export default async function StudentExplicitRegistrationFormPage({
  params
}: {
  params: Promise<{ enrollmentId: string }>;
}) {
  const { supabase, profile } = await requireRole("student");
  const studentResult = await getStudentQueryResult(profile.id);
  const { enrollmentId } = await params;

  if (studentResult.status === "query_failed") {
    return (
      <EmptyState
        title="Student record could not be loaded."
        description="A database query error occurred. Please refresh or try again later."
      />
    );
  }

  if (studentResult.status === "not_found") {
    return <EmptyState title="Student record not found." description="Please contact an administrator." />;
  }

  const student = studentResult.student;

  const { data, error } = await supabase
    .from("enrollments")
    .select("*, students(*, profiles(*), official_student_records(*)), programs(*), enrollment_subjects(id, subjects(*))")
    .eq("id", enrollmentId)
    .maybeSingle();

  if (error) {
    console.error("registration_form:explicit_student_enrollment_load", error);
    return (
      <EmptyState
        title="Registration form could not be loaded"
        description="Please try again. No registration form is shown until the selected enrollment data is available."
      />
    );
  }

  const enrollment = data as PrintableEnrollment | null;

  if (!enrollment || enrollment.student_id !== student.id) {
    return (
      <EmptyState
        title="Registration form not found."
        description="The requested registration form is unavailable."
      />
    );
  }

  if (enrollment.status !== "APPROVED") {
    return (
      <EmptyState
        title="Registration form unavailable"
        description="Only approved enrollment requests can be printed as a draft registration form."
        action={<ButtonLink href="/student/enrollment-status">View Enrollment Status</ButtonLink>}
      />
    );
  }

  return <RegistrationForm enrollment={enrollment} />;
}
