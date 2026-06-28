"use server";

import { CREATE_ACCOUNT_STUDENT_TYPES, PROGRAM, YEAR_LEVELS } from "@/lib/constants/pkm";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import type { OfficialStudentRecord, StudentType, YearLevel } from "@/types/database";

export type CreateAccountState = {
  message?: string;
  success?: boolean;
};

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function normalizeText(value: string | null | undefined) {
  return String(value ?? "").trim().replace(/\s+/g, " ").toLowerCase();
}

function officialRecordMatchesForm({
  officialRecord,
  firstName,
  lastName,
  studentIdNumber,
  programId,
  yearLevel,
  studentType
}: {
  officialRecord: OfficialStudentRecord;
  firstName: string;
  lastName: string;
  studentIdNumber: string;
  programId: string;
  yearLevel: YearLevel;
  studentType: StudentType;
}) {
  const studentIdMatches =
    !officialRecord.student_id_number ||
    !studentIdNumber ||
    normalizeText(officialRecord.student_id_number) === normalizeText(studentIdNumber);

  return (
    normalizeText(officialRecord.first_name) === normalizeText(firstName) &&
    normalizeText(officialRecord.last_name) === normalizeText(lastName) &&
    officialRecord.program_id === programId &&
    officialRecord.year_level === yearLevel &&
    officialRecord.student_type === studentType &&
    studentIdMatches
  );
}

async function findExistingStudentAccount({
  admin,
  email,
  studentIdNumber
}: {
  admin: ReturnType<typeof createSupabaseAdminClient>;
  email: string;
  studentIdNumber: string | null;
}) {
  const [existingProfileResult, existingStudentResult] = await Promise.all([
    admin.from("profiles").select("id").eq("email", email).limit(1).maybeSingle(),
    studentIdNumber
      ? admin
          .from("students")
          .select("id")
          .eq("student_id_number", studentIdNumber)
          .limit(1)
          .maybeSingle()
      : Promise.resolve({ data: null })
  ]);

  return Boolean(existingProfileResult.data || existingStudentResult.data);
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

  let accountStudentIdNumber = studentIdNumber || null;
  let accountFirstName = firstName;
  let accountLastName = lastName;
  let accountProgramId = program.id;
  let accountYearLevel = yearLevel;
  let accountStudentType = studentType;

  if (studentType !== "Old Student") {
    const { data: officialRecord } = await admin
      .from("official_student_records")
      .select("*")
      .ilike("email", email)
      .maybeSingle();

    const typedOfficialRecord = officialRecord as OfficialStudentRecord | null;

    if (
      !typedOfficialRecord ||
      !officialRecordMatchesForm({
        officialRecord: typedOfficialRecord,
        firstName,
        lastName,
        studentIdNumber,
        programId: program.id,
        yearLevel,
        studentType
      })
    ) {
      return {
        message:
          "No matching official student or admitted-applicant record was found. Please contact the Registrar."
      };
    }

    accountStudentIdNumber = typedOfficialRecord.student_id_number;
    accountFirstName = typedOfficialRecord.first_name;
    accountLastName = typedOfficialRecord.last_name;
    accountProgramId = typedOfficialRecord.program_id;
    accountYearLevel = typedOfficialRecord.year_level;
    accountStudentType = typedOfficialRecord.student_type;
  }

  const accountExists = await findExistingStudentAccount({
    admin,
    email,
    studentIdNumber: accountStudentIdNumber
  });

  if (accountExists) {
    return { message: "An account already exists for this email address or Student ID Number." };
  }

  const { data: createdUser, error: authError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    app_metadata: {
      role: "student",
      account_status: "ACTIVE"
    },
    user_metadata: {
      first_name: accountFirstName,
      last_name: accountLastName
    }
  });

  if (authError || !createdUser.user) {
    return { message: "Account could not be created. Please verify the email address or contact an administrator." };
  }

  const profileId = createdUser.user.id;

  const { error: profileError } = await admin.from("profiles").insert({
    id: profileId,
    role: "student",
    first_name: accountFirstName,
    last_name: accountLastName,
    email,
    account_status: "ACTIVE"
  });

  if (profileError) {
    await admin.auth.admin.deleteUser(profileId);
    return { message: "Account could not be created. Please contact an administrator." };
  }

  const { error: studentError } = await admin.from("students").insert({
    profile_id: profileId,
    student_id_number: accountStudentIdNumber,
    program_id: accountProgramId,
    year_level: accountYearLevel,
    student_type: accountStudentType,
    enrollment_status: "NOT ENROLLED"
  });

  if (studentError) {
    await admin.from("profiles").delete().eq("id", profileId);
    await admin.auth.admin.deleteUser(profileId);
    return { message: "Student record could not be created. Please contact an administrator." };
  }

  return {
    success: true,
    message: "Account created. You may now log in."
  };
}
