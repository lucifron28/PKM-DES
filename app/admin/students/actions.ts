"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import {
  isExactActiveStudentAccount,
  type StudentPasswordResetState,
  validateStudentPasswordResetInput
} from "@/lib/admin-student-records/password-reset";
import { requireRole } from "@/lib/auth/session";
import { normalizeClaimEmail, normalizeStudentId } from "@/lib/account-claim/rules";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import {
  ADMISSION_STATUS_OPTIONS,
  CIVIL_STATUS_OPTIONS,
  GENDER_SEX_OPTIONS,
  STUDENT_TYPE_TAGS,
  YEAR_LEVELS
} from "@/lib/constants/pkm";
import type { EnrollmentStatus, StudentType, YearLevel } from "@/types/database";

const ENROLLMENT_STATUSES: EnrollmentStatus[] = ["NOT ENROLLED", "PENDING", "ENROLLED"];

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function optionalValue(value: FormDataEntryValue | null) {
  const text = String(value ?? "").trim();
  return text || null;
}

function optionalGuidedValue(value: FormDataEntryValue | null, options: string[]) {
  const text = optionalValue(value);
  return text && options.includes(text) ? text : null;
}

function isOptionalGuidedValueValid(value: FormDataEntryValue | null, options: string[]) {
  const text = optionalValue(value);
  return !text || options.includes(text);
}

