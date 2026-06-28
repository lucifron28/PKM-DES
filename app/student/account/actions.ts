"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/session";

export type ChangePasswordState = {
  message?: string;
  success?: boolean;
};

export async function changePasswordAction(
  _previousState: ChangePasswordState,
  formData: FormData
): Promise<ChangePasswordState> {
  const { supabase, profile } = await requireRole("student");
  const currentPassword = String(formData.get("current_password") ?? "");
  const newPassword = String(formData.get("new_password") ?? "");
  const confirmPassword = String(formData.get("confirm_password") ?? "");

  if (!currentPassword || !newPassword || !confirmPassword) {
    return { message: "Please complete all password fields." };
  }

  if (newPassword.length < 8) {
    return { message: "New password must be at least 8 characters." };
  }

  if (newPassword !== confirmPassword) {
    return { message: "New password and confirmation do not match." };
  }

  if (currentPassword === newPassword) {
    return { message: "New password must be different from the current password." };
  }

  const { error: verifyError } = await supabase.auth.signInWithPassword({
    email: profile.email,
    password: currentPassword
  });

  if (verifyError) {
    return { message: "Current password is incorrect." };
  }

  const { error: updateError } = await supabase.auth.updateUser({
    password: newPassword
  });

  if (updateError) {
    return { message: "Password could not be updated. Please try again." };
  }

  revalidatePath("/student/account");
  return { message: "Password updated successfully.", success: true };
}
