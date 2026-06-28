"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/session";
import { changeSignedInUserPassword } from "@/lib/auth/password";

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
  const result = await changeSignedInUserPassword({
    supabase,
    email: profile.email,
    currentPassword,
    newPassword,
    confirmPassword
  });

  if (result.success) {
    revalidatePath("/student/account");
  }

  return result;
}
