import { BookOpen, ClipboardCheck, FileText, UserCircle } from "lucide-react";
import { Badge, enrollmentBadgeTone } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { StatCard } from "@/components/ui/stat-card";
import { getStudentQueryResult, requireRole } from "@/lib/auth/session";
import { getDisplayedEnrollmentStatus, separateEnrollmentsByTerm } from "@/lib/enrollment/display-status";
import { getActiveEnrollmentTermResult } from "@/lib/enrollment/term-authority";
import { formatDate, formatName } from "@/lib/utils/format";
import type { EnrollmentReviewStatus } from "@/types/database";
import { ENABLE_STUB_PAGES } from "@/lib/constants/navigation";

type DashboardEnrollment = {
  id: string;
  status: EnrollmentReviewStatus;
  academic_year: string;
  semester: string;
  submitted_at: string;
};

export default async function StudentDashboardPage() {
  const { profile, supabase } = await requireRole("student");
  const studentResult = await getStudentQueryResult(profile.id);

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

  const [activeTermResult, enrollmentsResponse] = await Promise.all([
    getActiveEnrollmentTermResult(supabase),
    supabase
      .from("enrollments")
      .select("id, status, academic_year, semester, submitted_at")
      .eq("student_id", student.id)
      .order("submitted_at", { ascending: false })
  ]);

  // Fail closed: active term query failure renders distinct error, never NOT ENROLLED.
  if (!activeTermResult.ok) {
    return (
      <EmptyState
        title="Current academic term information could not be loaded."
        description="Please try again. Dashboard information is unavailable until the active term can be determined."
      />
    );
  }

  // Fail closed: enrollment query failure renders distinct error, never NOT ENROLLED.
  if (enrollmentsResponse.error) {
    console.error("student_dashboard:enrollments_load", enrollmentsResponse.error);
    return (
      <EmptyState
        title="Enrollment records could not be loaded."
        description="A database query error occurred. Please refresh or try again later."
      />
    );
  }

  const activeTerm = activeTermResult.term;
  const allEnrollments = (enrollmentsResponse.data as DashboardEnrollment[] | null) ?? [];

  const { currentTermEnrollment, historicalEnrollments } = separateEnrollmentsByTerm(
    allEnrollments,
    activeTerm
  );

  const status = getDisplayedEnrollmentStatus(currentTermEnrollment?.status ?? null);

  const primaryAction = status === "ENROLLED"
    ? { href: "/student/cor", label: "Print Draft Registration Form", icon: FileText, variant: "secondary" as const }
    : status === "PENDING" || status === "REJECTED"
      ? { href: "/student/enrollment-status", label: "View Enrollment Status", icon: ClipboardCheck, variant: "primary" as const }
      : { href: "/student/enrollment", label: "Start Online Enrollment", icon: ClipboardCheck, variant: "primary" as const };
  const PrimaryIcon = primaryAction.icon;

  return (
    <div className="space-y-6">
      <div className="grid gap-5 border-b border-slateui-border pb-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
        <div className="border-l-4 border-secondary-600 pl-4">
          <h2 className="text-xl font-bold text-slateui-text sm:text-2xl">
            Welcome, {formatName(profile.first_name, profile.last_name)}!
          </h2>
          <p className="mt-1 text-sm leading-6 text-slateui-muted">
            {activeTerm ? `Current Academic Term: ${activeTerm.label}` : "No active academic term configured."}
          </p>
        </div>
        <ButtonLink href={primaryAction.href} variant={primaryAction.variant} className="w-full lg:w-auto">
          <PrimaryIcon className="h-4 w-4" aria-hidden="true" />
          {primaryAction.label}
        </ButtonLink>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <StatCard
          label="Current Term Status"
          value={<Badge tone={enrollmentBadgeTone(status)}>{status}</Badge>}
          helper={
            activeTerm
              ? currentTermEnrollment
                ? `${currentTermEnrollment.academic_year} | ${currentTermEnrollment.semester}`
                : `No request submitted for ${activeTerm.label}`
              : "No active enrollment term configured."
          }
          icon={<ClipboardCheck className="h-5 w-5" />}
          tone={status === "ENROLLED" ? "success" : status === "PENDING" ? "warning" : status === "REJECTED" ? "danger" : "default"}
        />
        <StatCard
          label="Student ID"
          value={student.student_id_number ?? "Not provided"}
          helper={`${student.programs?.name ?? "Program unavailable"} | ${student.year_level}`}
          icon={<UserCircle className="h-5 w-5" />}
        />
        <StatCard
          label="Student Type"
          value={<span className="text-xl sm:text-2xl">{student.student_type}</span>}
          helper="Classification recorded by the Registrar."
          icon={<BookOpen className="h-5 w-5" />}
          tone="info"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <Card className="border-t-4 border-t-primary-800">
          <CardHeader title="Student Profile" description="Information recorded for your account." />
          <dl className="grid gap-3 text-sm">
            {[
              ["Program", student.programs?.name ?? "Not available"],
              ["Year Level", student.year_level],
              ["Active Email Address", profile.email]
            ].map(([label, value], index) => (
              <div key={label} className={`grid gap-1 ${index < 2 ? "border-b border-slateui-border pb-3" : ""} sm:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] sm:gap-4`}>
                <dt className="font-medium text-slateui-muted">{label}</dt>
                <dd className="break-all font-semibold text-slateui-text sm:text-right">{value}</dd>
              </div>
            ))}
          </dl>
        </Card>
        <Card className="border-t-4 border-t-secondary-600">
          <CardHeader title="Available Actions" description="Other pages remain available regardless of your enrollment status." />
          <div className="grid gap-3 sm:grid-cols-2">
            {primaryAction.href !== "/student/enrollment-status" ? <ButtonLink href="/student/enrollment-status" variant="outline" className="w-full">Enrollment Status</ButtonLink> : null}
            {primaryAction.href !== "/student/enrollment" ? <ButtonLink href="/student/enrollment" variant="outline" className="w-full">Online Enrollment</ButtonLink> : null}
            <ButtonLink href="/student/subjects" variant="outline" className="w-full">Subject List</ButtonLink>
            <ButtonLink href="/student/account" variant="outline" className="w-full">Account</ButtonLink>
            {ENABLE_STUB_PAGES ? <><ButtonLink href="/student/grades" variant="outline" className="w-full">Grades</ButtonLink><ButtonLink href="/student/schedule" variant="outline" className="w-full">Class Schedule</ButtonLink><ButtonLink href="/student/balances" variant="outline" className="w-full">Balances</ButtonLink></> : null}
          </div>
        </Card>
      </div>

      {historicalEnrollments.length > 0 ? (
        <Card className="border-t-4 border-t-slate-600">
          <CardHeader
            title="Previous Enrollment History"
            description="Your past enrollment records from prior academic terms."
          />
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slateui-border bg-slateui-surfaceAlt text-xs font-semibold uppercase tracking-wider text-slateui-muted">
                <tr>
                  <th className="px-4 py-3">Academic Term</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Submitted Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slateui-border">
                {historicalEnrollments.map((record) => (
                  <tr key={record.id}>
                    <td className="px-4 py-3 font-semibold text-slateui-text">
                      {record.academic_year} – {record.semester}
                    </td>
                    <td className="px-4 py-3">
                      <Badge tone={enrollmentBadgeTone(record.status)}>{record.status}</Badge>
                    </td>
                    <td className="px-4 py-3 text-slateui-secondary">
                      {formatDate(record.submitted_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ) : null}
    </div>
  );
}
