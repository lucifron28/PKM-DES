import { Badge, enrollmentBadgeTone } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { getStudentForProfile, requireRole } from "@/lib/auth/session";
import { formatDate } from "@/lib/utils/format";
import type { Enrollment, EnrollmentStatus } from "@/types/database";

type LatestEnrollment = Pick<
  Enrollment,
  "academic_year" | "semester" | "status" | "submitted_at" | "reviewed_at" | "remarks"
>;

function getDisplayedStatus(latestEnrollment: LatestEnrollment | null, fallbackStatus: EnrollmentStatus) {
  if (!latestEnrollment) {
    return fallbackStatus;
  }

  if (latestEnrollment.status === "APPROVED") {
    return "ENROLLED";
  }

  return latestEnrollment.status;
}

export default async function EnrollmentStatusPage() {
  const { supabase, profile } = await requireRole("student");
  const student = await getStudentForProfile(profile.id);

  if (!student) {
    return <EmptyState title="Student record not found." description="Please contact an administrator." />;
  }

  const { data } = await supabase
    .from("enrollments")
    .select("academic_year, semester, status, submitted_at, reviewed_at, remarks")
    .eq("student_id", student.id)
    .order("submitted_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const latestEnrollment = (data as LatestEnrollment | null) ?? null;
  const status = getDisplayedStatus(latestEnrollment, student.enrollment_status);

  return (
    <Card>
      <CardHeader
        title="Enrollment Status Result"
        description={
          latestEnrollment
            ? `${latestEnrollment.academic_year} - ${latestEnrollment.semester}`
            : "Your latest enrollment status is shown below."
        }
      />
      <div className="rounded-lg bg-slateui-surfaceAlt p-5">
        <Badge tone={enrollmentBadgeTone(status)}>{status}</Badge>
        {status === "PENDING" ? (
          <div className="mt-4 space-y-2">
            <p className="text-base font-semibold text-slateui-text">
              Your enrollment request has been submitted and is pending approval.
            </p>
            <p className="text-sm text-slateui-secondary">
              Submitted: {formatDate(latestEnrollment?.submitted_at)}
            </p>
          </div>
        ) : status === "ENROLLED" ? (
          <div className="mt-4 space-y-2">
            <p className="text-base font-semibold text-slateui-text">Congratulations! You are now officially enrolled.</p>
            <p className="text-sm text-slateui-secondary">Please print your draft registration form.</p>
          </div>
        ) : status === "REJECTED" ? (
          <div className="mt-4 space-y-2">
            <p className="text-base font-semibold text-slateui-text">
              Your enrollment request was not approved.
            </p>
            <p className="text-sm text-slateui-secondary">
              {latestEnrollment?.remarks
                ? `Remarks: ${latestEnrollment.remarks}`
                : "Please contact the Registrar for details."}
            </p>
            <p className="text-sm text-slateui-secondary">
              Reviewed: {formatDate(latestEnrollment?.reviewed_at)}
            </p>
          </div>
        ) : (
          <p className="mt-4 text-base font-semibold text-slateui-text">
            No active enrollment request is recorded for your account.
          </p>
        )}
      </div>
      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <ButtonLink href="/student/cor" variant="secondary">Print Registration Form</ButtonLink>
        <ButtonLink href="/student/grades" variant="outline">View Grades</ButtonLink>
        <ButtonLink href="/student/schedule" variant="outline">View Class Schedule</ButtonLink>
        <ButtonLink href="/student/balances" variant="outline">View Balances</ButtonLink>
      </div>
    </Card>
  );
}
