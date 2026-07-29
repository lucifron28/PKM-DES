"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient, createSupabaseAdminClient } from "@/lib/supabase/server";

export type SetupAccountState = {
  message?: string;
};

export async function setupAccountAction(_previousState: SetupAccountState, formData: FormData): Promise<SetupAccountState> {
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirm_password") ?? "");

  if (!password || !confirmPassword) {
    return { message: "Password and confirmation are required." };
  }
  if (password !== confirmPassword) {
    return { message: "Passwords do not match." };
  }
  if (password.length < 8) {
    return { message: "Password must be at least 8 characters." };
  }

  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError || !user) {
    return { message: "Your setup session has expired or is invalid. Please request a new setup email." };
  }

  // Update password
  const { error: updateError } = await supabase.auth.updateUser({ password });
  if (updateError) {
    return { message: "Failed to update password: " + updateError.message };
  }

  // Update account_status to ACTIVE in app_metadata & profiles
  let admin;
  try {
    admin = createSupabaseAdminClient();
  } catch {
    return { message: "Admin client unavailable to finalize account setup." };
  }

  const { error: adminAuthError } = await admin.auth.admin.updateUserById(user.id, {
    app_metadata: { role: "student", account_status: "ACTIVE" }
  });

  if (adminAuthError) {
    return { message: "Failed to set active account status in auth." };
  }

  const { error: profileError } = await admin
    .from("profiles")
    .update({ account_status: "ACTIVE" })
    .eq("id", user.id);

  if (profileError) {
    return { message: "Failed to set active account status in profile." };
  }

  redirect("/student/dashboard");
}
