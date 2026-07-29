"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import crypto from "crypto";
import React from "react";
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
import { getAppBaseUrl, getEmailEnv, getEmailAdapter, AccountSetupEmail, type EmailEnvironment } from "@/lib/email";

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
    admin.from("profiles").select("id, account_status").eq("email", email).limit(1).maybeSingle(),
    admin.from("students").select("id").eq("student_id_number", studentIdNumber).limit(1).maybeSingle()
  ]);

  if (existingProfileResult.error || existingStudentResult.error) {
    logClaimFailure("account_lookup_failed");
    return { exists: true, status: null };
  }

  const exists = Boolean(existingProfileResult.data || existingStudentResult.data);
  const status = existingProfileResult.data?.account_status ?? null;
  return { exists, status };
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

async function sendAccountSetupEmail(admin: ReturnType<typeof createSupabaseAdminClient>, email: string) {
  const siteUrl = getAppBaseUrl();

  const { data, error } = await admin.auth.admin.generateLink({
    type: "recovery",
    email,
    options: {
      redirectTo: `${siteUrl}/auth/callback`
    }
  });

  if (error || !data.properties?.action_link) {
    logClaimFailure("generate_setup_link_failed");
    throw new Error("Failed to generate account setup link.");
  }

  const adapter = getEmailAdapter();
  await adapter.send({
    to: email,
    subject: "PKM-DES Account Setup",
    react: React.createElement(AccountSetupEmail, { setupLink: data.properties.action_link })
  });
}

async function performStudentRegistration(
  admin: ReturnType<typeof createSupabaseAdminClient>,
  details: AccountDetails,
  emailEnv: EmailEnvironment,
  password?: string
): Promise<{ success: boolean; isEmailSent?: boolean }> {
  const isEmailMode = emailEnv.enabled;
  const initialStatus = isEmailMode ? "SETUP" : "ACTIVE";
  const initialPassword = isEmailMode ? crypto.randomUUID() : (password || crypto.randomUUID());

  const { data: createdUser, error: authError } = await admin.auth.admin.createUser({
    email: details.email,
    password: initialPassword,
    email_confirm: true,
    app_metadata: {
      role: "student",
      account_status: initialStatus
    },
    user_metadata: {
      first_name: details.firstName,
      last_name: details.lastName
    }
  });

  if (authError || !createdUser.user) {
    logClaimFailure("auth_create_failed");
    return { success: false };
  }

  const profileId = createdUser.user.id;
  const { error: profileError } = await admin.from("profiles").insert({
    id: profileId,
    role: "student",
    first_name: details.firstName,
    last_name: details.lastName,
    email: details.email,
    account_status: initialStatus
  });

  if (profileError) {
    logClaimFailure("profile_insert_failed");
    await cleanupNewRegistration(admin, profileId, "profile_insert");
    return { success: false };
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
    return { success: false };
  }

  if (isEmailMode) {
    try {
      await sendAccountSetupEmail(admin, details.email);
      return { success: true, isEmailSent: true };
    } catch {
      logClaimFailure("setup_email_send_failed");
      await cleanupNewRegistration(admin, profileId, "student_insert");
      return { success: false };
    }
  }

  return { success: true, isEmailSent: false };
}

