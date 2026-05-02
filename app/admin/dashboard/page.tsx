import { ClipboardCheck, FileText, ListChecks, Users } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import { requireRole } from "@/lib/auth/session";

export default async function AdminDashboardPage() {
  const { supabase } = await requireRole("admin");

  const [{ count: pendingCount }, { count: enrolledCount }, { count: totalEnrollmentCount }] =
    await Promise.all([
      supabase.from("enrollments").select("*", { count: "exact", head: true }).eq("status", "PENDING"),
      supabase.from("students").select("*", { count: "exact", head: true }).eq("enrollment_status", "ENROLLED"),
      supabase.from("enrollments").select("*", { count: "exact", head: true })
    ]);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-3">
        <StatCard
          label="Pending Enrollments"
          value={pendingCount ?? 0}
          helper="Requests awaiting administrative review."
          icon={<ListChecks className="h-5 w-5" />}
          tone="warning"
        />
        <StatCard
          label="Enrolled Students"
          value={enrolledCount ?? 0}
          helper="Students currently marked ENROLLED."
          icon={<Users className="h-5 w-5" />}
          tone="success"
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
          <ButtonLink href="/admin/masterlist" variant="secondary">View Enrolled Students</ButtonLink>
          <ButtonLink href="/admin/encode" variant="outline">Encode Grades/Schedule</ButtonLink>
        </div>
      </Card>
      <Card>
        <CardHeader title="Enrollment Status Overview" />
        <div className="grid gap-3 text-sm sm:grid-cols-3">
          <div className="rounded-md bg-amber-50 p-4 text-amber-900">
            <p className="font-semibold">Pending</p>
            <p className="mt-1 text-2xl font-bold">{pendingCount ?? 0}</p>
          </div>
          <div className="rounded-md bg-green-50 p-4 text-green-800">
            <p className="font-semibold">Enrolled</p>
            <p className="mt-1 text-2xl font-bold">{enrolledCount ?? 0}</p>
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
