import { ClipboardCheck, FileText, ListChecks, XCircle } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import { requireRole } from "@/lib/auth/session";
import { countEnrollmentStatuses } from "@/lib/enrollment/query";
import { getActiveEnrollmentTermResult } from "@/lib/enrollment/term-authority";
import type { EnrollmentReviewStatus } from "@/types/database";
import { ENABLE_STUB_PAGES } from "@/lib/constants/navigation";

export default async function AdminDashboardPage() {
  const { supabase } = await requireRole("admin");
  const activeTermResult = await getActiveEnrollmentTermResult(supabase);

  const activeTerm = activeTermResult.ok ? activeTermResult.term : null;

  let statusCounts = null;

  if (activeTerm) {
    const { data: enrollmentStatuses, error: enrollmentStatusesError } = await supabase
      .from("enrollments")
      .select("status")
      .eq("academic_year", activeTerm.academicYear)
      .eq("semester", activeTerm.semester)
      .returns<Array<{ status: EnrollmentReviewStatus }>>();

    if (enrollmentStatusesError) {
      console.error("enrollment_reporting:dashboard_counts", enrollmentStatusesError);
    } else {
      statusCounts = countEnrollmentStatuses(enrollmentStatuses ?? []);
    }
  }

  const countedTermLabel = activeTerm ? activeTerm.label : "No active term configured";

  return (
    <div className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-4">
        <StatCard
          label="Pending Enrollments"
          value={statusCounts?.PENDING ?? "Unavailable"}
          helper={activeTerm ? `Pending for ${countedTermLabel}` : "No active term configured."}
          icon={<ListChecks className="h-5 w-5" />}
          tone="warning"
        />
        <StatCard
          label="Approved Enrollments"
          value={statusCounts?.APPROVED ?? "Unavailable"}
          helper={activeTerm ? `Approved for ${countedTermLabel}` : "No active term configured."}
          icon={<ClipboardCheck className="h-5 w-5" />}
          tone="success"
        />
        <StatCard
          label="Rejected Enrollments"
          value={statusCounts?.REJECTED ?? "Unavailable"}
          helper={activeTerm ? `Rejected for ${countedTermLabel}` : "No active term configured."}
          icon={<XCircle className="h-5 w-5" />}
          tone="danger"
        />
        <StatCard
          label="Enrollment Records"
          value={statusCounts?.total ?? "Unavailable"}
          helper={activeTerm ? `Active Term: ${countedTermLabel}` : "No active term configured."}
          icon={<FileText className="h-5 w-5" />}
          tone="info"
        />
      </div>
      <Card className="border-t-4 border-t-primary-800">
        <CardHeader title="Registrar Workflow" description="Start with pending requests, then continue with source records and reporting." />
        <div className="mb-5 border-l-4 border-sky-500 bg-sky-50 px-4 py-3 text-sm text-sky-900">
          <p className="font-semibold">Demo path</p>
          <p className="mt-1">
            Review pending requests first. Search and edit official records when identity matching is required.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <ButtonLink href="/admin/enrollments" variant="primary" className="w-full">
            Review Pending Requests
          </ButtonLink>
          <ButtonLink href="/admin/students" variant="secondary" className="w-full">
            Official Student Records
          </ButtonLink>
          <ButtonLink href="/admin/masterlist" variant="outline" className="w-full">
            Enrollment Masterlist
          </ButtonLink>
          <ButtonLink href="/admin/reports" variant="outline" className="w-full">
            Enrollment Reports
          </ButtonLink>
          {ENABLE_STUB_PAGES ? (
            <>
              <ButtonLink href="/admin/encode" variant="outline" className="w-full">
                Encode Grades / Schedule
              </ButtonLink>
            </>
          ) : null}
        </div>
      </Card>
    </div>
  );
}
