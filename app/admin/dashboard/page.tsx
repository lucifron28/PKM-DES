import { ClipboardCheck, FileText, ListChecks, XCircle } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import { requireRole } from "@/lib/auth/session";
import { countEnrollmentStatuses } from "@/lib/enrollment/query";
import type { EnrollmentReviewStatus } from "@/types/database";
import { ENABLE_STUB_PAGES } from "@/lib/constants/navigation";

export default async function AdminDashboardPage() {
  const { supabase } = await requireRole("admin");
  const { data: enrollmentStatuses, error: enrollmentStatusesError } = await supabase
    .from("enrollments")
    .select("status")
    .returns<Array<{ status: EnrollmentReviewStatus }>>();

  if (enrollmentStatusesError) {
    console.error("enrollment_reporting:dashboard_counts");
  }

  const statusCounts = enrollmentStatusesError ? null : countEnrollmentStatuses(enrollmentStatuses ?? []);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-4">
        <StatCard
          label="Pending Enrollments"
          value={statusCounts?.PENDING ?? "Unavailable"}
          helper="Requests awaiting administrative review."
          icon={<ListChecks className="h-5 w-5" />}
          tone="warning"
        />
        <StatCard
          label="Approved Enrollments"
          value={statusCounts?.APPROVED ?? "Unavailable"}
          helper="Enrollment records approved by the Registrar."
          icon={<ClipboardCheck className="h-5 w-5" />}
          tone="success"
        />
        <StatCard
          label="Rejected Enrollments"
          value={statusCounts?.REJECTED ?? "Unavailable"}
          helper="Reviewed records that were not approved."
          icon={<XCircle className="h-5 w-5" />}
          tone="danger"
        />
        <StatCard
          label="Enrollment Records"
          value={statusCounts?.total ?? "Unavailable"}
          helper="Submitted enrollment records."
          icon={<FileText className="h-5 w-5" />}
          tone="info"
        />
      </div>
      <Card className="border-t-4 border-t-primary-800">
        <CardHeader title="Registrar Workflow" description="Start with pending requests, then continue with source records and reporting." />
        <div className="mb-5 border-l-4 border-sky-500 bg-sky-50 px-4 py-3 text-sm text-sky-900">
          <p className="font-semibold">Demo path</p>
          <p className="mt-1">
            Add or confirm an Official Student Record, let the student claim the account, then submit Online Enrollment.
            Only submitted enrollment records are counted on this dashboard.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <ButtonLink href="/admin/enrollments" className="w-full"><ClipboardCheck className="h-4 w-4" aria-hidden="true" />Review Pending Enrollments</ButtonLink>
          <ButtonLink href="/admin/students" variant="outline" className="w-full">Student Records</ButtonLink>
          <ButtonLink href="/admin/masterlist" variant="outline" className="w-full">Enrollment Masterlist</ButtonLink>
          <ButtonLink href="/admin/reports" variant="outline" className="w-full">Enrollment Reports</ButtonLink>
          {ENABLE_STUB_PAGES ? <ButtonLink href="/admin/encode" variant="outline" className="w-full">Encode Grades/Schedule</ButtonLink> : null}
        </div>
      </Card>
      {statusCounts === null ? (
        <Card className="border-t-4 border-t-secondary-600">
          <CardHeader title="Enrollment Status Overview" />
          <div className="mb-4 border-l-4 border-red-600 bg-red-50 px-4 py-3 text-sm text-red-800">
            Enrollment counts could not be loaded. Please try again.
          </div>
        </Card>
      ) : null}
    </div>
  );
}
