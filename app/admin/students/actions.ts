"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/session";
import {
  ADMISSION_STATUS_OPTIONS,
  CIVIL_STATUS_OPTIONS,
  GENDER_SEX_OPTIONS,
  STUDENT_TYPE_TAGS,
  YEAR_LEVELS
} from "@/lib/constants/pkm";
import type { EnrollmentStatus, StudentType, YearLevel } from "@/types/database";

const ENROLLMENT_STATUSES: EnrollmentStatus[] = ["NOT ENROLLED", "PENDING", "ENROLLED"];

export const OFFICIAL_RECORD_ERROR_MESSAGES: Record<string, string> = {
  missing: "Please complete all required official record fields.",
  email: "Please enter a valid active email address.",
  invalid: "Please choose valid dropdown values.",
  program: "Selected program was not found.",
  not_found: "Official student record was not found.",
  save: "Official student record could not be saved. Please check for duplicate email or Student ID Number."
};

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

function redirectWithError(code: string, path = "/admin/students"): never {
  redirect(`${path}?error=${code}`);
}

function readOfficialRecordInput(formData: FormData) {
  const studentIdNumber = optionalValue(formData.get("student_id_number"));
  const firstName = String(formData.get("first_name") ?? "").trim();
  const lastName = String(formData.get("last_name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
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

function validateOfficialRecordInput(input: ReturnType<typeof readOfficialRecordInput>, errorPath = "/admin/students") {
  const { firstName, lastName, email, programId, yearLevel, studentType, enrollmentStatus } = input;

  if (!firstName || !lastName || !email || !programId || !yearLevel || !studentType || !enrollmentStatus) {
    redirectWithError("missing", errorPath);
  }

  if (!isValidEmail(email)) {
    redirectWithError("email", errorPath);
  }

  if (!YEAR_LEVELS.includes(yearLevel) || !STUDENT_TYPE_TAGS.includes(studentType)) {
    redirectWithError("invalid", errorPath);
  }

  if (!ENROLLMENT_STATUSES.includes(enrollmentStatus)) {
    redirectWithError("invalid", errorPath);
  }
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

  validateOfficialRecordInput(input);

  const { data: program } = await supabase
    .from("programs")
    .select("id")
    .eq("id", input.programId)
    .maybeSingle();

  if (!program) {
    redirectWithError("program");
  }

  const { error } = await supabase.from("official_student_records").insert({
    ...buildOfficialRecordPayload(formData, input, program.id, profile.id),
    created_by: profile.id
  });

  if (error) {
    redirectWithError("save");
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

  validateOfficialRecordInput(input, errorPath);

  const [{ data: program }, { data: existingRecord }] = await Promise.all([
    supabase.from("programs").select("id").eq("id", input.programId).maybeSingle(),
    supabase.from("official_student_records").select("id").eq("id", recordId).maybeSingle()
  ]);

  if (!existingRecord) {
    redirectWithError("not_found", "/admin/students");
  }

  if (!program) {
    redirectWithError("program", errorPath);
  }

  const { error } = await supabase
    .from("official_student_records")
    .update(buildOfficialRecordPayload(formData, input, program.id, profile.id))
    .eq("id", recordId);

  if (error) {
    redirectWithError("save", errorPath);
  }

  revalidatePath("/admin/students");
  revalidatePath(`/admin/students/${recordId}/edit`);
  redirect(`/admin/students/${recordId}/edit?updated=1`);
}
