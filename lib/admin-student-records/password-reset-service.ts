// Server-only guard for production. Tests bypass via tsx environment.
import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  isExactActiveStudentAccount,
  type StudentPasswordResetState,
  validateStudentPasswordResetInput
} from "./password-reset";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

/**
 * Resets a student's temporary password.
 *
 * The admin client is injected for testability. In production, it defaults
 * to createSupabaseAdminClient(). The Auth password update and audit log
 * insertion are NOT one atomic transaction: if Auth succeeds but audit fails,
 * the password update remains effective in Auth.
 */
export async function resetStudentPasswordService(
  supabase: SupabaseClient,
  formData: FormData,
  actorProfileId: string,
  adminClient?: SupabaseClient
): Promise<StudentPasswordResetState> {
  const officialRecordId = String(formData.get("official_record_id") ?? "").trim();
  const temporaryPassword = String(formData.get("temporary_password") ?? "");
  const confirmTemporaryPassword = String(formData.get("confirm_temporary_password") ?? "");

  if (!officialRecordId) {
    return { message: "Student account could not be verified. Refresh the record and try again." };
  }

  const validation = validateStudentPasswordResetInput({
    temporary_password: temporaryPassword,
    confirm_temporary_password: confirmTemporaryPassword
  });
  if (validation.message) {
    return validation;
  }

  const { data: record, error: recordError } = await supabase
    .from("official_student_records")
    .select("id, email, student_id_number")
    .eq("id", officialRecordId)
    .maybeSingle();

  if (recordError || !record?.id || !record?.student_id_number) {
    console.error("official_student_records:password_reset_record_load", recordError);
    return { message: "Student account could not be verified. Refresh the record and try again." };
  }

  const { data: accountStudent, error: studentError } = await supabase
    .from("students")
    .select("id, profile_id, student_id_number, official_record_id")
    .eq("official_record_id", record.id)
    .maybeSingle();

  if (studentError || !accountStudent?.profile_id) {
    console.error("official_student_records:password_reset_student_lookup", studentError);
    return { message: "Student account could not be verified. Refresh the record and try again." };
  }

  const { data: accountProfile, error: profileError } = await supabase
    .from("profiles")
    .select("email, role, account_status")
    .eq("id", accountStudent.profile_id)
    .maybeSingle();

  if (profileError || !accountProfile) {
    console.error("official_student_records:password_reset_profile_lookup", profileError);
    return { message: "Student account could not be verified. Refresh the record and try again." };
  }

  if (
    !isExactActiveStudentAccount({
      officialEmail: record.email,
      officialStudentId: record.student_id_number,
      accountEmail: accountProfile.email,
      accountStudentId: accountStudent.student_id_number,
      accountRole: accountProfile.role,
      accountStatus: accountProfile.account_status,
      linkedRecordId: accountStudent.official_record_id,
      expectedRecordId: record.id
    })
  ) {
    return { message: "Password reset is available only for exact active student account matches." };
  }

  // Use injected admin client for testability, or create the real one.
  let resolvedAdmin = adminClient;
  if (!resolvedAdmin) {
    try {
      resolvedAdmin = createSupabaseAdminClient();
    } catch (adminEnvError) {
      console.error("official_student_records:password_reset_admin_client_init", adminEnvError);
      return { message: "Password reset service is unavailable. Please try again later." };
    }
  }

  const { data: authUserData, error: authUserError } = await resolvedAdmin.auth.admin.getUserById(
    accountStudent.profile_id
  );

  const normalizedOfficialEmail = record.email.trim().toLowerCase();
  const normalizedAccountEmail = accountProfile.email.trim().toLowerCase();
  const normalizedAuthEmail = authUserData?.user?.email?.trim().toLowerCase() ?? null;

  if (
    authUserError ||
    !authUserData?.user ||
    authUserData.user.id !== accountStudent.profile_id ||
    !normalizedAuthEmail ||
    normalizedAuthEmail !== normalizedOfficialEmail ||
    normalizedAuthEmail !== normalizedAccountEmail
  ) {
    console.error("official_student_records:password_reset_auth_user_verify", authUserError);
    return { message: "Student account could not be verified in Supabase Auth. Refresh the record and try again." };
  }

  const { error: resetError } = await resolvedAdmin.auth.admin.updateUserById(accountStudent.profile_id, {
    password: temporaryPassword
  });

  if (resetError) {
    console.error("official_student_records:password_reset_update", resetError);
    return { message: "Password could not be updated. Please try again." };
  }

  // Audit target is accountStudent.id (students table PK), NOT profile_id.
  const { error: auditError } = await supabase.from("audit_logs").insert({
    actor_profile_id: actorProfileId,
    action: "RESET_STUDENT_PASSWORD",
    target_table: "students",
    target_id: accountStudent.id
  });

  if (auditError) {
    console.error("official_student_records:password_reset_audit_failed", auditError);
  }

  // No password value appears in the returned state or logged error.
  return { success: true, message: "Temporary password updated successfully. Share it privately with the student." };
}
