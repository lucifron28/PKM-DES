"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/session";
import { STUDENT_TYPE_TAGS, YEAR_LEVELS } from "@/lib/constants/pkm";
import type { EnrollmentStatus, StudentType, YearLevel } from "@/types/database";

const ENROLLMENT_STATUSES: EnrollmentStatus[] = ["NOT ENROLLED", "PENDING", "ENROLLED"];

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function optionalValue(value: FormDataEntryValue | null) {
  const text = String(value ?? "").trim();
  return text || null;
}

function redirectWithError(code: string): never {
  redirect(`/admin/students?error=${code}`);
}

export async function addOfficialStudentRecordAction(formData: FormData) {
  const { supabase, profile } = await requireRole("admin");

  const studentIdNumber = optionalValue(formData.get("student_id_number"));
  const firstName = String(formData.get("first_name") ?? "").trim();
  const lastName = String(formData.get("last_name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const programId = String(formData.get("program_id") ?? "").trim();
  const yearLevel = String(formData.get("year_level") ?? "").trim() as YearLevel;
  const studentType = String(formData.get("student_type") ?? "").trim() as StudentType;
  const enrollmentStatus = String(formData.get("enrollment_status") ?? "").trim() as EnrollmentStatus;

  if (!firstName || !lastName || !email || !programId || !yearLevel || !studentType || !enrollmentStatus) {
    redirectWithError("missing");
  }

  if (!isValidEmail(email)) {
    redirectWithError("email");
  }

  if (!YEAR_LEVELS.includes(yearLevel) || !STUDENT_TYPE_TAGS.includes(studentType)) {
    redirectWithError("invalid");
  }

  if (!ENROLLMENT_STATUSES.includes(enrollmentStatus)) {
    redirectWithError("invalid");
  }

  const { data: program } = await supabase
    .from("programs")
    .select("id")
    .eq("id", programId)
    .maybeSingle();

  if (!program) {
    redirectWithError("program");
  }

  const { error } = await supabase.from("official_student_records").insert({
    student_id_number: studentIdNumber,
    first_name: firstName,
    last_name: lastName,
    email,
    program_id: program.id,
    year_level: yearLevel,
    student_type: studentType,
    birthdate: optionalValue(formData.get("birthdate")),
    gender_sex: optionalValue(formData.get("gender_sex")),
    address: optionalValue(formData.get("address")),
    contact_number: optionalValue(formData.get("contact_number")),
    guardian: optionalValue(formData.get("guardian")),
    emergency_contact_person: optionalValue(formData.get("emergency_contact_person")),
    nationality: optionalValue(formData.get("nationality")),
    civil_status: optionalValue(formData.get("civil_status")),
    previous_school_information: optionalValue(formData.get("previous_school_information")),
    admission_status: optionalValue(formData.get("admission_status")),
    enrollment_status: enrollmentStatus,
    created_by: profile.id,
    updated_by: profile.id
  });

  if (error) {
    redirectWithError("save");
  }

  revalidatePath("/admin/students");
  redirect("/admin/students?created=1");
}
