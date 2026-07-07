import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/session";

export type ChangePasswordState = {
  message?: string;
  success?: boolean;
};

async function changeSignedInUserPassword({
  supabase,
  email,
  currentPassword,
  newPassword,
  confirmPassword
}: {
  supabase: {
    auth: {
      signInWithPassword: (credentials: { email: string; password: string }) => Promise<{ error: unknown }>;
      updateUser: (attributes: { password: string }) => Promise<{ error: unknown }>;
    };
  };
  email: string;
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}): Promise<ChangePasswordState> {
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
    email,
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

  return { message: "Password updated successfully.", success: true };
}

export async function handleChangePasswordAction(
  role: "admin" | "student",
  revalidateUrl: string,
  formData: FormData
): Promise<ChangePasswordState> {
  const { supabase, profile } = await requireRole(role);
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
    revalidatePath(revalidateUrl);
  }

  return result;
}

