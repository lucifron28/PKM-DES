import { ClipboardCheck, FileText, ListChecks, XCircle } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import { requireRole } from "@/lib/auth/session";
import { countEnrollmentStatuses } from "@/lib/enrollment/query";
import { getActiveEnrollmentTerm } from "@/lib/enrollment/term-authority";
import type { EnrollmentReviewStatus } from "@/types/database";
import { ENABLE_STUB_PAGES } from "@/lib/constants/navigation";

export default async function AdminDashboardPage() {
  const { supabase } = await requireRole("admin");
  const activeTerm = await getActiveEnrollmentTerm(supabase);

  let query = supabase
    .from("enrollments")
    .select("status");

  if (activeTerm) {
    query = query
      .eq("academic_year", activeTerm.academicYear)
      .eq("semester", activeTerm.semester);
  }

  const { data: enrollmentStatuses, error: enrollmentStatusesError } = await query.returns<Array<{ status: EnrollmentReviewStatus }>>();

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
          helper={activeTerm ? `Pending for ${activeTerm.academicYear} ${activeTerm.semester}` : "Requests awaiting administrative review."}
          icon={<ListChecks className="h-5 w-5" />}
          tone="warning"
        />
        <StatCard
          label="Approved Enrollments"
          value={statusCounts?.APPROVED ?? "Unavailable"}
          helper={activeTerm ? `Approved for ${activeTerm.academicYear} ${activeTerm.semester}` : "Enrollment records approved by the Registrar."}
          icon={<ClipboardCheck className="h-5 w-5" />}
          tone="success"
        />
        <StatCard
          label="Rejected Enrollments"
          value={statusCounts?.REJECTED ?? "Unavailable"}
          helper={activeTerm ? `Rejected for ${activeTerm.academicYear} ${activeTerm.semester}` : "Reviewed records that were not approved."}
          icon={<XCircle className="h-5 w-5" />}
          tone="danger"
        />
        <StatCard
          label="Enrollment Records"
          value={statusCounts?.total ?? "Unavailable"}
          helper={activeTerm ? `Active Term: ${activeTerm.academicYear} ${activeTerm.semester}` : "Submitted enrollment records."}
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
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <ButtonLink href="/admin/enrollments" variant="primary" className="w-full">
            Review Pending Requests
          </ButtonLink>
          <ButtonLink href="/admin/masterlist" variant="outline" className="w-full">
            Official Masterlist
          </ButtonLink>
          <ButtonLink href="/admin/students" variant="outline" className="w-full">
            Student Directory
          </ButtonLink>
          {ENABLE_STUB_PAGES ? (
            <>
              <ButtonLink href="/admin/reports" variant="outline" className="w-full">
                Summary Reports
              </ButtonLink>
              <ButtonLink href="/admin/encode" variant="outline" className="w-full">
                Enrollment Encoding
              </ButtonLink>
              <ButtonLink href="/admin/account" variant="outline" className="w-full">
                Account Settings
              </ButtonLink>
            </>
          ) : null}
        </div>
      </Card>
    </div>
  );
}
