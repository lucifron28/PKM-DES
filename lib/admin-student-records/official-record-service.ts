import type { SupabaseClient } from "@supabase/supabase-js";
import {
  ADMISSION_STATUS_OPTIONS,
  CIVIL_STATUS_OPTIONS,
  GENDER_SEX_OPTIONS
} from "@/lib/constants/pkm";
import {
  extractSubmittedValues,
  optionalGuidedValue,
  optionalValue,
  readOfficialRecordInput,
  validateOfficialRecordInputWithErrors
} from "./input";
import { findDuplicateOfficialRecord, insertOfficialStudentRecord } from "./repository";

export type OfficialRecordFormState = {
  success?: boolean;
  message?: string;
  fieldErrors?: Record<string, string>;
  submittedValues?: Record<string, string>;
};

export function buildOfficialRecordPayload(
  formData: FormData,
  input: ReturnType<typeof readOfficialRecordInput>,
  programId: string,
  profileId: string
) {
  return {
    student_id_number: input.studentIdNumber,
    first_name: input.firstName,
    last_name: input.lastName,
    email: input.email,
    program_id: programId,
    year_level: input.yearLevel,
    student_type: input.studentType,
    birthdate: optionalValue(formData.get("birthdate")),
    gender_sex: optionalGuidedValue(formData.get("gender_sex"), GENDER_SEX_OPTIONS),
    address: optionalValue(formData.get("address")),
    contact_number: optionalValue(formData.get("contact_number")),
    guardian: optionalValue(formData.get("guardian")),
    emergency_contact_person: optionalValue(formData.get("emergency_contact_person")),
    nationality: optionalValue(formData.get("nationality")),
    civil_status: optionalGuidedValue(formData.get("civil_status"), CIVIL_STATUS_OPTIONS),
    previous_school_information: optionalValue(formData.get("previous_school_information")),
    admission_status: optionalGuidedValue(formData.get("admission_status"), ADMISSION_STATUS_OPTIONS),
    enrollment_status: input.enrollmentStatus,
    updated_by: profileId
  };
}

export async function addOfficialRecordService(
  supabase: SupabaseClient,
  profileId: string,
  formData: FormData
): Promise<OfficialRecordFormState> {
  const input = readOfficialRecordInput(formData);
  const submittedValues = extractSubmittedValues(formData);

  const validationResult = validateOfficialRecordInputWithErrors(formData, input);
  if (validationResult) {
    return {
      message: validationResult.message,
      fieldErrors: validationResult.fieldErrors,
      submittedValues
    };
  }

  const { data: program, error: programError } = await supabase
    .from("programs")
    .select("id")
    .eq("id", input.programId)
    .maybeSingle();

  if (programError || !program) {
    return {
      message: "Selected program is not valid.",
      fieldErrors: { program_id: "Selected program is invalid." },
      submittedValues
    };
  }

  const duplicateError = await findDuplicateOfficialRecord(supabase, input);
  if (duplicateError === "duplicate_email") {
    return {
      message: "Email address is already in use by another official record.",
      fieldErrors: { email: "Email address is already in use." },
      submittedValues
    };
  }
  if (duplicateError === "duplicate_student_id") {
    return {
      message: "Student ID Number is already in use by another official record.",
      fieldErrors: { student_id_number: "Student ID Number is already in use." },
      submittedValues
    };
  }

  const payload = {
    ...buildOfficialRecordPayload(formData, input, program.id, profileId),
    created_by: profileId
  };

  const { error } = await insertOfficialStudentRecord(supabase, payload);

  if (error) {
    return {
      message: "Official student record could not be saved. Please try again.",
      submittedValues
    };
  }

  return { success: true };
}
