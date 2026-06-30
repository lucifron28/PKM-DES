import { Badge, enrollmentBadgeTone } from "@/components/ui/badge";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { SelectInput } from "@/components/ui/field";
import { SimpleTable } from "@/components/tables/simple-table";
import { PrintButton } from "@/components/print/print-button";
import { PROGRAM, SEMESTERS, YEAR_LEVELS } from "@/lib/constants/pkm";
import { ENROLLMENT_REVIEW_STATUSES } from "@/lib/constants/enrollment";
import { requireRole } from "@/lib/auth/session";
import { formatName } from "@/lib/utils/format";
import type { Enrollment, EnrollmentReviewStatus, Profile, Program, Semester, Student, YearLevel } from "@/types/database";

type MasterlistRow = Enrollment & {
  students?: (Student & { profiles?: Profile | null }) | null;
};

type ProgramOption = Pick<Program, "id" | "name" | "code">;

export default async function EnrollmentMasterlistPage({
  searchParams
}: {
  searchParams?: Promise<{
    program?: string;
    year_level?: YearLevel;
    semester?: Semester;
    status?: EnrollmentReviewStatus;
  }>;
}) {
  const { supabase } = await requireRole("admin");
  const params = (await searchParams) ?? {};
  const { data: programsData } = await supabase
    .from("programs")
    .select("id, name, code")
    .order("name")
    .returns<ProgramOption[]>();

  const programOptions: ProgramOption[] = programsData?.length
    ? programsData
    : [{ id: PROGRAM.code, name: PROGRAM.name, code: PROGRAM.code }];
  const selectedProgram = params.program
    ? programOptions.find((program) => program.id === params.program || program.code === params.program)
    : null;

  let query = supabase
    .from("enrollments")
    .select("*, students(*, profiles(*)), programs(*)")
    .order("submitted_at", { ascending: false });

  if (selectedProgram && selectedProgram.id !== PROGRAM.code) {
    query = query.eq("program_id", selectedProgram.id);
  }

  if (params.year_level && YEAR_LEVELS.includes(params.year_level)) {
    query = query.eq("year_level", params.year_level);
  }

  if (params.semester && SEMESTERS.includes(params.semester)) {
    query = query.eq("semester", params.semester);
  }

  if (params.status && ENROLLMENT_REVIEW_STATUSES.includes(params.status)) {
    query = query.eq("status", params.status);
  }

  const { data } = await query;
  const rows = (data as MasterlistRow[] | null) ?? [];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader
          title="Enrollment Masterlist"
          description="Officially enrolled students and pending or incomplete enrollment records."
          action={<PrintButton label="Print Masterlist" />}
        />
        <form className="print-hidden grid gap-4 lg:grid-cols-[1fr_1fr_1fr_1fr_auto] lg:items-end">
          <SelectInput label="Program" name="program" defaultValue={params.program ?? ""}>
            <option value="">All programs</option>
            {programOptions.map((program) => (
              <option key={program.id} value={program.code ?? program.id}>
                {program.name}
              </option>
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
          <Button type="submit">Apply Filters</Button>
        </form>
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
