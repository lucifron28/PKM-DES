import type { SupabaseClient } from "@supabase/supabase-js";
import type { StudentType } from "@/types/database";
import { isCompatibleStudentType } from "@/lib/account-claim/rules";
import { createAccountClaimProof, createClaimFingerprint } from "@/lib/account-claim/token";
import { findExactOfficialRecord, findExistingStudentAccount, type OfficialRecordWithProgram } from "./repository";

export type ClaimRecordSummary = {
  officialRecordId: string;
  studentIdNumber: string;
  maskedEmail: string;
  displayName: string;
  programName: string;
  yearLevel: string;
  studentType: StudentType;
};

export type ClaimServiceResult = {
  success: boolean;
  message?: string;
  token?: string;
  matchedRecord?: ClaimRecordSummary;
  selectedStudentType?: StudentType | null;
  email?: string;
  studentIdNumber?: string;
};

function maskEmailAddress(email: string): string {
  const [localPart, domain] = email.split("@");
  if (!localPart || !domain) return email;
  if (localPart.length <= 2) {
    return `${localPart[0]}***@${domain}`;
  }
  return `${localPart.slice(0, 2)}***@${domain}`;
}

export function summarizeOfficialRecord(
  record: OfficialRecordWithProgram,
  claimedStudentType: StudentType
): ClaimRecordSummary | null {
  if (!record.first_name || !record.last_name || !record.email || !record.program_id || !record.year_level || !record.student_type) {
    return null;
  }

  const programName = record.programs?.name ?? "Program unavailable";

  return {
    officialRecordId: record.id,
    studentIdNumber: record.student_id_number ?? "Not provided",
    maskedEmail: maskEmailAddress(record.email),
    displayName: `${record.first_name} ${record.last_name}`.trim(),
    programName,
    yearLevel: record.year_level,
    studentType: claimedStudentType
  };
}

export async function claimOfficialRecordService({
  admin,
  claimedStudentType,
  email,
  studentIdNumber
}: {
  admin: SupabaseClient;
  claimedStudentType: StudentType;
  email: string;
  studentIdNumber: string;
}): Promise<ClaimServiceResult> {
  const record = await findExactOfficialRecord({ admin, email, studentIdNumber });

  if (!record || !isCompatibleStudentType(claimedStudentType, record.student_type)) {
    return {
      success: false,
      message: "No matching official student record was found.",
      selectedStudentType: claimedStudentType,
      email,
      studentIdNumber
    };
  }

  const existingAccount = await findExistingStudentAccount({
    admin,
    email,
    studentIdNumber,
    officialRecordId: record.id
  });

  if (existingAccount.exists && existingAccount.status !== "SETUP") {
    return {
      success: false,
      message: "An account already exists for this official record. Please log in.",
      selectedStudentType: claimedStudentType,
      email,
      studentIdNumber
    };
  }

  const summary = summarizeOfficialRecord(record, claimedStudentType);
  if (!summary) {
    return {
      success: false,
      message: "The official student record is incomplete. Please contact the Registrar.",
      selectedStudentType: claimedStudentType,
      email,
      studentIdNumber
    };
  }

  const token = createAccountClaimProof({
    officialRecordId: record.id,
    claimedStudentType,
    fingerprint: createClaimFingerprint(record)
  });

  return {
    success: true,
    token,
    matchedRecord: summary,
    selectedStudentType: claimedStudentType,
    email,
    studentIdNumber
  };
}
