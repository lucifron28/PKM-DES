"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/session";
import { changeSignedInUserPassword } from "@/lib/auth/password";

export type AdminChangePasswordState = {
  message?: string;
  success?: boolean;
};

export async function changeAdminPasswordAction(
  _previousState: AdminChangePasswordState,
  formData: FormData
): Promise<AdminChangePasswordState> {
  const { supabase, profile } = await requireRole("admin");
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
    revalidatePath("/admin/account");
  }

  return result;
}
