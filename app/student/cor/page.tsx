import { EmptyState } from "@/components/ui/empty-state";
import { RegistrationForm, type PrintableEnrollment } from "@/components/print/registration-form";
import { getStudentForProfile, requireRole } from "@/lib/auth/session";

export default async function StudentRegistrationFormPage() {
  const { supabase, profile } = await requireRole("student");
  const student = await getStudentForProfile(profile.id);

  if (!student) {
    return <EmptyState title="Student record not found." description="Please contact an administrator." />;
  }

  const { data } = await supabase
    .from("enrollments")
    .select("*, students(*, profiles(*)), programs(*), enrollment_subjects(id, subjects(*))")
    .eq("student_id", student.id)
    .order("submitted_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const enrollment = data as PrintableEnrollment | null;

  if (!enrollment) {
    return (
      <EmptyState
        title="No enrollment request found."
        description="Submit the Online Enrollment form before printing a registration form."
      />
    );
  }

  return <RegistrationForm enrollment={enrollment} />;
}
