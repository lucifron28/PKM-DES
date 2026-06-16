import { Badge, enrollmentBadgeTone } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { SelectInput, TextArea, TextInput } from "@/components/ui/field";
import { SimpleTable } from "@/components/tables/simple-table";
import { addOfficialStudentRecordAction } from "./actions";
import { requireRole } from "@/lib/auth/session";
import { STUDENT_TYPE_TAGS, YEAR_LEVELS } from "@/lib/constants/pkm";
import { formatDate, formatName } from "@/lib/utils/format";
import type { EnrollmentStatus, OfficialStudentRecord, Program } from "@/types/database";

const ENROLLMENT_STATUSES: EnrollmentStatus[] = ["NOT ENROLLED", "PENDING", "ENROLLED"];

const errorMessages: Record<string, string> = {
  missing: "Please complete all required official record fields.",
  email: "Please enter a valid active email address.",
  invalid: "Please choose valid dropdown values.",
  program: "Selected program was not found.",
  save: "Official student record could not be saved. Please check for duplicate email or Student ID Number."
};

type OfficialStudentRecordRow = OfficialStudentRecord & {
  programs?: Program | null;
};

export default async function StudentRecordsPage({
  searchParams
}: {
  searchParams?: Promise<{ created?: string; error?: string }>;
}) {
  const { supabase } = await requireRole("admin");
  const params = (await searchParams) ?? {};
  const [{ data: programsData }, { data: recordsData }] = await Promise.all([
    supabase.from("programs").select("*").order("name"),
    supabase
      .from("official_student_records")
      .select("*, programs(*)")
      .order("created_at", { ascending: false })
      .limit(50)
  ]);

  const programs = (programsData as Program[] | null) ?? [];
  const records = (recordsData as OfficialStudentRecordRow[] | null) ?? [];

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
        {params.error ? (
          <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
            {errorMessages[params.error] ?? "Official student record could not be saved."}
          </div>
        ) : null}
        <form action={addOfficialStudentRecordAction} className="grid gap-4 lg:grid-cols-3">
          <TextInput label="Student ID Number" name="student_id_number" placeholder="23-00340" />
          <TextInput label="First Name" name="first_name" required />
          <TextInput label="Last Name" name="last_name" required />
          <TextInput label="Active Email Address" name="email" type="email" required />
          <SelectInput label="Program" name="program_id" required defaultValue={programs[0]?.id ?? ""}>
            {programs.length ? null : <option value="">No programs configured</option>}
            {programs.map((program) => (
              <option key={program.id} value={program.id}>
                {program.name}
              </option>
            ))}
          </SelectInput>
          <SelectInput label="Year Level" name="year_level" required defaultValue="">
            <option value="" disabled>Select year level</option>
            {YEAR_LEVELS.map((year) => (
              <option key={year} value={year}>{year}</option>
            ))}
          </SelectInput>
          <SelectInput label="Student Type / Classification" name="student_type" required defaultValue="">
            <option value="" disabled>Select student type</option>
            {STUDENT_TYPE_TAGS.map((studentType) => (
              <option key={studentType} value={studentType}>{studentType}</option>
            ))}
          </SelectInput>
          <TextInput label="Birthdate" name="birthdate" type="date" />
          <TextInput label="Gender/Sex" name="gender_sex" />
          <TextInput label="Contact Number" name="contact_number" />
          <TextInput label="Guardian" name="guardian" />
          <TextInput label="Emergency Contact Person" name="emergency_contact_person" />
          <TextInput label="Nationality" name="nationality" />
          <TextInput label="Civil Status" name="civil_status" />
          <TextInput label="Admission Status" name="admission_status" />
          <SelectInput label="Enrollment Status" name="enrollment_status" required defaultValue="NOT ENROLLED">
            {ENROLLMENT_STATUSES.map((status) => (
              <option key={status} value={status}>{status}</option>
            ))}
          </SelectInput>
          <TextArea label="Address" name="address" className="lg:col-span-2" />
          <TextArea label="Previous School Information" name="previous_school_information" className="lg:col-span-2" />
          <div className="flex items-end">
            <Button type="submit" className="w-full">Save Official Record</Button>
          </div>
        </form>
      </Card>

      <Card>
        <CardHeader
          title="Recent Official Records"
          description="Latest Registrar-managed records. Account matching will be connected in a separate feature branch."
        />
        {records.length ? (
          <SimpleTable
            columns={["Student name", "Student ID", "Email", "Program", "Year Level", "Type", "Enrollment", "Created"]}
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
              formatDate(record.created_at)
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
