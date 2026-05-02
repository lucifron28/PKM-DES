"use server";

import { CREATE_ACCOUNT_STUDENT_TYPES, PROGRAM, YEAR_LEVELS } from "@/lib/constants/pkm";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import type { AccountStatus, StudentType, YearLevel } from "@/types/database";

export type CreateAccountState = {
  message?: string;
  success?: boolean;
};

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function createStudentAccountAction(
  _previousState: CreateAccountState,
  formData: FormData
): Promise<CreateAccountState> {
  const firstName = String(formData.get("first_name") ?? "").trim();
  const lastName = String(formData.get("last_name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const studentIdNumber = String(formData.get("student_id_number") ?? "").trim();
  const programCode = String(formData.get("program_code") ?? "").trim();
  const yearLevel = String(formData.get("year_level") ?? "").trim() as YearLevel;
  const studentType = String(formData.get("student_type") ?? "").trim() as StudentType;
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirm_password") ?? "");

  if (!firstName || !lastName || !email || !programCode || !yearLevel || !studentType) {
    return { message: "Please complete all required fields." };
  }

  if (!isValidEmail(email)) {
    return { message: "Please use a valid active email address." };
  }

  if (!YEAR_LEVELS.includes(yearLevel)) {
    return { message: "Please select a valid year level." };
  }

  if (!CREATE_ACCOUNT_STUDENT_TYPES.includes(studentType)) {
    return { message: "Please select a valid student type." };
  }

  if (studentType === "Old Student" && !studentIdNumber) {
    return { message: "Student ID Number is required for Old Student accounts." };
  }

  if (!password || !confirmPassword) {
    return { message: "Temporary MVP password is required until the official email workflow is supplied." };
  }

  if (password !== confirmPassword) {
    return { message: "Passwords do not match." };
  }

  if (password.length < 8) {
    return { message: "Password must be at least 8 characters." };
  }

  let admin;
  try {
    admin = createSupabaseAdminClient();
  } catch {
    return {
      message:
        "Account creation is a configured placeholder until Supabase service-role setup and the official email password workflow are supplied."
    };
  }

  const { data: program } = await admin
    .from("programs")
    .select("id")
    .eq("code", programCode || PROGRAM.code)
    .maybeSingle();

  if (!program) {
    return { message: "Program seed data is not configured yet." };
  }

  const accountStatus: AccountStatus = studentType === "Old Student" ? "ACTIVE" : "PENDING";

  const { data: createdUser, error: authError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      first_name: firstName,
      last_name: lastName,
      role: "student"
    }
  });

  if (authError || !createdUser.user) {
    return { message: "Account could not be created. Please verify the email address or contact an administrator." };
  }

  const profileId = createdUser.user.id;

  const { error: profileError } = await admin.from("profiles").insert({
    id: profileId,
    role: "student",
    first_name: firstName,
    last_name: lastName,
    email,
    account_status: accountStatus
  });

  if (profileError) {
    await admin.auth.admin.deleteUser(profileId);
    return { message: "Account could not be created. Please contact an administrator." };
  }

  const { error: studentError } = await admin.from("students").insert({
    profile_id: profileId,
    student_id_number: studentIdNumber || null,
    program_id: program.id,
    year_level: yearLevel,
    student_type: studentType,
    enrollment_status: "NOT ENROLLED"
  });

  if (studentError) {
    await admin.from("profiles").delete().eq("id", profileId);
    await admin.auth.admin.deleteUser(profileId);
    return { message: "Student record could not be created. Please contact an administrator." };
  }

  return {
    success: true,
    message:
      accountStatus === "ACTIVE"
        ? "Account created. You may now log in."
        : "Account request created and is pending administrator verification."
  };
}
