import { redirect } from "next/navigation";
import { Badge, enrollmentBadgeTone } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { EnrollmentFilterGrid } from "@/components/forms/enrollment-filter-grid";
import { PrintButton } from "@/components/print/print-button";
import { SimpleTable } from "@/components/tables/simple-table";
import { requireRole } from "@/lib/auth/session";
import {
  fetchEnrollmentFilterData,
  getEnrollmentReportCriteria,
  hasActiveEnrollmentFilters,
  hasCanonicalEnrollmentFilters,
  serializeEnrollmentFilters
} from "@/lib/enrollment/query";
import { formatName } from "@/lib/utils/format";

export default async function EnrollmentMasterlistPage({
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
        title="Enrollment Masterlist could not be loaded"
        description="Please try again. No enrollment records are shown until the current data is available."
      />
    );
  }

  if (!hasCanonicalEnrollmentFilters(params, result.filters, result.programOptions)) {
    const query = serializeEnrollmentFilters(result.filters, result.programOptions);
    redirect(`/admin/masterlist${query ? `?${query}` : ""}`);
  }

  const emptyTitle = hasActiveEnrollmentFilters(result.filters)
    ? "No submitted enrollment records match the selected filters."
    : "No submitted enrollment records are available for the masterlist.";
  const reportCriteria = getEnrollmentReportCriteria(result.filters, result.selectedProgram);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader
          title="Enrollment Masterlist"
          description="Submitted enrollment records across pending, approved, and rejected review statuses."
          action={<PrintButton label="Print Masterlist" />}
        />
        <EnrollmentFilterGrid params={result.filters} programOptions={result.programOptions} showAcademicYear resetHref="/admin/masterlist" />
      </Card>
      <p className="text-sm text-slateui-muted">
        Overall Student Status is the student&apos;s current summarized enrollment state. It is separate from this enrollment request&apos;s review status.
      </p>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6 print:grid-cols-6">
        {reportCriteria.map(([label, value]) => (
          <div key={label} className="rounded-md border border-slateui-border bg-slateui-surfaceAlt p-3">
            <p className="text-xs font-semibold uppercase text-slateui-muted">{label}</p>
            <p className="mt-1 text-sm font-semibold text-slateui-text">{value}</p>
          </div>
        ))}
      </div>
      {result.enrollments.length ? (
        <SimpleTable
          columns={["Student name", "Student ID", "Program", "Year Level", "Academic Year", "Semester", "Review Status", "Overall Student Status", "Form"]}
          rows={result.enrollments.map((enrollment) => [
            formatName(enrollment.students?.profiles?.first_name, enrollment.students?.profiles?.last_name),
            enrollment.students?.student_id_number ?? "Not provided",
            enrollment.programs?.name ?? "Not available",
            enrollment.year_level,
            enrollment.academic_year,
            enrollment.semester,
            <Badge key={`${enrollment.id}-review`} tone={enrollmentBadgeTone(enrollment.status)}>{enrollment.status}</Badge>,
            <Badge key={`${enrollment.id}-student`} tone={enrollmentBadgeTone(enrollment.students?.enrollment_status)}>{enrollment.students?.enrollment_status ?? "NOT AVAILABLE"}</Badge>,
            <ButtonLink key={`${enrollment.id}-form`} href={`/admin/enrollments/${enrollment.id}/registration`} variant="outline" className="print-hidden min-h-9 px-3 py-1.5">View/Print</ButtonLink>
          ])}
        />
      ) : (
        <EmptyState title={emptyTitle} description="The masterlist is based on submitted enrollment records, not saved Official Student Records. Students must claim an account and submit Online Enrollment first." />
      )}
    </div>
  );
}
