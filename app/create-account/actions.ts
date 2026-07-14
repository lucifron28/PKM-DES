"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import {
  ACCOUNT_CLAIM_TOKEN_LIFETIME_SECONDS,
  createAccountClaimProof,
  createClaimFingerprint,
  verifyAccountClaimProof
} from "@/lib/account-claim/token";
import { maskDisplayName, maskEmail, maskStudentId } from "@/lib/account-claim/masking";
import {
  GENERIC_CLAIM_FAILURE,
  getInvalidClaimRecoveryPath,
  isCompatibleStudentType,
  normalizeClaimEmail,
  normalizeStudentId,
  validateClaimLookupInput
} from "@/lib/account-claim/rules";
import { CREATE_ACCOUNT_STUDENT_TYPES } from "@/lib/constants/pkm";
import type { OfficialStudentRecord, Program, StudentType, YearLevel } from "@/types/database";

const CLAIM_COOKIE_NAME = "pkm_account_claim";

export type ClaimRecordSummary = {
  displayName: string;
  maskedEmail: string;
  maskedStudentId: string;
  programName: string;
  yearLevel: YearLevel;
  studentType: StudentType;
};

export type ClaimAccountState = {
  message?: string;
  matchedRecord?: ClaimRecordSummary;
  selectedStudentType?: StudentType;
};

export type CreateAccountState = {
  message?: string;
  success?: boolean;
};

type OfficialRecordWithProgram = OfficialStudentRecord & {
  programs?: Pick<Program, "name"> | null;
};

type AccountDetails = {
  studentIdNumber: string;
  firstName: string;
  lastName: string;
  email: string;
  programId: string;
  yearLevel: YearLevel;
  studentType: StudentType;
};

function readStudentType(value: FormDataEntryValue | null) {
  const studentType = String(value ?? "").trim() as StudentType;
  return CREATE_ACCOUNT_STUDENT_TYPES.includes(studentType) ? studentType : null;
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

function claimCookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/create-account",
    maxAge
  };
}

async function clearClaimCookie() {
  const cookieStore = await cookies();
  cookieStore.set(CLAIM_COOKIE_NAME, "", claimCookieOptions(0));
}

async function setClaimCookie(token: string) {
  const cookieStore = await cookies();
  cookieStore.set(CLAIM_COOKIE_NAME, token, claimCookieOptions(ACCOUNT_CLAIM_TOKEN_LIFETIME_SECONDS));
}

function logClaimFailure(code: string) {
  console.warn(`[account-claim] ${code}`);
}

async function getAdminClient() {
  try {
    return createSupabaseAdminClient();
  } catch {
    return null;
  }
}

function summarizeOfficialRecord(record: OfficialRecordWithProgram, claimedStudentType: StudentType): ClaimRecordSummary | null {
  const studentIdNumber = normalizeStudentId(record.student_id_number);
  if (!studentIdNumber) {
    return null;
  }

  return {
    displayName: maskDisplayName(record.first_name, record.last_name),
    maskedEmail: maskEmail(record.email),
    maskedStudentId: maskStudentId(studentIdNumber),
    programName: record.programs?.name ?? "Program record",
    yearLevel: record.year_level,
    studentType: claimedStudentType
  };
}

async function findExactOfficialRecord({
  admin,
  email,
  studentIdNumber
}: {
  admin: ReturnType<typeof createSupabaseAdminClient>;
  email: string;
  studentIdNumber: string;
}) {
  const { data, error } = await admin
    .from("official_student_records")
    .select("id, student_id_number, first_name, last_name, email, program_id, year_level, student_type, programs(name)")
    .eq("email", email)
    .eq("student_id_number", studentIdNumber)
    .maybeSingle();

  if (error) {
    logClaimFailure("official_record_lookup_failed");
    return null;
  }

  return data as OfficialRecordWithProgram | null;
}

async function findExistingStudentAccount({
  admin,
  email,
  studentIdNumber
}: {
  admin: ReturnType<typeof createSupabaseAdminClient>;
  email: string;
  studentIdNumber: string;
}) {
  const [existingProfileResult, existingStudentResult] = await Promise.all([
    admin.from("profiles").select("id").eq("email", email).limit(1).maybeSingle(),
    admin.from("students").select("id").eq("student_id_number", studentIdNumber).limit(1).maybeSingle()
  ]);

  if (existingProfileResult.error || existingStudentResult.error) {
    logClaimFailure("account_lookup_failed");
    return true;
  }

  return Boolean(existingProfileResult.data || existingStudentResult.data);
}

async function cleanupNewRegistration(
  admin: ReturnType<typeof createSupabaseAdminClient>,
  profileId: string,
  stage: "profile_insert" | "student_insert"
) {
  const { error: profileCleanupError } = await admin.from("profiles").delete().eq("id", profileId);
  if (profileCleanupError) {
    logClaimFailure(`${stage}_profile_cleanup_failed`);
  }

  const { error } = await admin.auth.admin.deleteUser(profileId);
  if (error) {
    logClaimFailure(`${stage}_auth_cleanup_failed`);
  }
}

async function performStudentRegistration(
  admin: ReturnType<typeof createSupabaseAdminClient>,
  details: AccountDetails,
  password: string
): Promise<boolean> {
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
    logClaimFailure("auth_create_failed");
    return false;
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
    logClaimFailure("profile_insert_failed");
    await cleanupNewRegistration(admin, profileId, "profile_insert");
    return false;
  }

  const { error: studentError } = await admin.from("students").insert({
    profile_id: profileId,
    student_id_number: details.studentIdNumber,
    program_id: details.programId,
    year_level: details.yearLevel,
    student_type: details.studentType,
    enrollment_status: "NOT ENROLLED"
  });

  if (studentError) {
    logClaimFailure("student_insert_failed");
    await cleanupNewRegistration(admin, profileId, "student_insert");
    return false;
  }

  return true;
}

