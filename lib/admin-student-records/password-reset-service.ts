import type { SupabaseClient } from "@supabase/supabase-js";
import {
  isExactActiveStudentAccount,
  type StudentPasswordResetState,
  validateStudentPasswordResetInput
} from "./password-reset";

export async function resetStudentPasswordService(
  supabase: SupabaseClient,
  formData: FormData
): Promise<StudentPasswordResetState> {
  const officialRecordId = String(formData.get("official_record_id") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirm_password") ?? "");

  if (!officialRecordId) {
    return { message: "Student account could not be verified. Refresh the record and try again." };
  }

  const validation = validateStudentPasswordResetInput({ password, confirmPassword });
  if (validation.message) {
    return validation;
  }

  const { data: record, error: recordError } = await supabase
    .from("official_student_records")
    .select("id, email, student_id_number")
    .eq("id", officialRecordId)
    .maybeSingle();

  if (recordError || !record?.student_id_number) {
    console.error("official_student_records:password_reset_record_load", recordError);
    return { message: "Student account could not be verified. Refresh the record and try again." };
  }

  const { data: accountStudent, error: studentError } = await supabase
    .from("students")
    .select("profile_id, student_id_number")
    .eq("student_id_number", record.student_id_number)
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
      accountStatus: accountProfile.account_status
    })
  ) {
    return { message: "Password reset is available only for exact active student account matches." };
  }

  const { error: resetError } = await supabase.auth.admin.updateUserById(accountStudent.profile_id, {
    password
  });

  if (resetError) {
    console.error("official_student_records:password_reset_update", resetError);
    return { message: "Password could not be updated. Please try again." };
  }

  return { success: true, message: "Temporary password updated successfully. Share it privately with the student." };
}
