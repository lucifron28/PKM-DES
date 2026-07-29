import { Badge, enrollmentBadgeTone } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { getStudentForProfile, requireRole } from "@/lib/auth/session";
import { getDisplayedEnrollmentStatus } from "@/lib/enrollment/display-status";
import { formatDate } from "@/lib/utils/format";
import type { Enrollment } from "@/types/database";
import { ENABLE_STUB_PAGES } from "@/lib/constants/navigation";

type LatestEnrollment = Pick<
  Enrollment,
  "academic_year" | "semester" | "status" | "submitted_at" | "reviewed_at" | "remarks"
>;

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
  const status = getDisplayedEnrollmentStatus(latestEnrollment?.status ?? null, student.enrollment_status);
  const statusPanelClass = status === "ENROLLED"
    ? "border-green-600 bg-green-50"
    : status === "PENDING"
      ? "border-amber-500 bg-amber-50"
      : status === "REJECTED"
        ? "border-red-600 bg-red-50"
        : "border-primary-800 bg-primary-50";

  const actions = status === "ENROLLED"
    ? [["/student/cor", "Print Draft Registration Form", "secondary"], ["/student/subjects", "View Subject List", "outline"], ["/student/account", "Account", "outline"]]
    : status === "NOT ENROLLED"
      ? [["/student/enrollment", "Online Enrollment", "primary"], ["/student/subjects", "View Subject List", "outline"], ["/student/account", "Account", "outline"]]
      : [["/student/subjects", "View Subject List", "outline"], ["/student/account", "Account", "outline"]];

  return (
    <Card className="border-t-4 border-t-primary-800">
      <CardHeader
        title="Enrollment Status Result"
        description={
          latestEnrollment
            ? `${latestEnrollment.academic_year} - ${latestEnrollment.semester}`
            : "Your latest enrollment status is shown below."
        }
      />
      <div className={`border-l-4 p-5 ${statusPanelClass}`}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-bold text-slateui-text">Current enrollment result</p>
            <p className="mt-1 text-sm leading-6 text-slateui-secondary">{latestEnrollment ? "Your most recently submitted enrollment request." : "No enrollment request is currently recorded."}</p>
          </div>
          <Badge tone={enrollmentBadgeTone(status)}>{status}</Badge>
        </div>
        {status === "PENDING" ? (
          <div className="mt-4 space-y-2">
            <p className="text-base font-semibold text-slateui-text">
              Your enrollment request has been submitted and is pending approval.
            </p>
            <p className="text-sm leading-6 text-slateui-secondary">
              Submitted: {formatDate(latestEnrollment?.submitted_at)}
            </p>
          </div>
        ) : status === "ENROLLED" ? (
          <div className="mt-4 space-y-2">
            <p className="text-base font-semibold text-slateui-text">Congratulations! You are now officially enrolled.</p>
            <p className="text-sm leading-6 text-slateui-secondary">Please print your draft registration form.</p>
          </div>
        ) : status === "REJECTED" ? (
          <div className="mt-4 space-y-2">
            <p className="text-base font-semibold text-slateui-text">
              Your enrollment request was not approved.
            </p>
            <p className="text-sm leading-6 text-slateui-secondary">
              {latestEnrollment?.remarks
                ? `Remarks: ${latestEnrollment.remarks}`
                : "Please contact the Registrar for details."}
            </p>
            <p className="text-sm leading-6 text-slateui-secondary">
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
        {actions.map(([href, label, variant]) => <ButtonLink key={href} href={href} variant={variant as "primary" | "secondary" | "outline"} className="w-full">{label}</ButtonLink>)}
        {ENABLE_STUB_PAGES ? <><ButtonLink href="/student/grades" variant="outline" className="w-full">View Grades</ButtonLink><ButtonLink href="/student/schedule" variant="outline" className="w-full">View Class Schedule</ButtonLink><ButtonLink href="/student/balances" variant="outline" className="w-full">View Balances</ButtonLink></> : null}
      </div>
    </Card>
  );
}
