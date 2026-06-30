import { ClipboardCheck, FileText, ListChecks, XCircle } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import { requireRole } from "@/lib/auth/session";
import type { EnrollmentReviewStatus } from "@/types/database";

function countStatuses(records: Array<{ status: EnrollmentReviewStatus }>) {
  return records.reduce(
    (counts, record) => {
      counts.total += 1;
      counts[record.status] += 1;
      return counts;
    },
    {
      APPROVED: 0,
      PENDING: 0,
      REJECTED: 0,
      total: 0
    }
  );
}

export default async function AdminDashboardPage() {
  const { supabase } = await requireRole("admin");
  const { data: enrollmentStatuses } = await supabase
    .from("enrollments")
    .select("status")
    .returns<Array<{ status: EnrollmentReviewStatus }>>();
  const statusCounts = countStatuses(enrollmentStatuses ?? []);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-4">
        <StatCard
          label="Pending Enrollments"
          value={statusCounts.PENDING}
          helper="Requests awaiting administrative review."
          icon={<ListChecks className="h-5 w-5" />}
          tone="warning"
        />
        <StatCard
          label="Approved Enrollments"
          value={statusCounts.APPROVED}
          helper="Enrollment records approved by the Registrar."
          icon={<ClipboardCheck className="h-5 w-5" />}
          tone="success"
        />
        <StatCard
          label="Rejected Enrollments"
          value={statusCounts.REJECTED}
          helper="Reviewed records that were not approved."
          icon={<XCircle className="h-5 w-5" />}
          tone="danger"
        />
        <StatCard
          label="Enrollment Records"
          value={statusCounts.total}
          helper="Submitted enrollment records."
          icon={<FileText className="h-5 w-5" />}
          tone="info"
        />
      </div>
      <Card>
        <CardHeader title="Admin Controls" description="Monitor and review enrollment records." />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <ButtonLink href="/admin/enrollments">View Pending Enrollments</ButtonLink>
          <ButtonLink href="/admin/enrollments" variant="outline">
            <ClipboardCheck className="h-4 w-4" aria-hidden="true" />
            Approve Enrollment
          </ButtonLink>
          <ButtonLink href="/admin/enrollments" variant="outline">Reject Enrollment</ButtonLink>
          <ButtonLink href="/admin/masterlist?status=APPROVED" variant="secondary">View Enrolled Students</ButtonLink>
          <ButtonLink href="/admin/reports" variant="outline">Enrollment Reports</ButtonLink>
          <ButtonLink href="/admin/encode" variant="outline">Encode Grades/Schedule</ButtonLink>
        </div>
      </Card>
      <Card>
        <CardHeader title="Enrollment Status Overview" />
        {statusCounts.total === 0 ? (
          <div className="mb-4 rounded-md border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900">
            Dashboard counts include submitted enrollment records only. Official Student Records appear here after a student claims an account and submits Online Enrollment.
          </div>
        ) : null}
        <div className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-md bg-amber-50 p-4 text-amber-900">
            <p className="font-semibold">Pending</p>
            <p className="mt-1 text-2xl font-bold">{statusCounts.PENDING}</p>
          </div>
          <div className="rounded-md bg-green-50 p-4 text-green-800">
            <p className="font-semibold">Approved</p>
            <p className="mt-1 text-2xl font-bold">{statusCounts.APPROVED}</p>
          </div>
          <div className="rounded-md bg-red-50 p-4 text-red-800">
            <p className="font-semibold">Rejected</p>
            <p className="mt-1 text-2xl font-bold">{statusCounts.REJECTED}</p>
          </div>
          <div className="rounded-md bg-sky-50 p-4 text-sky-900">
            <p className="font-semibold">Total Records</p>
            <p className="mt-1 text-2xl font-bold">{statusCounts.total}</p>
          </div>
        </div>
      </Card>
    </div>
  );
}