export async function claimOfficialRecordAction(
  _previousState: ClaimAccountState,
  formData: FormData
): Promise<ClaimAccountState> {
  await clearClaimCookie();

  const studentType = readStudentType(formData.get("student_type"));
  const lookupInput = validateClaimLookupInput({
    email: String(formData.get("email") ?? ""),
    studentIdNumber: String(formData.get("student_id_number") ?? "")
  });

  if (!studentType) {
    return { message: "Please select a valid student type." };
  }
  if (!lookupInput.valid && lookupInput.code === "missing_email") {
    return { message: "Active Email Address is required.", selectedStudentType: studentType };
  }
  if (!lookupInput.valid && lookupInput.code === "missing_student_id") {
    return { message: "Student ID Number is required.", selectedStudentType: studentType };
  }
  if (!lookupInput.valid) {
    return { message: "Please use a valid active email address.", selectedStudentType: studentType };
  }
  const { email, studentIdNumber } = lookupInput;

  const admin = await getAdminClient();
  if (!admin) {
    return {
      message: "Account claiming is not configured for this preview environment.",
      selectedStudentType: studentType
    };
  }

  const record = await findExactOfficialRecord({ admin, email, studentIdNumber });
  if (!record || !isCompatibleStudentType(studentType, record.student_type)) {
    logClaimFailure("claim_not_verifiable");
    return { message: GENERIC_CLAIM_FAILURE, selectedStudentType: studentType };
  }

  const normalizedRecordEmail = normalizeClaimEmail(record.email);
  const normalizedRecordStudentId = normalizeStudentId(record.student_id_number);
  if (!normalizedRecordEmail || !normalizedRecordStudentId || normalizedRecordEmail !== email || normalizedRecordStudentId !== studentIdNumber) {
    logClaimFailure("claim_record_not_normalized");
    return { message: GENERIC_CLAIM_FAILURE, selectedStudentType: studentType };
  }

  if (await findExistingStudentAccount({ admin, email: normalizedRecordEmail, studentIdNumber: normalizedRecordStudentId })) {
    logClaimFailure("claim_already_exists");
    return { message: GENERIC_CLAIM_FAILURE, selectedStudentType: studentType };
  }

  const summary = summarizeOfficialRecord(record, studentType);
  if (!summary) {
    logClaimFailure("claim_record_missing_student_id");
    return { message: GENERIC_CLAIM_FAILURE, selectedStudentType: studentType };
  }

  try {
    const token = createAccountClaimProof({
      officialRecordId: record.id,
      claimedStudentType: studentType,
      fingerprint: createClaimFingerprint(record)
    });
    await setClaimCookie(token);
  } catch {
    logClaimFailure("claim_token_issue_failed");
    return { message: "Account claiming is not configured for this preview environment.", selectedStudentType: studentType };
  }

  return { matchedRecord: summary, selectedStudentType: studentType };
}

export async function createStudentAccountAction(
  _previousState: CreateAccountState,
  formData: FormData
): Promise<CreateAccountState> {
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirm_password") ?? "");
  const passwordError = validatePassword(password, confirmPassword);
  if (passwordError) {
    return { message: passwordError };
  }

  const cookieStore = await cookies();
  const token = cookieStore.get(CLAIM_COOKIE_NAME)?.value;
  let proof;
  try {
    proof = token ? verifyAccountClaimProof(token) : null;
  } catch {
    proof = null;
  }

  if (!proof) {
    await clearClaimCookie();
    logClaimFailure("claim_proof_invalid");
    redirect(getInvalidClaimRecoveryPath());
  }

  const admin = await getAdminClient();
  if (!admin) {
    return { message: "Account claiming is not configured for this preview environment." };
  }

  const { data, error } = await admin
    .from("official_student_records")
    .select("id, student_id_number, first_name, last_name, email, program_id, year_level, student_type")
    .eq("id", proof.officialRecordId)
    .maybeSingle();
  const record = data as OfficialStudentRecord | null;

  const email = normalizeClaimEmail(record?.email);
  const studentIdNumber = normalizeStudentId(record?.student_id_number);
  const recordIsValid =
    !error &&
    record &&
    email &&
    studentIdNumber &&
    isCompatibleStudentType(proof.claimedStudentType, record.student_type) &&
    createClaimFingerprint(record) === proof.fingerprint;

  if (!recordIsValid) {
    await clearClaimCookie();
    logClaimFailure("claim_proof_revalidation_failed");
    redirect(getInvalidClaimRecoveryPath());
  }

  if (await findExistingStudentAccount({ admin, email, studentIdNumber })) {
    await clearClaimCookie();
    logClaimFailure("claim_already_exists_before_registration");
    redirect(getInvalidClaimRecoveryPath());
  }

  const created = await performStudentRegistration(
    admin,
    {
      studentIdNumber,
      firstName: record.first_name,
      lastName: record.last_name,
      email,
      programId: record.program_id,
      yearLevel: record.year_level,
      studentType: record.student_type
    },
    password
  );

  if (!created) {
    await clearClaimCookie();
    redirect(getInvalidClaimRecoveryPath());
  }

  await clearClaimCookie();
  return { success: true, message: "Account created. You may now log in." };
}
