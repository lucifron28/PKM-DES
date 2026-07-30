"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  claimOfficialRecordService,
  type ClaimRecordSummary
} from "@/lib/account-claim/claim-service";
import { readStudentType, validatePasswordInput } from "@/lib/account-claim/input";
import {
  findExistingStudentAccount,
  releaseSetupEmailDelivery,
  reserveSetupEmailDelivery
} from "@/lib/account-claim/repository";
import { performStudentRegistrationService } from "@/lib/account-claim/account-registration-service";
import { sendAccountSetupEmailService } from "@/lib/account-claim/setup-delivery-service";
import {
  getInvalidClaimRecoveryPath,
  normalizeClaimEmail,
  normalizeStudentId
} from "@/lib/account-claim/rules";
import {
  createClaimFingerprint,
  verifyAccountClaimProof
} from "@/lib/account-claim/token";
import { getEmailEnv } from "@/lib/email";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import type { OfficialStudentRecord } from "@/types/database";

const CLAIM_COOKIE_NAME = "pkm_account_claim";

export type { ClaimRecordSummary };

export type ClaimAccountState = {
  message?: string;
  matchedRecord?: ClaimRecordSummary;
  selectedStudentType?: string | null;
  email?: string;
  studentIdNumber?: string;
};

export type CreateAccountState = {
  message?: string;
  success?: boolean;
};

function claimCookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    maxAge,
    path: "/"
  };
}

async function clearClaimCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(CLAIM_COOKIE_NAME);
}

async function setClaimCookie(token: string) {
  const cookieStore = await cookies();
  cookieStore.set(CLAIM_COOKIE_NAME, token, claimCookieOptions(15 * 60));
}

function logClaimFailure(code: string) {
  console.warn(`[account-claim] ${code}`);
}

async function getAdminClient() {
  try {
    return createSupabaseAdminClient();
  } catch (error) {
    console.error("Account claiming is disabled because Supabase admin environment variables are not configured.", error);
    return null;
  }
}

export async function claimOfficialRecordAction(
  _previousState: ClaimAccountState,
  formData: FormData
): Promise<ClaimAccountState> {
  const rawEmail = String(formData.get("email") ?? "");
  const rawStudentIdNumber = String(formData.get("student_id_number") ?? "");
  const studentType = readStudentType(formData.get("student_type"));
  const email = normalizeClaimEmail(rawEmail);
  const studentIdNumber = normalizeStudentId(rawStudentIdNumber);

  if (!studentType) {
    return {
      message: "Please select your student type.",
      selectedStudentType: null,
      email: rawEmail,
      studentIdNumber: rawStudentIdNumber
    };
  }

  if (!email && !studentIdNumber) {
    return {
      message: "Active Email Address and Student ID Number are required.",
      selectedStudentType: studentType,
      email: rawEmail,
      studentIdNumber: rawStudentIdNumber
    };
  }

  if (!email) {
    return {
      message: "Active Email Address is required.",
      selectedStudentType: studentType,
      email: rawEmail,
      studentIdNumber: rawStudentIdNumber
    };
  }

  if (!studentIdNumber) {
    return {
      message: "Student ID Number is required.",
      selectedStudentType: studentType,
      email: rawEmail,
      studentIdNumber: rawStudentIdNumber
    };
  }

  const admin = await getAdminClient();
  if (!admin) {
    return {
      message: "Account claiming is not configured for this preview environment.",
      selectedStudentType: studentType,
      email: rawEmail,
      studentIdNumber: rawStudentIdNumber
    };
  }

  const result = await claimOfficialRecordService({
    admin,
    claimedStudentType: studentType,
    email,
    studentIdNumber
  });

  if (!result.success || !result.token) {
    await clearClaimCookie();
    return {
      message: result.message,
      selectedStudentType: studentType,
      email: rawEmail,
      studentIdNumber: rawStudentIdNumber
    };
  }

  await setClaimCookie(result.token);
  return {
    matchedRecord: result.matchedRecord,
    selectedStudentType: studentType,
    email: rawEmail,
    studentIdNumber: rawStudentIdNumber
  };
}

export async function createStudentAccountAction(
  _previousState: CreateAccountState,
  formData: FormData
): Promise<CreateAccountState> {
  const emailEnv = getEmailEnv();
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirm_password") ?? "");

  if (!emailEnv.enabled) {
    const passwordValidation = validatePasswordInput(password, confirmPassword);
    if (!passwordValidation.valid) {
      if (passwordValidation.errorKey === "missing_password") {
        return { message: "Password is required." };
      }
      if (passwordValidation.errorKey === "password_too_short") {
        return { message: "Password must be at least 8 characters long." };
      }
      return { message: "Passwords do not match." };
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
    createClaimFingerprint(record) === proof.fingerprint;

  if (!recordIsValid) {
    await clearClaimCookie();
    logClaimFailure("claim_proof_revalidation_failed");
    redirect(getInvalidClaimRecoveryPath());
  }

  const accountInfo = await findExistingStudentAccount({
    admin,
    email,
    studentIdNumber,
    officialRecordId: record.id
  });

  if (accountInfo.exists) {
    if (emailEnv.enabled && accountInfo.status === "SETUP" && accountInfo.profileId) {
      try {
        const reservation = await reserveSetupEmailDelivery(admin, accountInfo.profileId);
        if (reservation === "cooldown") {
          return { message: "A setup link was requested recently. Please wait a few minutes before trying again." };
        }
        if (reservation !== "reserved") {
          return { message: "A setup link could not be sent. Please contact the Registrar." };
        }
        await sendAccountSetupEmailService(admin, email);
        await clearClaimCookie();
        return { success: true, message: "A new setup link has been sent to your email address." };
      } catch {
        await releaseSetupEmailDelivery(admin, accountInfo.profileId);
        await clearClaimCookie();
        return { message: "A setup link could not be sent. Please contact the Registrar." };
      }
    }

    await clearClaimCookie();
    logClaimFailure("claim_already_exists_before_registration");
    redirect(getInvalidClaimRecoveryPath());
  }

  const result = await performStudentRegistrationService(
    admin,
    {
      officialRecordId: record.id,
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
