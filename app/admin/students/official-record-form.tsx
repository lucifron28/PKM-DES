"use client";

import { useActionState } from "react";
import { Button, ButtonLink } from "@/components/ui/button";
import { SelectInput, TextArea, TextInput } from "@/components/ui/field";
import {
  ADMISSION_STATUS_OPTIONS,
  CIVIL_STATUS_OPTIONS,
  GENDER_SEX_OPTIONS,
  STUDENT_TYPE_TAGS,
  YEAR_LEVELS
} from "@/lib/constants/pkm";
import type { EnrollmentStatus, OfficialStudentRecord, Program } from "@/types/database";

const ENROLLMENT_STATUSES: EnrollmentStatus[] = ["NOT ENROLLED", "PENDING", "ENROLLED"];

export type OfficialRecordFormState = {
  message?: string;
  fieldErrors?: Record<string, string>;
  submittedValues?: Record<string, string>;
};

const initialState: OfficialRecordFormState = {};

export function OfficialStudentRecordForm({
  action,
  programs,
  record,
  submitLabel
}: {
  action: (state: OfficialRecordFormState, formData: FormData) => Promise<OfficialRecordFormState>;
  programs: Program[];
  record?: OfficialStudentRecord | null;
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState(action, initialState);

  const bsaisProgram = programs.find(
    (p) =>
      (p.code ?? "").trim().toUpperCase() === "BSAIS" ||
      (p.name ?? "").trim().toUpperCase().includes("ACCOUNTING INFORMATION")
  );

  const defaultProgramId = record ? record.program_id : bsaisProgram?.id ?? "";

  const getValue = (key: string, fallback: string | null | undefined) => {
    if (state.submittedValues && key in state.submittedValues) {
      return state.submittedValues[key];
    }
    return fallback ?? "";
  };

  return (
    <form action={formAction} className="grid gap-4 lg:grid-cols-3">
      {record ? <input type="hidden" name="record_id" value={record.id} /> : null}
      {state.message ? (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-800 lg:col-span-3" role="alert">
          {state.message}
        </div>
      ) : null}
      <div>
        <TextInput
          label="Student ID Number"
          name="student_id_number"
          placeholder="23-00340"
          defaultValue={getValue("student_id_number", record?.student_id_number)}
          error={state.fieldErrors?.student_id_number}
        />
        <p className="mt-1 text-xs text-slateui-muted">
          Records without a Student ID cannot use the current exact-match account-claim flow.
        </p>
      </div>
      <TextInput
        label="First Name"
        name="first_name"
        required
        defaultValue={getValue("first_name", record?.first_name)}
        error={state.fieldErrors?.first_name}
      />
      <TextInput
        label="Last Name"
        name="last_name"
        required
        defaultValue={getValue("last_name", record?.last_name)}
        error={state.fieldErrors?.last_name}
      />
      <TextInput
        label="Active Email Address"
        name="email"
        type="email"
        required
        defaultValue={getValue("email", record?.email)}
        error={state.fieldErrors?.email}
      />
      <div>
        <SelectInput
          label="Program"
          name="program_id"
          required
          defaultValue={getValue("program_id", defaultProgramId)}
          error={state.fieldErrors?.program_id}
        >
          <option value="" disabled>{programs.length ? "Select program" : "No programs configured"}</option>
          {programs.map((program) => (
            <option key={program.id} value={program.id}>
              {program.name}
            </option>
          ))}
        </SelectInput>
        {!record && !bsaisProgram ? (
          <p className="mt-1 text-xs text-red-700">
            BSAIS program configuration is unavailable. Please verify program settings.
          </p>
        ) : null}
      </div>
      <SelectInput
        label="Year Level"
        name="year_level"
        required
        defaultValue={getValue("year_level", record?.year_level)}
        error={state.fieldErrors?.year_level}
      >
        <option value="" disabled>Select year level</option>
        {YEAR_LEVELS.map((year) => (
          <option key={year} value={year}>{year}</option>
        ))}
      </SelectInput>
      <div>
        <SelectInput
          label="Student Type / Classification"
          name="student_type"
          required
          defaultValue={getValue("student_type", record?.student_type)}
          error={state.fieldErrors?.student_type}
        >
          <option value="" disabled>Select student type</option>
          {STUDENT_TYPE_TAGS.map((type) => (
            <option key={type} value={type}>{type}</option>
          ))}
        </SelectInput>
        <p className="mt-1 text-xs text-slateui-muted">
          Health Record Update applies to students classified as Incoming 1st Year Student with Female in the official record.
        </p>
      </div>
      <TextInput
        label="Birthdate"
        name="birthdate"
        type="date"
        defaultValue={getValue("birthdate", record?.birthdate)}
        error={state.fieldErrors?.birthdate}
      />
      <SelectInput
        label="Gender/Sex"
        name="gender_sex"
        defaultValue={getValue("gender_sex", record?.gender_sex)}
        error={state.fieldErrors?.gender_sex}
      >
        <option value="">Select gender/sex</option>
        {GENDER_SEX_OPTIONS.map((option) => (
          <option key={option} value={option}>{option}</option>
        ))}
      </SelectInput>
      <TextInput
        label="Contact Number"
        name="contact_number"
        defaultValue={getValue("contact_number", record?.contact_number)}
        error={state.fieldErrors?.contact_number}
      />
      <TextInput
        label="Guardian"
        name="guardian"
        defaultValue={getValue("guardian", record?.guardian)}
        error={state.fieldErrors?.guardian}
      />
      <TextInput
        label="Emergency Contact Person"
        name="emergency_contact_person"
        defaultValue={getValue("emergency_contact_person", record?.emergency_contact_person)}
        error={state.fieldErrors?.emergency_contact_person}
      />
      <TextInput
        label="Nationality"
        name="nationality"
        defaultValue={getValue("nationality", record?.nationality)}
        error={state.fieldErrors?.nationality}
      />
      <SelectInput
        label="Civil Status"
        name="civil_status"
        defaultValue={getValue("civil_status", record?.civil_status)}
        error={state.fieldErrors?.civil_status}
      >
        <option value="">Select civil status</option>
        {CIVIL_STATUS_OPTIONS.map((option) => (
          <option key={option} value={option}>{option}</option>
        ))}
      </SelectInput>
      <SelectInput
        label="Admission Status"
        name="admission_status"
        defaultValue={getValue("admission_status", record?.admission_status)}
        error={state.fieldErrors?.admission_status}
      >
        <option value="">Select admission status</option>
        {ADMISSION_STATUS_OPTIONS.map((option) => (
          <option key={option} value={option}>{option}</option>
        ))}
      </SelectInput>
      <div>
        <SelectInput
          label="Official Record Enrollment Status"
          name="enrollment_status"
          required
          defaultValue={getValue("enrollment_status", record?.enrollment_status ?? "NOT ENROLLED")}
          error={state.fieldErrors?.enrollment_status}
        >
        {ENROLLMENT_STATUSES.map((status) => (
          <option key={status} value={status}>{status}</option>
        ))}
        </SelectInput>
        <p className="mt-1 text-xs text-slateui-muted">
          This Registrar source value does not create, approve, reject, or update an Online Enrollment request.
        </p>
      </div>
      <TextArea
        label="Address"
        name="address"
        containerClassName="lg:col-span-2"
        defaultValue={getValue("address", record?.address)}
        error={state.fieldErrors?.address}
      />
      <TextArea
        label="Previous School Information"
        name="previous_school_information"
        containerClassName="lg:col-span-2"
        defaultValue={getValue("previous_school_information", record?.previous_school_information)}
        error={state.fieldErrors?.previous_school_information}
      />
      <div className="flex items-end gap-3 lg:col-span-3">
        {record ? (
          <ButtonLink href="/admin/students" variant="outline" className="w-full">Cancel</ButtonLink>
        ) : null}
        <Button type="submit" disabled={pending} className="w-full">
          {pending ? "Saving..." : submitLabel}
        </Button>
      </div>
    </form>
  );
}
