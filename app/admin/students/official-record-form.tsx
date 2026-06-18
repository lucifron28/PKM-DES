import { Button, ButtonLink } from "@/components/ui/button";
import { SelectInput, TextArea, TextInput } from "@/components/ui/field";
import { STUDENT_TYPE_TAGS, YEAR_LEVELS } from "@/lib/constants/pkm";
import type { EnrollmentStatus, OfficialStudentRecord, Program } from "@/types/database";

const ENROLLMENT_STATUSES: EnrollmentStatus[] = ["NOT ENROLLED", "PENDING", "ENROLLED"];

export function OfficialStudentRecordForm({
  action,
  programs,
  record,
  submitLabel
}: {
  action: (formData: FormData) => void | Promise<void>;
  programs: Program[];
  record?: OfficialStudentRecord | null;
  submitLabel: string;
}) {
  return (
    <form action={action} className="grid gap-4 lg:grid-cols-3">
      {record ? <input type="hidden" name="record_id" value={record.id} /> : null}
      <TextInput label="Student ID Number" name="student_id_number" placeholder="23-00340" defaultValue={record?.student_id_number ?? ""} />
      <TextInput label="First Name" name="first_name" required defaultValue={record?.first_name ?? ""} />
      <TextInput label="Last Name" name="last_name" required defaultValue={record?.last_name ?? ""} />
      <TextInput label="Active Email Address" name="email" type="email" required defaultValue={record?.email ?? ""} />
      <SelectInput label="Program" name="program_id" required defaultValue={record?.program_id ?? programs[0]?.id ?? ""}>
        {programs.length ? null : <option value="">No programs configured</option>}
        {programs.map((program) => (
          <option key={program.id} value={program.id}>
            {program.name}
          </option>
        ))}
      </SelectInput>
      <SelectInput label="Year Level" name="year_level" required defaultValue={record?.year_level ?? ""}>
        <option value="" disabled>Select year level</option>
        {YEAR_LEVELS.map((year) => (
          <option key={year} value={year}>{year}</option>
        ))}
      </SelectInput>
      <SelectInput label="Student Type / Classification" name="student_type" required defaultValue={record?.student_type ?? ""}>
        <option value="" disabled>Select student type</option>
        {STUDENT_TYPE_TAGS.map((studentType) => (
          <option key={studentType} value={studentType}>{studentType}</option>
        ))}
      </SelectInput>
      <TextInput label="Birthdate" name="birthdate" type="date" defaultValue={record?.birthdate ?? ""} />
      <TextInput label="Gender/Sex" name="gender_sex" defaultValue={record?.gender_sex ?? ""} />
      <TextInput label="Contact Number" name="contact_number" defaultValue={record?.contact_number ?? ""} />
      <TextInput label="Guardian" name="guardian" defaultValue={record?.guardian ?? ""} />
      <TextInput label="Emergency Contact Person" name="emergency_contact_person" defaultValue={record?.emergency_contact_person ?? ""} />
      <TextInput label="Nationality" name="nationality" defaultValue={record?.nationality ?? ""} />
      <TextInput label="Civil Status" name="civil_status" defaultValue={record?.civil_status ?? ""} />
      <TextInput label="Admission Status" name="admission_status" defaultValue={record?.admission_status ?? ""} />
      <SelectInput label="Enrollment Status" name="enrollment_status" required defaultValue={record?.enrollment_status ?? "NOT ENROLLED"}>
        {ENROLLMENT_STATUSES.map((status) => (
          <option key={status} value={status}>{status}</option>
        ))}
      </SelectInput>
      <TextArea label="Address" name="address" className="lg:col-span-2" defaultValue={record?.address ?? ""} />
      <TextArea
        label="Previous School Information"
        name="previous_school_information"
        className="lg:col-span-2"
        defaultValue={record?.previous_school_information ?? ""}
      />
      <div className="flex items-end gap-3">
        {record ? (
          <ButtonLink href="/admin/students" variant="outline" className="w-full">Cancel</ButtonLink>
        ) : null}
        <Button type="submit" className="w-full">{submitLabel}</Button>
      </div>
    </form>
  );
}