function isValidIsoDate(value: FormDataEntryValue | null) {
  const text = optionalValue(value);
  if (!text) return true;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return false;

  const [year, month, day] = text.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

function redirectWithError(code: string, path = "/admin/students"): never {
  redirect(`${path}?error=${code}`);
}

function readOfficialRecordInput(formData: FormData) {
  const studentIdNumber = normalizeStudentId(String(formData.get("student_id_number") ?? "")) || null;
  const firstName = String(formData.get("first_name") ?? "").trim();
  const lastName = String(formData.get("last_name") ?? "").trim();
  const email = normalizeClaimEmail(String(formData.get("email") ?? ""));
  const programId = String(formData.get("program_id") ?? "").trim();
  const yearLevel = String(formData.get("year_level") ?? "").trim() as YearLevel;
  const studentType = String(formData.get("student_type") ?? "").trim() as StudentType;
  const enrollmentStatus = String(formData.get("enrollment_status") ?? "").trim() as EnrollmentStatus;

  return {
    studentIdNumber,
    firstName,
    lastName,
    email,
    programId,
    yearLevel,
    studentType,
    enrollmentStatus
  };
}

function validateOfficialRecordInput(
  formData: FormData,
  input: ReturnType<typeof readOfficialRecordInput>
): string | null {
  const { firstName, lastName, email, programId, yearLevel, studentType, enrollmentStatus } = input;

  if (!firstName || !lastName || !email || !programId || !yearLevel || !studentType || !enrollmentStatus) {
    return "missing";
  }

  if (!isValidEmail(email)) {
    return "email";
  }

  if (!YEAR_LEVELS.includes(yearLevel) || !STUDENT_TYPE_TAGS.includes(studentType)) {
    return "invalid";
  }

  if (!ENROLLMENT_STATUSES.includes(enrollmentStatus)) {
    return "invalid";
  }

  if (
    !isOptionalGuidedValueValid(formData.get("gender_sex"), GENDER_SEX_OPTIONS) ||
    !isOptionalGuidedValueValid(formData.get("civil_status"), CIVIL_STATUS_OPTIONS) ||
    !isOptionalGuidedValueValid(formData.get("admission_status"), ADMISSION_STATUS_OPTIONS)
  ) {
    return "invalid";
  }

  if (!isValidIsoDate(formData.get("birthdate"))) {
    return "birthdate";
  }

  return null;
}

async function findDuplicateOfficialRecord(
  supabase: Awaited<ReturnType<typeof requireRole>>["supabase"],
  input: ReturnType<typeof readOfficialRecordInput>,
  recordId?: string
) {
  let emailQuery = supabase.from("official_student_records").select("id").eq("email", input.email);
  let studentIdQuery = input.studentIdNumber
    ? supabase.from("official_student_records").select("id").eq("student_id_number", input.studentIdNumber)
    : null;

  if (recordId) {
    emailQuery = emailQuery.neq("id", recordId);
    studentIdQuery = studentIdQuery?.neq("id", recordId) ?? null;
  }

  const [emailResult, studentIdResult] = await Promise.all([
    emailQuery.maybeSingle(),
    studentIdQuery ? studentIdQuery.maybeSingle() : Promise.resolve({ data: null, error: null })
  ]);

  if (emailResult.error || studentIdResult.error) return "save";
  if (emailResult.data) return "duplicate_email";
  if (studentIdResult.data) return "duplicate_student_id";
  return null;
}

function uniqueConstraintError(error: { code?: string } | null) {
  return error?.code === "23505";
}

function buildOfficialRecordPayload(
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

export async function addOfficialStudentRecordAction(formData: FormData) {
  const { supabase, profile } = await requireRole("admin");
  const input = readOfficialRecordInput(formData);

  const validationError = validateOfficialRecordInput(formData, input);
  if (validationError) {
    redirectWithError(validationError);
  }

  const { data: program, error: programError } = await supabase
    .from("programs")
    .select("id")
    .eq("id", input.programId)
    .maybeSingle();

  if (programError) {
    console.error("official_student_records:programs_load");
    redirectWithError("programs_load");
  }

  if (!program) {
    redirectWithError("program");
  }

  const duplicateError = await findDuplicateOfficialRecord(supabase, input);
  if (duplicateError) {
    redirectWithError(duplicateError);
  }

  const { error } = await supabase.from("official_student_records").insert({
    ...buildOfficialRecordPayload(formData, input, program.id, profile.id),
    created_by: profile.id
  });

  if (error) {
    redirectWithError(uniqueConstraintError(error) ? "duplicate_identity" : "save");
  }

  revalidatePath("/admin/students");
  redirect("/admin/students?created=1");
}

export async function updateOfficialStudentRecordAction(formData: FormData) {
  const { supabase, profile } = await requireRole("admin");
  const recordId = String(formData.get("record_id") ?? "").trim();
  const errorPath = recordId ? `/admin/students/${recordId}/edit` : "/admin/students";
  const input = readOfficialRecordInput(formData);

  if (!recordId) {
    redirectWithError("missing");
  }

  const validationError = validateOfficialRecordInput(formData, input);
  if (validationError) {
    redirectWithError(validationError, errorPath);
  }

  const [{ data: program, error: programError }, { data: existingRecord, error: existingRecordError }] = await Promise.all([
    supabase.from("programs").select("id").eq("id", input.programId).maybeSingle(),
    supabase.from("official_student_records").select("id").eq("id", recordId).maybeSingle()
  ]);

  if (existingRecordError) {
    console.error("official_student_records:records_load");
    redirectWithError("record_load", "/admin/students");
  }

  if (!existingRecord) {
    redirectWithError("not_found", "/admin/students");
  }

  if (programError) {
    console.error("official_student_records:programs_load");
    redirectWithError("programs_load", errorPath);
  }

  if (!program) {
    redirectWithError("program", errorPath);
  }

  const duplicateError = await findDuplicateOfficialRecord(supabase, input, recordId);
  if (duplicateError) {
    redirectWithError(duplicateError, errorPath);
  }

  const { error } = await supabase
    .from("official_student_records")
    .update(buildOfficialRecordPayload(formData, input, program.id, profile.id))
    .eq("id", recordId);

  if (error) {
    redirectWithError(uniqueConstraintError(error) ? "duplicate_identity" : "save", errorPath);
  }

  revalidatePath("/admin/students");
  revalidatePath(`/admin/students/${recordId}/edit`);
  redirect(`/admin/students/${recordId}/edit?updated=1`);
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export async function resetStudentPasswordAction(
  _previousState: StudentPasswordResetState,
  formData: FormData
): Promise<StudentPasswordResetState> {
  const temporaryPassword = String(formData.get("temporary_password") ?? "");
  const confirmTemporaryPassword = String(formData.get("confirm_temporary_password") ?? "");
  const validation = validateStudentPasswordResetInput({
    password: temporaryPassword,
    confirmPassword: confirmTemporaryPassword
  });

  if (validation.message) {
    return validation;
  }

  const officialRecordId = String(formData.get("official_record_id") ?? "").trim();
  if (!isUuid(officialRecordId)) {
    return { message: "Student account could not be verified. Refresh the record and try again." };
  }

  const { supabase, profile: adminProfile } = await requireRole("admin");
  const { data: officialRecord, error: officialRecordError } = await supabase
    .from("official_student_records")
    .select("id, email, student_id_number")
    .eq("id", officialRecordId)
    .maybeSingle();

  if (officialRecordError) {
    console.error("student_password_reset:official_record_load");
    return { message: "Student account could not be verified. Please try again." };
  }

  if (!officialRecord?.student_id_number) {
    return { message: "This official record does not have a linked student account to reset." };
  }

  const { data: student, error: studentError } = await supabase
    .from("students")
    .select("profile_id, student_id_number")
    .eq("student_id_number", officialRecord.student_id_number)
    .maybeSingle();

  if (studentError) {
    console.error("student_password_reset:student_load");
    return { message: "Student account could not be verified. Please try again." };
  }

  if (!student) {
    return { message: "This official record does not have a linked student account to reset." };
  }

  const { data: studentProfile, error: studentProfileError } = await supabase
    .from("profiles")
    .select("id, email, role, account_status")
    .eq("id", student.profile_id)
    .maybeSingle();

  if (studentProfileError) {
    console.error("student_password_reset:profile_load");
    return { message: "Student account could not be verified. Please try again." };
  }

  if (!studentProfile) {
    return { message: "This official record does not have a linked student account to reset." };
  }

  if (!isExactActiveStudentAccount({
    officialEmail: officialRecord.email,
    officialStudentId: officialRecord.student_id_number,
    accountEmail: studentProfile.email,
    accountStudentId: student.student_id_number,
    accountRole: studentProfile.role,
    accountStatus: studentProfile.account_status
  })) {
    return { message: "This official record does not have an exact active student account to reset." };
  }

  let admin;
  try {
    admin = createSupabaseAdminClient();
  } catch {
    console.error("student_password_reset:admin_client_unavailable");
    return { message: "Student password reset is not configured for this environment." };
  }

  const { data: authLookup, error: authLookupError } = await admin.auth.admin.getUserById(studentProfile.id);
  if (
    authLookupError ||
    !authLookup.user ||
    authLookup.user.id !== studentProfile.id ||
    authLookup.user.email?.trim().toLowerCase() !== studentProfile.email.trim().toLowerCase()
  ) {
    console.error("student_password_reset:auth_user_verification");
    return { message: "Student account could not be verified. Please try again." };
  }

  const { error: resetError } = await admin.auth.admin.updateUserById(studentProfile.id, {
    password: temporaryPassword
  });

  if (resetError) {
    console.error("student_password_reset:auth_password_update");
    return { message: "Student password could not be reset. Please try again." };
  }

  const { error: auditError } = await supabase.from("audit_logs").insert({
    actor_profile_id: adminProfile.id,
    action: "RESET_STUDENT_PASSWORD",
    target_table: "profiles",
    target_id: studentProfile.id
  });

  if (auditError) {
    console.error("student_password_reset:audit_log");
  }

  revalidatePath("/admin/students");
  revalidatePath(`/admin/students/${officialRecordId}/edit`);
  return { success: true, message: "Student password reset. Share the temporary password privately." };
}
