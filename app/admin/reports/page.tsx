import { CheckCircle2, FileText, ListChecks, XCircle } from "lucide-react";
import { Badge, enrollmentBadgeTone } from "@/components/ui/badge";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { SelectInput } from "@/components/ui/field";
import { StatCard } from "@/components/ui/stat-card";
import { PrintButton } from "@/components/print/print-button";
import { ENROLLMENT_REVIEW_STATUSES } from "@/lib/constants/enrollment";
import { ACADEMIC_YEAR_OPTIONS, SEMESTERS, YEAR_LEVELS } from "@/lib/constants/pkm";
import { requireRole } from "@/lib/auth/session";
import { formatDate, formatName } from "@/lib/utils/format";
import type {
  Enrollment,
  EnrollmentReviewStatus,
  Profile,
  Semester,
  Student,
  YearLevel
} from "@/types/database";

import { fetchEnrollmentFilterData } from "@/lib/enrollment/query";

type ReportRow = Enrollment & {
  students?: (Student & { profiles?: Profile | null }) | null;
};

type ReportSearchParams = {
  program?: string;
  academic_year?: string;
  year_level?: YearLevel;
  semester?: Semester;
  status?: EnrollmentReviewStatus;
};

function countByStatus(rows: ReportRow[], status: EnrollmentReviewStatus) {
  return rows.filter((row) => row.status === status).length;
}

function formatCriterion(value: string | null | undefined) {
  return value?.trim() || "All";
}

export default async function EnrollmentReportsPage({
  searchParams
}: {
  searchParams?: Promise<ReportSearchParams>;
}) {
  const { supabase } = await requireRole("admin");
  const params = (await searchParams) ?? {};

  const { programOptions, selectedProgram, enrollments } = await fetchEnrollmentFilterData(supabase, params);
  const rows = enrollments as ReportRow[];
  const pendingCount = countByStatus(rows, "PENDING");
  const approvedCount = countByStatus(rows, "APPROVED");
  const rejectedCount = countByStatus(rows, "REJECTED");
  const generatedAt = formatDate(new Date().toISOString());
  const reportCriteria = [
    ["Program", selectedProgram?.name ?? "All programs"],
    ["Academic Year", formatCriterion(params.academic_year)],
    ["Year Level", formatCriterion(params.year_level)],
    ["Semester", formatCriterion(params.semester)],
    ["Review Status", formatCriterion(params.status)]
  ];

  return (
    <section className="print-page space-y-6">
      <Card>
        <CardHeader
          title="Enrollment Reports"
          description="MVP browser-print report for Registrar review."
          action={<PrintButton label="Print Report" />}
        />
        <form className="print-hidden grid gap-4 lg:grid-cols-[1fr_1fr_1fr_1fr_1fr_auto_auto] lg:items-end">
          <SelectInput label="Program" name="program" defaultValue={params.program ?? ""}>
            <option value="">All programs</option>
            {programOptions.map((program) => (
              <option key={program.id} value={program.code ?? program.id}>
                {program.name}
              </option>
            ))}
          </SelectInput>
          <SelectInput label="Academic Year" name="academic_year" defaultValue={params.academic_year ?? ""}>
            <option value="">All academic years</option>
            {ACADEMIC_YEAR_OPTIONS.map((academicYear) => (
              <option key={academicYear} value={academicYear}>{academicYear}</option>
            ))}
          </SelectInput>
          <SelectInput label="Year Level" name="year_level" defaultValue={params.year_level ?? ""}>
            <option value="">All year levels</option>
            {YEAR_LEVELS.map((year) => (
              <option key={year} value={year}>{year}</option>
            ))}
          </SelectInput>
          <SelectInput label="Semester" name="semester" defaultValue={params.semester ?? ""}>
            <option value="">All semesters</option>
            {SEMESTERS.map((semester) => (
              <option key={semester} value={semester}>{semester}</option>
            ))}
          </SelectInput>
          <SelectInput label="Review Status" name="status" defaultValue={params.status ?? ""}>
            <option value="">All statuses</option>
            {ENROLLMENT_REVIEW_STATUSES.map((status) => (
              <option key={status} value={status}>{status}</option>
            ))}
          </SelectInput>
          <Button type="submit">Apply</Button>
          <ButtonLink href="/admin/reports" variant="outline">Reset</ButtonLink>
        </form>
      </Card>

      <div className="grid gap-4 lg:grid-cols-4">
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
        <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {reportCriteria.map(([label, value]) => (
            <div key={label} className="rounded-md border border-slateui-border bg-slateui-surfaceAlt p-3">
              <p className="text-xs font-semibold uppercase text-slateui-muted">{label}</p>
              <p className="mt-1 text-sm font-semibold text-slateui-text">{value}</p>
            </div>
          ))}
        </div>
        {rows.length ? (
          <div className="overflow-hidden rounded-lg border border-slateui-border">
            <div className="overflow-x-auto">
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
          <EmptyState title="No enrollment records match the selected filters." />
        )}
      </Card>
    </section>
  );
}
