"use server";

import { CREATE_ACCOUNT_STUDENT_TYPES, PROGRAM, YEAR_LEVELS } from "@/lib/constants/pkm";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import type { OfficialStudentRecord, Program, StudentType, YearLevel } from "@/types/database";

export type ClaimRecordSummary = {
  id: string;
  studentIdNumber: string | null;
  firstName: string;
  lastName: string;
  email: string;
  programId: string;
  programName: string;
  yearLevel: YearLevel;
  studentType: StudentType;
  enrollmentStatus: string;
};

export type ClaimAccountState = {
  message?: string;
  matchedRecord?: ClaimRecordSummary;
  oldStudentFallback?: {
    studentIdNumber: string;
    email: string;
  };
  selectedStudentType?: StudentType;
  email?: string;
  studentIdNumber?: string;
};

export type CreateAccountState = {
  message?: string;
  success?: boolean;
};

type OfficialRecordWithProgram = OfficialStudentRecord & {
  programs?: Pick<Program, "name"> | null;
};

const OLD_STUDENT_COMPATIBLE_TYPES: StudentType[] = [
  "Old Student",
  "Continuing Student",
  "Regular Student",
  "Irregular Student"
];

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function normalizeText(value: string | null | undefined) {
  return String(value ?? "").trim().replace(/\s+/g, " ").toLowerCase();
}

function readStudentType(value: FormDataEntryValue | null) {
  const studentType = String(value ?? "").trim() as StudentType;
  return CREATE_ACCOUNT_STUDENT_TYPES.includes(studentType) ? studentType : null;
}

function summarizeOfficialRecord(record: OfficialRecordWithProgram): ClaimRecordSummary {
  return {
    id: record.id,
    studentIdNumber: record.student_id_number,
    firstName: record.first_name,
    lastName: record.last_name,
    email: record.email,
    programId: record.program_id,
    programName: record.programs?.name ?? PROGRAM.name,
    yearLevel: record.year_level,
    studentType: record.student_type,
    enrollmentStatus: record.enrollment_status
  };
}

