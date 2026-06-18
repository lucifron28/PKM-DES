import { Badge, enrollmentBadgeTone } from "@/components/ui/badge";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { SelectInput, TextInput } from "@/components/ui/field";
import { SimpleTable } from "@/components/tables/simple-table";
import { OfficialStudentRecordForm } from "./official-record-form";
import { addOfficialStudentRecordAction } from "./actions";
import { requireRole } from "@/lib/auth/session";
import { STUDENT_TYPE_TAGS, YEAR_LEVELS } from "@/lib/constants/pkm";
import { formatDate, formatName } from "@/lib/utils/format";
import type { EnrollmentStatus, OfficialStudentRecord, Program, StudentType, YearLevel } from "@/types/database";

const ENROLLMENT_STATUSES: EnrollmentStatus[] = ["NOT ENROLLED", "PENDING", "ENROLLED"];

const errorMessages: Record<string, string> = {
  missing: "Please complete all required official record fields.",
  email: "Please enter a valid active email address.",
  invalid: "Please choose valid dropdown values.",
  program: "Selected program was not found.",
  not_found: "Official student record was not found.",
  save: "Official student record could not be saved. Please check for duplicate email or Student ID Number."
};

type OfficialStudentRecordRow = OfficialStudentRecord & {
  programs?: Program | null;
};

export default async function StudentRecordsPage({
  searchParams
}: {
  searchParams?: Promise<{
    created?: string;
    updated?: string;
    error?: string;
    q?: string;
    program_id?: string;
    year_level?: string;
    student_type?: string;
    enrollment_status?: string;
  }>;
}) {
  const { supabase } = await requireRole("admin");
  const params = (await searchParams) ?? {};
  const { data: programsData } = await supabase.from("programs").select("*").order("name");
  const programs = (programsData as Program[] | null) ?? [];
  const selectedProgramId = programs.some((program) => program.id === params.program_id) ? params.program_id : "";
  const selectedYearLevel = YEAR_LEVELS.includes(params.year_level as YearLevel) ? params.year_level : "";
  const selectedStudentType = STUDENT_TYPE_TAGS.includes(params.student_type as StudentType) ? params.student_type : "";
  const selectedEnrollmentStatus = ENROLLMENT_STATUSES.includes(params.enrollment_status as EnrollmentStatus)
    ? params.enrollment_status
    : "";

  let recordsQuery = supabase
    .from("official_student_records")
    .select("*, programs(*)")
    .order("updated_at", { ascending: false })
    .limit(100);

  if (selectedProgramId) {
    recordsQuery = recordsQuery.eq("program_id", selectedProgramId);
  }

  if (selectedYearLevel) {
    recordsQuery = recordsQuery.eq("year_level", selectedYearLevel);
  }

  if (selectedStudentType) {
    recordsQuery = recordsQuery.eq("student_type", selectedStudentType);
  }

  if (selectedEnrollmentStatus) {
    recordsQuery = recordsQuery.eq("enrollment_status", selectedEnrollmentStatus);
  }

  const { data: recordsData } = await recordsQuery;
  const searchTerm = String(params.q ?? "").trim().toLowerCase();
  const allRecords = (recordsData as OfficialStudentRecordRow[] | null) ?? [];
  const records = searchTerm
    ? allRecords.filter((record) =>
        [
          record.first_name,
          record.last_name,
          record.email,
          record.student_id_number ?? ""
        ]
          .join(" ")
          .toLowerCase()
          .includes(searchTerm)
      )
    : allRecords;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader
          title="Official Student Records"
          description="Registrar-managed records used as the future source for account matching."
        />
        {params.created ? (
          <div className="mb-4 rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm font-semibold text-green-700">
            Official student record saved.
          </div>
        ) : null}
        {params.updated ? (
          <div className="mb-4 rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm font-semibold text-green-700">
            Official student record updated.
          </div>
        ) : null}
        {params.error ? (
          <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
            {errorMessages[params.error] ?? "Official student record could not be saved."}
          </div>
        ) : null}
        <OfficialStudentRecordForm action={addOfficialStudentRecordAction} programs={programs} submitLabel="Save Official Record" />
      </Card>

      <Card>
        <CardHeader
          title="Official Records"
          description="Search, filter, and edit Registrar-managed records used for account matching."
        />
        <form className="mb-5 grid gap-4 lg:grid-cols-[1.3fr_1fr_1fr_1fr_1fr_auto_auto] lg:items-end">
          <TextInput label="Search" name="q" placeholder="Name, email, or Student ID" defaultValue={params.q ?? ""} />
          <SelectInput label="Program" name="program_id" defaultValue={selectedProgramId}>
            <option value="">All programs</option>
            {programs.map((program) => (
              <option key={program.id} value={program.id}>{program.name}</option>
            ))}
          </SelectInput>
          <SelectInput label="Year Level" name="year_level" defaultValue={selectedYearLevel}>
            <option value="">All year levels</option>
            {YEAR_LEVELS.map((year) => (
              <option key={year} value={year}>{year}</option>
            ))}
          </SelectInput>
          <SelectInput label="Classification" name="student_type" defaultValue={selectedStudentType}>
            <option value="">All types</option>
            {STUDENT_TYPE_TAGS.map((studentType) => (
              <option key={studentType} value={studentType}>{studentType}</option>
            ))}
          </SelectInput>
          <SelectInput label="Enrollment" name="enrollment_status" defaultValue={selectedEnrollmentStatus}>
            <option value="">All statuses</option>
            {ENROLLMENT_STATUSES.map((status) => (
              <option key={status} value={status}>{status}</option>
            ))}
          </SelectInput>
          <Button type="submit">Apply</Button>
          <ButtonLink href="/admin/students" variant="outline">Reset</ButtonLink>
        </form>
        {records.length ? (
          <SimpleTable
            columns={["Student name", "Student ID", "Email", "Program", "Year Level", "Type", "Enrollment", "Updated", "Action"]}
            rows={records.map((record) => [
              formatName(record.first_name, record.last_name),
              record.student_id_number ?? "Not provided",
              record.email,
              record.programs?.name ?? "Not available",
              record.year_level,
              record.student_type,
              <Badge key={record.id} tone={enrollmentBadgeTone(record.enrollment_status)}>
                {record.enrollment_status}
              </Badge>,
              formatDate(record.updated_at),
              <ButtonLink
                key={`${record.id}-edit`}
                href={`/admin/students/${record.id}/edit`}
                variant="outline"
                className="min-h-9 px-3 py-1.5"
              >
                Edit
              </ButtonLink>
            ])}
          />
        ) : (
          <EmptyState
            title="No official student records found."
            description="Add the first Registrar-managed record above. CSV import will be added after PKM provides the official file format."
          />
        )}
      </Card>
    </div>
  );
}
