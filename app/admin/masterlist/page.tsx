import { Badge, enrollmentBadgeTone } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { SimpleTable } from "@/components/tables/simple-table";
import { PrintButton } from "@/components/print/print-button";
import { requireRole } from "@/lib/auth/session";
import { formatName } from "@/lib/utils/format";
import type { Enrollment, Profile, Student } from "@/types/database";

import { fetchEnrollmentFilterData } from "@/lib/enrollment/query";
import { EnrollmentFilterGrid } from "@/components/forms/enrollment-filter-grid";

type MasterlistRow = Enrollment & {
  students?: (Student & { profiles?: Profile | null }) | null;
};

export default async function EnrollmentMasterlistPage({
  searchParams
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { supabase } = await requireRole("admin");
  const params = await searchParams;

  const { programOptions, enrollments } = await fetchEnrollmentFilterData(supabase, params);
  const rows = enrollments as MasterlistRow[];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader
          title="Enrollment Masterlist"
          description="Officially enrolled students and pending or incomplete enrollment records."
          action={<PrintButton label="Print Masterlist" />}
        />
        <EnrollmentFilterGrid 
          params={params} 
          programOptions={programOptions} 
          resetHref="/admin/masterlist"
        />
      </Card>
      {rows.length ? (
        <SimpleTable
          columns={[
            "Student name",
            "Student ID",
            "Program",
            "Year Level",
            "Semester",
            "Review Status",
            "Student Status",
            "Form"
          ]}
          rows={rows.map((enrollment) => [
            formatName(enrollment.students?.profiles?.first_name, enrollment.students?.profiles?.last_name),
            enrollment.students?.student_id_number ?? "Not provided",
            enrollment.programs?.name ?? "Not available",
            enrollment.year_level,
            enrollment.semester,
            <Badge key={`${enrollment.id}-review`} tone={enrollmentBadgeTone(enrollment.status)}>
              {enrollment.status}
            </Badge>,
            <Badge key={`${enrollment.id}-student`} tone={enrollmentBadgeTone(enrollment.students?.enrollment_status)}>
              {enrollment.students?.enrollment_status ?? "NOT AVAILABLE"}
            </Badge>,
            <ButtonLink
              key={`${enrollment.id}-form`}
              href={`/admin/enrollments/${enrollment.id}/registration`}
              variant="outline"
              className="print-hidden min-h-9 px-3 py-1.5"
            >
              View/Print
            </ButtonLink>
          ])}
        />
      ) : (
        <EmptyState
          title="No enrollment records found."
          description="The masterlist is based on submitted enrollment records, not saved Official Student Records. Students must claim an account and submit Online Enrollment first."
        />
      )}
    </div>
  );
}
