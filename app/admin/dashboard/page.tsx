import { ClipboardCheck, FileText, ListChecks, XCircle } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import { requireRole } from "@/lib/auth/session";

export default async function AdminDashboardPage() {
  const { supabase } = await requireRole("admin");

  const [
    { count: pendingCount },
    { count: approvedCount },
    { count: rejectedCount },
    { count: totalEnrollmentCount }
  ] =
    await Promise.all([
      supabase.from("enrollments").select("*", { count: "exact", head: true }).eq("status", "PENDING"),
      supabase.from("enrollments").select("*", { count: "exact", head: true }).eq("status", "APPROVED"),
      supabase.from("enrollments").select("*", { count: "exact", head: true }).eq("status", "REJECTED"),
      supabase.from("enrollments").select("*", { count: "exact", head: true })
    ]);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-4">
        <StatCard
          label="Pending Enrollments"
          value={pendingCount ?? 0}
          helper="Requests awaiting administrative review."
          icon={<ListChecks className="h-5 w-5" />}
          tone="warning"
        />
        <StatCard
          label="Approved Enrollments"
          value={approvedCount ?? 0}
          helper="Enrollment records approved by the Registrar."
          icon={<ClipboardCheck className="h-5 w-5" />}
          tone="success"
        />
        <StatCard
          label="Rejected Enrollments"
          value={rejectedCount ?? 0}
          helper="Reviewed records that were not approved."
          icon={<XCircle className="h-5 w-5" />}
          tone="danger"
        />
        <StatCard
          label="Enrollment Records"
          value={totalEnrollmentCount ?? 0}
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
        <div className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-md bg-amber-50 p-4 text-amber-900">
            <p className="font-semibold">Pending</p>
            <p className="mt-1 text-2xl font-bold">{pendingCount ?? 0}</p>
          </div>
          <div className="rounded-md bg-green-50 p-4 text-green-800">
            <p className="font-semibold">Approved</p>
            <p className="mt-1 text-2xl font-bold">{approvedCount ?? 0}</p>
          </div>
          <div className="rounded-md bg-red-50 p-4 text-red-800">
            <p className="font-semibold">Rejected</p>
            <p className="mt-1 text-2xl font-bold">{rejectedCount ?? 0}</p>
          </div>
          <div className="rounded-md bg-sky-50 p-4 text-sky-900">
            <p className="font-semibold">Total Records</p>
            <p className="mt-1 text-2xl font-bold">{totalEnrollmentCount ?? 0}</p>
          </div>
        </div>
      </Card>
    </div>
  );
}
