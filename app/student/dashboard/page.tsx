import { BookOpen, ClipboardCheck, FileText, UserCircle } from "lucide-react";
import { Badge, enrollmentBadgeTone } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { StatCard } from "@/components/ui/stat-card";
import { getStudentForProfile, requireRole } from "@/lib/auth/session";
import { getDisplayedEnrollmentStatus } from "@/lib/enrollment/display-status";
import { formatName } from "@/lib/utils/format";
import type { EnrollmentReviewStatus } from "@/types/database";
import { ENABLE_STUB_PAGES } from "@/lib/constants/navigation";

type DashboardEnrollment = {
  status: EnrollmentReviewStatus;
  academic_year: string;
  semester: string;
};

export default async function StudentDashboardPage() {
  const { profile, supabase } = await requireRole("student");
  const student = await getStudentForProfile(profile.id);

  if (!student) {
    return <EmptyState title="Student record not found." description="Please contact an administrator." />;
  }

  const { data: latestEnrollment, error: latestEnrollmentError } = await supabase
    .from("enrollments")
    .select("status, academic_year, semester")
    .eq("student_id", student.id)
    .order("submitted_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (latestEnrollmentError) {
    console.error("student_dashboard:latest_enrollment");
  }

  const request = (latestEnrollment as DashboardEnrollment | null) ?? null;
  const status = getDisplayedEnrollmentStatus(request?.status ?? null, student.enrollment_status);
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
          <h2 className="text-xl font-bold text-slateui-text sm:text-2xl">Welcome, {formatName(profile.first_name, profile.last_name)}!</h2>
          <p className="mt-1 text-sm leading-6 text-slateui-muted">Review your current enrollment status and use the next action below.</p>
        </div>
        <ButtonLink href={primaryAction.href} variant={primaryAction.variant} className="w-full lg:w-auto">
          <PrimaryIcon className="h-4 w-4" aria-hidden="true" />
          {primaryAction.label}
        </ButtonLink>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <StatCard
          label="Enrollment Status"
          value={<Badge tone={enrollmentBadgeTone(status)}>{status}</Badge>}
          helper={request ? `${request.academic_year} | ${request.semester}` : "No request has been submitted."}
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
    </div>
  );
}