async function findOfficialRecordsByClaim({
  admin,
  email,
  studentIdNumber
}: {
  admin: ReturnType<typeof createSupabaseAdminClient>;
  email: string;
  studentIdNumber: string;
}) {
  const [emailResult, studentIdResult] = await Promise.all([
    email
      ? admin
          .from("official_student_records")
          .select("*, programs(name)")
          .ilike("email", email)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    studentIdNumber
      ? admin
          .from("official_student_records")
          .select("*, programs(name)")
          .eq("student_id_number", studentIdNumber)
          .maybeSingle()
      : Promise.resolve({ data: null })
  ]);
  const records = [emailResult.data, studentIdResult.data].filter(Boolean) as OfficialRecordWithProgram[];
  const uniqueRecords = new Map(records.map((record) => [record.id, record]));

  return [...uniqueRecords.values()];
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

function validatePassword(password: string, confirmPassword: string) {
  if (!password || !confirmPassword) {
    return "Temporary MVP password is required until the official email workflow is supplied.";
  }

  if (password !== confirmPassword) {
    return "Passwords do not match.";
  }

  if (password.length < 8) {
    return "Password must be at least 8 characters.";
  }

  return null;
}

async function getAdminClient() {
  try {
    return createSupabaseAdminClient();
  } catch {
    return null;
  }
}

function validateClaimInputs(
  studentType: StudentType | null,
  email: string,
  studentIdNumber: string
): string | null {
  if (!studentType) {
    return "Please select a valid student type.";
  }
  if (!email && !studentIdNumber) {
    return "Enter either your active email address or Student ID Number.";
  }
  if (email && !isValidEmail(email)) {
    return "Please use a valid active email address.";
  }
  if (studentType === "Old Student" && !studentIdNumber) {
    return "Student ID Number is required for Old Student accounts.";
  }
  return null;
}

export async function claimOfficialRecordAction(
  _previousState: ClaimAccountState,
  formData: FormData
): Promise<ClaimAccountState> {
  const studentType = readStudentType(formData.get("student_type"));
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const studentIdNumber = String(formData.get("student_id_number") ?? "").trim();

  const validationError = validateClaimInputs(studentType, email, studentIdNumber);
  if (validationError) {
    return {
      message: validationError,
      selectedStudentType: studentType ?? undefined,
      email,
      studentIdNumber
    };
  }

  const admin = await getAdminClient();

  if (!admin) {
    return {
      message:
        "Account creation is a configured placeholder until Supabase service-role setup and the official email password workflow are supplied.",
      selectedStudentType: studentType!,
      email,
      studentIdNumber
    };
  }

  const records = await findOfficialRecordsByClaim({ admin, email, studentIdNumber });

  if (records.length) {
    const matchingTypeRecord =
      studentType === "Old Student"
        ? records.find((record) => OLD_STUDENT_COMPATIBLE_TYPES.includes(record.student_type))
        : records.find((record) => record.student_type === studentType);

    if (matchingTypeRecord) {
      return {
        matchedRecord: summarizeOfficialRecord(matchingTypeRecord),
        selectedStudentType: studentType!,
        email,
        studentIdNumber
      };
    }

    return {
      message: `A record was found, but it is registered as ${records[0].student_type}. Please check the selected student type or contact the Registrar.`,
      selectedStudentType: studentType!,
      email,
      studentIdNumber
    };
  }

  if (studentType === "Old Student") {
    return {
      oldStudentFallback: {
        studentIdNumber,
        email
      },
      selectedStudentType: studentType,
      email,
      studentIdNumber
    };
  }

  return {
    message: "No official record was found for that email or Student ID Number. Please contact the Registrar.",
    selectedStudentType: studentType!,
    email,
    studentIdNumber
  };
}

type AccountDetails = {
  studentIdNumber: string | null;
  firstName: string;
  lastName: string;
  email: string;
  programId: string;
  yearLevel: YearLevel;
  studentType: StudentType;
};

async function resolveOfficialClaimDetails(
  admin: ReturnType<typeof createSupabaseAdminClient>,
  formData: FormData
): Promise<{ error?: string; details?: AccountDetails }> {
  const officialRecordId = String(formData.get("official_record_id") ?? "").trim();
  const claimedStudentType = readStudentType(formData.get("claimed_student_type"));

  if (!officialRecordId || !claimedStudentType) {
    return { error: "Please claim an official record before creating an account." };
  }

  const { data: officialRecord } = await admin
    .from("official_student_records")
    .select("*")
    .eq("id", officialRecordId)
    .maybeSingle();
  const typedOfficialRecord = officialRecord as OfficialStudentRecord | null;

  if (!typedOfficialRecord) {
    return { error: "Official record was not found. Please contact the Registrar." };
  }

  const typeIsAllowed =
    claimedStudentType === "Old Student"
      ? OLD_STUDENT_COMPATIBLE_TYPES.includes(typedOfficialRecord.student_type)
      : typedOfficialRecord.student_type === claimedStudentType;

  if (!typeIsAllowed) {
    return {
      error: `A record was found, but it is registered as ${typedOfficialRecord.student_type}. Please check the selected student type or contact the Registrar.`
    };
  }

  return {
    details: {
      studentIdNumber: typedOfficialRecord.student_id_number,
      firstName: typedOfficialRecord.first_name,
      lastName: typedOfficialRecord.last_name,
      email: typedOfficialRecord.email.toLowerCase(),
      programId: typedOfficialRecord.program_id,
      yearLevel: typedOfficialRecord.year_level,
      studentType: typedOfficialRecord.student_type
    }
  };
}

async function resolveOldManualDetails(
  admin: ReturnType<typeof createSupabaseAdminClient>,
  formData: FormData
): Promise<{ error?: string; details?: AccountDetails }> {
  const firstName = String(formData.get("first_name") || "").trim();
  const lastName = String(formData.get("last_name") || "").trim();
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const studentIdNumber = String(formData.get("student_id_number") || "").trim();
  const programCode = String(formData.get("program_code") ?? "").trim();
  const yearLevel = String(formData.get("year_level") ?? "").trim() as YearLevel;

  const fields = [firstName, lastName, email, studentIdNumber, programCode, yearLevel];
  if (fields.some((field) => !field)) {
    return { error: "Please complete all required Old Student account fields." };
  }

  if (!isValidEmail(email)) {
    return { error: "Please use a valid active email address." };
  }

  if (!YEAR_LEVELS.includes(yearLevel)) {
    return { error: "Please select a valid year level." };
  }

  const { data: program } = await admin
    .from("programs")
    .select("id")
    .eq("code", programCode || PROGRAM.code)
    .maybeSingle();

  if (!program) {
    return { error: "Program seed data is not configured yet." };
  }

  return {
    details: {
      studentIdNumber,
      firstName,
      lastName,
      email,
      programId: program.id,
      yearLevel,
      studentType: "Old Student"
    }
  };
}

async function resolveAccountDetails(
  admin: ReturnType<typeof createSupabaseAdminClient>,
  mode: string,
  formData: FormData
): Promise<{ error?: string; details?: AccountDetails }> {
  if (mode === "official_claim") {
    return resolveOfficialClaimDetails(admin, formData);
  }
  if (mode === "old_manual") {
    return resolveOldManualDetails(admin, formData);
  }
  return { error: "Invalid registration mode." };
}
async function performStudentRegistration(
  admin: ReturnType<typeof createSupabaseAdminClient>,
  details: AccountDetails,
  password: string
): Promise<{ error?: string; success?: boolean }> {
  const { data: createdUser, error: authError } = await admin.auth.admin.createUser({
    email: details.email,
    password,
    email_confirm: true,
    app_metadata: {
      role: "student",
      account_status: "ACTIVE"
    },
    user_metadata: {
      first_name: details.firstName,
      last_name: details.lastName
    }
  });

  if (authError || !createdUser.user) {
    return { error: "Account could not be created. Please verify the email address or contact an administrator." };
  }

  const profileId = createdUser.user.id;

  const { error: profileError } = await admin.from("profiles").insert({
    id: profileId,
    role: "student",
    first_name: details.firstName,
    last_name: details.lastName,
    email: details.email,
    account_status: "ACTIVE"
  });

  if (profileError) {
    await admin.auth.admin.deleteUser(profileId);
    return { error: "Account could not be created. Please contact an administrator." };
  }

  const { error: studentError } = await admin.from("students").insert({
    profile_id: profileId,
    student_id_number: normalizeText(details.studentIdNumber) ? details.studentIdNumber : null,
    program_id: details.programId,
    year_level: details.yearLevel,
    student_type: details.studentType,
    enrollment_status: "NOT ENROLLED"
  });

  if (studentError) {
    await admin.from("profiles").delete().eq("id", profileId);
    await admin.auth.admin.deleteUser(profileId);
    return { error: "Student record could not be created. Please contact an administrator." };
  }

  return { success: true };
}

export async function createStudentAccountAction(
  _previousState: CreateAccountState,
  formData: FormData
): Promise<CreateAccountState> {
  const mode = String(formData.get("mode") ?? "");
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirm_password") ?? "");
  const passwordError = validatePassword(password, confirmPassword);

  if (passwordError) {
    return { message: passwordError };
  }

  const admin = await getAdminClient();

  if (!admin) {
    return {
      message:
        "Account creation is a configured placeholder until Supabase service-role setup and the official email password workflow are supplied."
    };
  }

  const resolution = await resolveAccountDetails(admin, mode, formData);
  if (resolution.error || !resolution.details) {
    return { message: resolution.error || "Failed to resolve account details." };
  }

  const details = resolution.details;

  if (!details.email || !isValidEmail(details.email)) {
    return { message: "Official record email is missing or invalid. Please contact the Registrar." };
  }

  const accountExists = await findExistingStudentAccount({
    admin,
    email: details.email,
    studentIdNumber: details.studentIdNumber
  });

  if (accountExists) {
    return { message: "An account already exists for this email address or Student ID Number." };
  }

  const registration = await performStudentRegistration(admin, details, password);
  if (registration.error) {
    return { message: registration.error };
  }

  return {
    success: true,
    message: "Account created. You may now log in."
  };
}
