import { CheckCircle2, FileText, ListChecks, XCircle } from "lucide-react";
import { Badge, enrollmentBadgeTone } from "@/components/ui/badge";
import { Card, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { StatCard } from "@/components/ui/stat-card";
import { PrintButton } from "@/components/print/print-button";
import { requireRole } from "@/lib/auth/session";
import { formatDate, formatName } from "@/lib/utils/format";
import type { Enrollment, Profile, Student } from "@/types/database";

import { fetchEnrollmentFilterData } from "@/lib/enrollment/query";
import { EnrollmentFilterGrid } from "@/components/forms/enrollment-filter-grid";

type ReportRow = Enrollment & {
  students?: (Student & { profiles?: Profile | null }) | null;
};

export default async function EnrollmentReportsPage({
  searchParams
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { supabase } = await requireRole("admin");
  const params = await searchParams;

  const { programOptions, enrollments } = await fetchEnrollmentFilterData(supabase, params);
  const rows = enrollments as ReportRow[];

  const pendingCount = rows.filter((r) => r.status === "PENDING").length;
  const approvedCount = rows.filter((r) => r.status === "APPROVED").length;
  const rejectedCount = rows.filter((r) => r.status === "REJECTED").length;
  const generatedAt = formatDate(new Date().toISOString());

  const reportCriteria: [string, string][] = [
    ["Search Query", params.search || "None"],
    ["Program", params.program || "All"],
    ["Academic Year", params.academic_year || "All"],
    ["Year Level", params.year_level || "All"],
    ["Semester", params.semester || "All"],
    ["Review Status", params.status || "All"]
  ];

  return (
    <section className="print-page space-y-6">
      <Card className="print-hidden">
        <CardHeader
          title="Enrollment Reports"
          description="MVP browser-print report for Registrar review."
          action={<PrintButton label="Print Report" />}
        />
        <EnrollmentFilterGrid
          params={params}
          programOptions={programOptions}
          showAcademicYear
          resetHref="/admin/reports"
        />
      </Card>

      <div className="grid gap-4 lg:grid-cols-4 print:grid-cols-4 print:gap-2">
        <StatCard
          label="Pending"
          value={pendingCount}
          helper="Filtered enrollment records awaiting review."
          icon={<ListChecks className="h-5 w-5" />}
          tone="warning"
        />
        <StatCard
          label="Approved"
          value={approvedCount}
          helper="Filtered enrollment records approved."
          icon={<CheckCircle2 className="h-5 w-5" />}
          tone="success"
        />
        <StatCard
          label="Rejected"
          value={rejectedCount}
          helper="Filtered enrollment records rejected."
          icon={<XCircle className="h-5 w-5" />}
          tone="danger"
        />
        <StatCard
          label="Total Records"
          value={rows.length}
          helper="Filtered enrollment report total."
          icon={<FileText className="h-5 w-5" />}
          tone="info"
        />
      </div>

      <Card>
        <CardHeader
          title="Enrollment Report Output"
          description={`Generated ${generatedAt}`}
        />
        <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5 print:mb-3 print:grid-cols-6">
          {reportCriteria.map(([label, value]) => (
            <div key={label} className="rounded-md border border-slateui-border bg-slateui-surfaceAlt p-3">
              <p className="text-xs font-semibold uppercase text-slateui-muted">{label}</p>
              <p className="mt-1 text-sm font-semibold text-slateui-text">{value}</p>
            </div>
          ))}
        </div>
        {rows.length ? (
          <div className="overflow-hidden rounded-lg border border-slateui-border">
            <div className="overflow-x-auto print:overflow-x-visible">
              <table className="min-w-full divide-y divide-slateui-border text-left text-sm">
                <thead className="bg-primary-800 text-white">
                  <tr>
                    {[
                      "Student name",
                      "Student ID",
                      "Program",
                      "Year Level",
                      "Academic Year",
                      "Semester",
                      "Status",
                      "Submitted",
                      "Reviewed",
                      "Remarks"
                    ].map((column) => (
                      <th key={column} scope="col" className="whitespace-nowrap px-4 py-3 font-semibold">
                        {column}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slateui-border bg-white">
                  {rows.map((enrollment) => (
                    <tr key={enrollment.id}>
                      <td className="whitespace-nowrap px-4 py-3 font-semibold text-slateui-text">
                        {formatName(enrollment.students?.profiles?.first_name, enrollment.students?.profiles?.last_name)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-slateui-secondary">
                        {enrollment.students?.student_id_number ?? "Not provided"}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-slateui-secondary">
                        {enrollment.programs?.name ?? "Not available"}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-slateui-secondary">{enrollment.year_level}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-slateui-secondary">{enrollment.academic_year}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-slateui-secondary">{enrollment.semester}</td>
                      <td className="whitespace-nowrap px-4 py-3">
                        <Badge tone={enrollmentBadgeTone(enrollment.status)}>{enrollment.status}</Badge>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-slateui-secondary">
                        {formatDate(enrollment.submitted_at)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-slateui-secondary">
                        {formatDate(enrollment.reviewed_at)}
                      </td>
                      <td className="max-w-sm px-4 py-3 text-slateui-secondary">
                        {enrollment.remarks || "None"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <EmptyState
            title="No enrollment records match the selected filters."
            description="Reports are generated from submitted enrollment records only. Saved Official Student Records appear here after students claim accounts and submit Online Enrollment."
          />
        )}
      </Card>
    </section>
  );
}