export async function claimOfficialRecordAction(
  _previousState: ClaimAccountState,
  formData: FormData
): Promise<ClaimAccountState> {
  await clearClaimCookie();

  const studentType = readStudentType(formData.get("student_type"));
  const rawEmail = String(formData.get("email") ?? "").trim();
  const rawStudentIdNumber = String(formData.get("student_id_number") ?? "").trim();
  const lookupInput = validateClaimLookupInput({
    email: rawEmail,
    studentIdNumber: rawStudentIdNumber
  });

  if (!studentType) {
    return { message: "Please select a valid student type.", email: rawEmail, studentIdNumber: rawStudentIdNumber };
  }
  if (!lookupInput.valid && lookupInput.code === "missing_email") {
    return { message: "Active Email Address is required.", selectedStudentType: studentType, email: rawEmail, studentIdNumber: rawStudentIdNumber };
  }
  if (!lookupInput.valid && lookupInput.code === "missing_student_id") {
    return { message: "Student ID Number is required.", selectedStudentType: studentType, email: rawEmail, studentIdNumber: rawStudentIdNumber };
  }
  if (!lookupInput.valid) {
    return { message: "Please use a valid active email address.", selectedStudentType: studentType, email: rawEmail, studentIdNumber: rawStudentIdNumber };
  }
  const { email, studentIdNumber } = lookupInput;

  const admin = await getAdminClient();
  if (!admin) {
    return {
      message: "Account claiming is not configured for this preview environment.",
      selectedStudentType: studentType,
      email: rawEmail,
      studentIdNumber: rawStudentIdNumber
    };
  }

  const record = await findExactOfficialRecord({ admin, email, studentIdNumber });
  if (!record || !isCompatibleStudentType(studentType, record.student_type)) {
    logClaimFailure("claim_not_verifiable");
    return { message: GENERIC_CLAIM_FAILURE, selectedStudentType: studentType, email: rawEmail, studentIdNumber: rawStudentIdNumber };
  }

  const normalizedRecordEmail = normalizeClaimEmail(record.email);
  const normalizedRecordStudentId = normalizeStudentId(record.student_id_number);
  if (!normalizedRecordEmail || !normalizedRecordStudentId || normalizedRecordEmail !== email || normalizedRecordStudentId !== studentIdNumber) {
    logClaimFailure("claim_record_not_normalized");
    return { message: GENERIC_CLAIM_FAILURE, selectedStudentType: studentType, email: rawEmail, studentIdNumber: rawStudentIdNumber };
  }

  const accountInfo = await findExistingStudentAccount({ admin, email: normalizedRecordEmail, studentIdNumber: normalizedRecordStudentId });
  const emailEnv = getEmailEnv();

  if (emailEnv.configurationError) {
    logClaimFailure("email_configuration_invalid");
    return { message: "Account email delivery is not configured. Please contact the Registrar.", selectedStudentType: studentType, email: rawEmail, studentIdNumber: rawStudentIdNumber };
  }

  if (accountInfo.exists) {
    // If account exists and is in SETUP status and email is enabled, we allow resending link
    if (emailEnv.enabled && accountInfo.status === "SETUP") {
      // Proceed to allow resend via createStudentAccountAction
    } else {
      logClaimFailure("claim_already_exists");
      return { message: GENERIC_CLAIM_FAILURE, selectedStudentType: studentType, email: rawEmail, studentIdNumber: rawStudentIdNumber };
    }
  }

  const summary = summarizeOfficialRecord(record, studentType);
  if (!summary) {
    logClaimFailure("claim_record_missing_student_id");
    return { message: GENERIC_CLAIM_FAILURE, selectedStudentType: studentType, email: rawEmail, studentIdNumber: rawStudentIdNumber };
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
    return { message: "Account claiming is not configured for this preview environment.", selectedStudentType: studentType, email: rawEmail, studentIdNumber: rawStudentIdNumber };
  }

  return { matchedRecord: summary, selectedStudentType: studentType, email: rawEmail, studentIdNumber: rawStudentIdNumber };
}

export async function createStudentAccountAction(
  _previousState: CreateAccountState,
  formData: FormData
): Promise<CreateAccountState> {
  const emailEnv = getEmailEnv();

  if (emailEnv.configurationError) {
    logClaimFailure("email_configuration_invalid");
    return { message: "Account email delivery is not configured. Please contact the Registrar." };
  }

  let password = "";
  if (!emailEnv.enabled) {
    password = String(formData.get("password") ?? "");
    const confirmPassword = String(formData.get("confirm_password") ?? "");
    const passwordError = validatePassword(password, confirmPassword);
    if (passwordError) {
      return { message: passwordError };
    }
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

  const accountInfo = await findExistingStudentAccount({ admin, email, studentIdNumber });
  if (accountInfo.exists) {
    // If account exists and is in SETUP state and email is enabled, trigger resend!
    if (emailEnv.enabled && accountInfo.status === "SETUP") {
      try {
        await sendAccountSetupEmail(admin, email);
        await clearClaimCookie();
        return { success: true, message: "A new setup link has been sent to your email address." };
      } catch {
        await clearClaimCookie();
        return { message: "Failed to resend account setup email. Please try again later." };
      }
    }

    await clearClaimCookie();
    logClaimFailure("claim_already_exists_before_registration");
    redirect(getInvalidClaimRecoveryPath());
  }

  const result = await performStudentRegistration(
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
    emailEnv,
    password
  );

  if (!result.success) {
    await clearClaimCookie();
    redirect(getInvalidClaimRecoveryPath());
  }

  await clearClaimCookie();

  if (result.isEmailSent) {
    return { success: true, message: "A setup link has been sent to your email address." };
  }

  return { success: true, message: "Account created. You may now log in." };
}
