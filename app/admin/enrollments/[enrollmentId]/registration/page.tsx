import { EmptyState } from "@/components/ui/empty-state";
import { RegistrationForm, type PrintableEnrollment } from "@/components/print/registration-form";
import { requireRole } from "@/lib/auth/session";

export default async function AdminRegistrationFormPage({
  params
}: {
  params: Promise<{ enrollmentId: string }>;
}) {
  const { supabase } = await requireRole("admin");
  const { enrollmentId } = await params;

  const { data } = await supabase
    .from("enrollments")
    .select("*, students(*, profiles(*)), programs(*), enrollment_subjects(id, subjects(*))")
    .eq("id", enrollmentId)
    .maybeSingle();

  const enrollment = data as PrintableEnrollment | null;

  if (!enrollment) {
    return <EmptyState title="Enrollment record not found." description="The selected registration form is not available." />;
  }

  return <RegistrationForm enrollment={enrollment} />;
}
