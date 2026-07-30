import type { SupabaseClient } from "@supabase/supabase-js";
import type { AccountStatus, OfficialStudentRecord, Program, StudentType, YearLevel } from "@/types/database";

export type OfficialRecordWithProgram = OfficialStudentRecord & {
  programs?: Pick<Program, "name"> | null;
};

export type AccountDetails = {
  officialRecordId: string;
  studentIdNumber: string;
  firstName: string;
  lastName: string;
  email: string;
  programId: string;
  yearLevel: YearLevel;
  studentType: StudentType;
};

export async function findExactOfficialRecord({
  admin,
  email,
  studentIdNumber
}: {
  admin: SupabaseClient;
  email: string;
  studentIdNumber: string;
}): Promise<OfficialRecordWithProgram | null> {
  const { data, error } = await admin
    .from("official_student_records")
    .select("*, programs(name)")
    .eq("email", email)
    .eq("student_id_number", studentIdNumber)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return data as OfficialRecordWithProgram;
}

export async function findExistingStudentAccount({
  admin,
  email,
  studentIdNumber,
  officialRecordId
}: {
  admin: SupabaseClient;
  email: string;
  studentIdNumber: string;
  officialRecordId?: string;
}): Promise<{ exists: boolean; status: AccountStatus | null; profileId: string | null }> {
  const [existingProfileResult, existingStudentResult, existingLinkResult] = await Promise.all([
    admin.from("profiles").select("id, account_status").eq("email", email).limit(1).maybeSingle(),
    admin.from("students").select("id").eq("student_id_number", studentIdNumber).limit(1).maybeSingle(),
    officialRecordId
      ? admin.from("students").select("id").eq("official_record_id", officialRecordId).limit(1).maybeSingle()
      : Promise.resolve({ data: null, error: null })
  ]);

  if (existingProfileResult.error || existingStudentResult.error || existingLinkResult.error) {
    return { exists: true, status: null, profileId: null };
  }

  const exists = Boolean(existingProfileResult.data || existingStudentResult.data || existingLinkResult.data);
  const status = (existingProfileResult.data as { account_status: AccountStatus } | null)?.account_status ?? null;
  const profileId = (existingProfileResult.data as { id: string } | null)?.id ?? null;
  return { exists, status, profileId };
}

export async function reserveSetupEmailDelivery(
  admin: SupabaseClient,
  profileId: string
): Promise<"reserved" | "cooldown" | "invalid_account"> {
  const { data, error } = await admin.rpc("reserve_student_setup_email_delivery", {
    p_profile_id: profileId
  });

  if (error || !data) {
    return "invalid_account";
  }

  const outcome = Array.isArray(data) ? (data[0] as { outcome: string })?.outcome : (data as { outcome: string })?.outcome;
  if (outcome === "reserved" || outcome === "cooldown") {
    return outcome;
  }
  return "invalid_account";
}

export async function releaseSetupEmailDelivery(
  admin: SupabaseClient,
  profileId: string
): Promise<void> {
  try {
    await admin.rpc("release_student_setup_email_delivery", {
      p_profile_id: profileId
    });
  } catch (err) {
    console.error("[account-claim] release_setup_email_failed", err);
  }
}

export async function cleanupNewRegistration(
  admin: SupabaseClient,
  profileId: string,
  stage: "profile_insert" | "student_insert"
): Promise<void> {
  if (stage === "student_insert") {
    await admin.from("students").delete().eq("profile_id", profileId);
  }
  await admin.from("profiles").delete().eq("id", profileId);
  await admin.auth.admin.deleteUser(profileId);
}
