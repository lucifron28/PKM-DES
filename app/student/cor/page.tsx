import { EmptyState } from "@/components/ui/empty-state";
import { ButtonLink } from "@/components/ui/button";
import { RegistrationForm, type PrintableEnrollment } from "@/components/print/registration-form";
import { getStudentForProfile, requireRole } from "@/lib/auth/session";

export default async function StudentRegistrationFormPage() {
  const { supabase, profile } = await requireRole("student");
  const student = await getStudentForProfile(profile.id);

  if (!student) {
    return <EmptyState title="Student record not found." description="Please contact an administrator." />;
  }

  const { data, error } = await supabase
    .from("enrollments")
    .select("*, students(*, profiles(*)), programs(*), enrollment_subjects(id, subjects(*))")
    .eq("student_id", student.id)
    .order("submitted_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("registration_form:student_enrollment_load");
    return (
      <EmptyState
        title="Registration form could not be loaded"
        description="Please try again. No registration form is shown until the current enrollment data is available."
      />
    );
  }

  const enrollment = data as PrintableEnrollment | null;

  if (!enrollment) {
    return (
      <EmptyState
        title="No enrollment request found."
        description="Submit the Online Enrollment form before printing a registration form."
        action={<ButtonLink href="/student/enrollment">Online Enrollment</ButtonLink>}
      />
    );
  }

  if (enrollment.status === "PENDING") {
    return (
      <EmptyState
        title="Draft registration form is not available yet"
        description="Your enrollment request is still pending Registrar review."
        action={<ButtonLink href="/student/enrollment-status">View Enrollment Status</ButtonLink>}
      />
    );
  }

  if (enrollment.status === "REJECTED") {
    return (
      <EmptyState
        title="Draft registration form is not available"
        description="The latest enrollment request was not approved. Review the Registrar remarks on the Enrollment Status page."
        action={<ButtonLink href="/student/enrollment-status">View Enrollment Status</ButtonLink>}
      />
    );
  }

  return <RegistrationForm enrollment={enrollment} />;
}
