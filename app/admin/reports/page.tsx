import { CheckCircle2, FileText, ListChecks, XCircle } from "lucide-react";
import { redirect } from "next/navigation";
import { Badge, enrollmentBadgeTone } from "@/components/ui/badge";
import { Card, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { EnrollmentFilterGrid } from "@/components/forms/enrollment-filter-grid";
import { PrintButton } from "@/components/print/print-button";
import { StatCard } from "@/components/ui/stat-card";
import { requireRole } from "@/lib/auth/session";
import {
  countEnrollmentStatuses,
  fetchEnrollmentFilterData,
  getEnrollmentReportCriteria,
  hasActiveEnrollmentFilters,
  hasCanonicalEnrollmentFilters,
  serializeEnrollmentFilters
} from "@/lib/enrollment/query";
import { formatDate, formatName } from "@/lib/utils/format";

export default async function EnrollmentReportsPage({
  searchParams
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { supabase } = await requireRole("admin");
  const params = await searchParams;
  const result = await fetchEnrollmentFilterData(supabase, params);

  if (!result.ok) {
    console.error(`enrollment_reporting:${result.stage === "programs_load" ? "programs_load" : "records_load"}`);
    return (
      <EmptyState
        title="Enrollment report could not be loaded"
        description="Please try again. No report totals or records are shown until the current enrollment data is available."
      />
    );
  }

  if (!hasCanonicalEnrollmentFilters(params, result.filters, result.programOptions)) {
    const query = serializeEnrollmentFilters(result.filters, result.programOptions);
    redirect(`/admin/reports${query ? `?${query}` : ""}`);
  }

  const statusCounts = countEnrollmentStatuses(result.enrollments);
  const reportCriteria = getEnrollmentReportCriteria(result.filters, result.selectedProgram);
  const generatedAt = formatDate(new Date().toISOString());
  const emptyTitle = hasActiveEnrollmentFilters(result.filters)
    ? "No submitted enrollment records match the selected filters."
    : "No submitted enrollment records are available for this report.";

  return (
    <section className="print-page space-y-6">
      <Card className="print-hidden">
        <CardHeader
          title="Enrollment Reports"
          description="MVP browser-print report for Registrar review."
          action={<PrintButton label="Print Report" />}
        />
        <EnrollmentFilterGrid
          params={result.filters}
          programOptions={result.programOptions}
          showAcademicYear
          resetHref="/admin/reports"
        />
      </Card>

      <div className="grid gap-4 lg:grid-cols-4 print:grid-cols-4 print:gap-2">
        <StatCard label="Pending" value={statusCounts.PENDING} helper="Filtered submitted enrollment records awaiting review." icon={<ListChecks className="h-5 w-5" />} tone="warning" />
        <StatCard label="Approved" value={statusCounts.APPROVED} helper="Filtered submitted enrollment records approved." icon={<CheckCircle2 className="h-5 w-5" />} tone="success" />
        <StatCard label="Rejected" value={statusCounts.REJECTED} helper="Filtered submitted enrollment records rejected." icon={<XCircle className="h-5 w-5" />} tone="danger" />
        <StatCard label="Total Records" value={statusCounts.total} helper="Filtered submitted enrollment records." icon={<FileText className="h-5 w-5" />} tone="info" />
      </div>

      <Card>
        <CardHeader title="Enrollment Report Output" description={`Generated ${generatedAt}`} />
        <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5 print:mb-3 print:grid-cols-6">
          {reportCriteria.map(([label, value]) => (
            <div key={label} className="rounded-md border border-slateui-border bg-slateui-surfaceAlt p-3">
              <p className="text-xs font-semibold uppercase text-slateui-muted">{label}</p>
              <p className="mt-1 text-sm font-semibold text-slateui-text">{value}</p>
            </div>
          ))}
        </div>
        {result.enrollments.length ? (
          <div>
            <p className="print-hidden mb-2 text-xs text-slateui-muted sm:hidden">
              Swipe horizontally to view complete report columns.
            </p>
            <div className="overflow-hidden rounded-lg border border-slateui-border">
              <div className="overflow-x-auto print:overflow-x-visible">
                <table className="min-w-full divide-y divide-slateui-border text-left text-sm">
                <thead className="bg-primary-800 text-white">
                  <tr>
                    {["Student name", "Student ID", "Program", "Year Level", "Academic Year", "Semester", "Status", "Submitted", "Reviewed", "Remarks"].map((column) => (
                      <th key={column} scope="col" className="whitespace-nowrap px-4 py-3 font-semibold">{column}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slateui-border bg-white">
                  {result.enrollments.map((enrollment) => (
                    <tr key={enrollment.id}>
                      <td className="whitespace-nowrap px-4 py-3 font-semibold text-slateui-text">{formatName(enrollment.students?.profiles?.first_name, enrollment.students?.profiles?.last_name)}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-slateui-secondary">{enrollment.students?.student_id_number ?? "Not provided"}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-slateui-secondary">{enrollment.programs?.name ?? "Not available"}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-slateui-secondary">{enrollment.year_level}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-slateui-secondary">{enrollment.academic_year}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-slateui-secondary">{enrollment.semester}</td>
                      <td className="whitespace-nowrap px-4 py-3"><Badge tone={enrollmentBadgeTone(enrollment.status)}>{enrollment.status}</Badge></td>
                      <td className="whitespace-nowrap px-4 py-3 text-slateui-secondary">{formatDate(enrollment.submitted_at)}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-slateui-secondary">{formatDate(enrollment.reviewed_at)}</td>
                      <td className="max-w-sm px-4 py-3 text-slateui-secondary">{enrollment.remarks || "None"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          </div>
        ) : (
          <EmptyState title={emptyTitle} description="Reports are generated from submitted enrollment records only. Saved Official Student Records appear here after students claim accounts and submit Online Enrollment." />
        )}
      </Card>
    </section>
  );
}
