import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RegistrationForm, type PrintableEnrollment } from "@/components/print/registration-form";
import { retryEnrollmentDecisionEmailAction } from "@/app/admin/enrollments/actions";
import { requireRole } from "@/lib/auth/session";
import type { EnrollmentDecisionNotification } from "@/types/database";

export default async function AdminRegistrationFormPage({
  params,
  searchParams
}: {
  params: Promise<{ enrollmentId: string }>;
  searchParams?: Promise<{ email?: string }>;
}) {
  const { supabase } = await requireRole("admin");
  const { enrollmentId } = await params;

  const { data, error } = await supabase
    .from("enrollments")
    .select("*, students(*, profiles(*), official_student_records(*)), programs(*), enrollment_subjects(id, subject_id, course_offering_id, course_code, course_description, units, subjects(*), course_offerings(*))")
    .eq("id", enrollmentId)
    .maybeSingle();

  const emailParams = (await searchParams) ?? {};

  if (error) {
    console.error("registration_form:admin_enrollment_load");
    return (
      <EmptyState
        title="Registration form could not be loaded"
        description="Please try again. No registration form is shown until the selected enrollment data is available."
      />
    );
  }

  const enrollment = data as PrintableEnrollment | null;

  if (!enrollment) {
    return <EmptyState title="Enrollment record not found." description="The selected registration form is not available." />;
  }

  const { data: notificationData, error: notificationError } = await supabase
    .from("enrollment_decision_notifications")
    .select("id, enrollment_id, decision, recipient_email, academic_year, semester, status, attempt_count, last_error_code, reserved_at, sent_at, created_at, updated_at")
    .eq("enrollment_id", enrollmentId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (notificationError) console.error("registration_form:notification_load");

  const notification = notificationData as EnrollmentDecisionNotification | null;
  const emailMessage = emailParams.email === "sent"
    ? "The student notification was sent to the configured email provider."
    : emailParams.email === "not_configured"
      ? "The enrollment decision was saved, but email delivery is not configured."
      : emailParams.email === "failed"
        ? "The enrollment decision was saved, but the student notification could not be sent."
        : null;

  return (
    <div className="space-y-4">
      {emailMessage ? (
        <div
          role={emailParams.email === "sent" ? "status" : "alert"}
          aria-live={emailParams.email === "sent" ? "polite" : undefined}
          className={`print-hidden rounded-lg border px-4 py-3 text-sm font-medium ${emailParams.email === "sent" ? "border-sky-200 bg-sky-50 text-sky-800" : "border-amber-200 bg-amber-50 text-amber-900"}`}
        >
          {emailMessage}
        </div>
      ) : null}

      {notification ? (
        <section className="print-hidden rounded-lg border border-slateui-border bg-white p-4 shadow-sm" aria-labelledby="notification-status-heading">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 id="notification-status-heading" className="font-bold text-slateui-text">Student notification</h2>
              <p className="mt-1 text-sm text-slateui-muted">Email delivery is separate from the Registrar decision.</p>
            </div>
            <Badge tone={notification.status === "SENT" ? "success" : notification.status === "FAILED" ? "error" : "warning"}>
              {notification.status}
            </Badge>
          </div>
          {notification.status === "FAILED" ? (
            <form action={retryEnrollmentDecisionEmailAction} className="mt-3">
              <input type="hidden" name="enrollment_id" value={enrollmentId} />
              <input type="hidden" name="decision" value={notification.decision} />
              <Button type="submit" variant="outline">Retry student notification</Button>
            </form>
          ) : null}
        </section>
      ) : null}

      <RegistrationForm enrollment={enrollment} />
    </div>
  );
}
