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
import type { OfficialRecordFormState } from "./official-record-service";
import { findDuplicateOfficialRecord, updateOfficialStudentRecordAndSyncRpc } from "./repository";

export type SynchronizationServiceResult = OfficialRecordFormState & {
  emailMismatch?: boolean;
  recordId?: string;
};

export async function updateOfficialRecordAndSyncService(
  supabase: SupabaseClient,
  formData: FormData
): Promise<SynchronizationServiceResult> {
  const recordId = String(formData.get("record_id") ?? "").trim();
  const input = readOfficialRecordInput(formData);
  const submittedValues = extractSubmittedValues(formData);

  if (!recordId) {
    return { message: "Record ID is missing.", submittedValues };
  }

  const validationResult = validateOfficialRecordInputWithErrors(formData, input);
  if (validationResult) {
    return {
      message: validationResult.message,
      fieldErrors: validationResult.fieldErrors,
      submittedValues
    };
  }

  const [{ data: program, error: programError }, { data: existingRecord, error: existingRecordError }] = await Promise.all([
    supabase.from("programs").select("id").eq("id", input.programId).maybeSingle(),
    supabase.from("official_student_records").select("id").eq("id", recordId).maybeSingle()
  ]);

  if (existingRecordError || !existingRecord) {
    return { message: "Official student record not found.", submittedValues };
  }

  if (programError || !program) {
    return {
      message: "Selected program is not valid.",
      fieldErrors: { program_id: "Selected program is invalid." },
      submittedValues
    };
  }

  const duplicateError = await findDuplicateOfficialRecord(supabase, input, recordId);
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

  const { data: syncResult, error: syncError } = await updateOfficialStudentRecordAndSyncRpc(supabase, {
    p_record_id: recordId,
    p_student_id_number: input.studentIdNumber || null,
    p_first_name: input.firstName,
    p_last_name: input.lastName,
    p_email: input.email,
    p_program_id: program.id,
    p_year_level: input.yearLevel,
    p_student_type: input.studentType,
    p_birthdate: optionalValue(formData.get("birthdate")),
    p_gender_sex: optionalGuidedValue(formData.get("gender_sex"), GENDER_SEX_OPTIONS),
    p_address: optionalValue(formData.get("address")),
    p_contact_number: optionalValue(formData.get("contact_number")),
    p_guardian: optionalValue(formData.get("guardian")),
    p_emergency_contact_person: optionalValue(formData.get("emergency_contact_person")),
    p_nationality: optionalValue(formData.get("nationality")),
    p_civil_status: optionalGuidedValue(formData.get("civil_status"), CIVIL_STATUS_OPTIONS),
    p_previous_school_information: optionalValue(formData.get("previous_school_information")),
    p_admission_status: optionalGuidedValue(formData.get("admission_status"), ADMISSION_STATUS_OPTIONS),
    p_enrollment_status: input.enrollmentStatus
  });

  if (syncError || !syncResult) {
    console.error("official_student_records:sync_rpc_failed", syncError);
    return { message: "Official student record could not be updated.", submittedValues };
  }

  if (syncResult.outcome === "student_id_conflict") {
    return {
      message: "Student ID Number is already in use by another record or student account.",
      fieldErrors: { student_id_number: "Student ID Number is already in use." },
      submittedValues
    };
  }

  if (syncResult.outcome !== "updated") {
    return { message: "Official student record could not be updated.", submittedValues };
  }

  return {
    success: true,
    recordId,
    emailMismatch: syncResult.email_mismatch
  };
}
