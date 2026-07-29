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

  let supabase;
  try {
    supabase = await createSupabaseServerClient();
  } catch {
    return { message: "Account setup could not be completed. Please request a new setup email." };
  }
  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError || !user) {
    return { message: "Your setup session has expired or is invalid. Please request a new setup email." };
  }

  // Update password
  const { error: updateError } = await supabase.auth.updateUser({ password });
  if (updateError) {
    return { message: "Could not update your password. Please try again." };
  }

  // Update account_status to ACTIVE in app_metadata & profiles
  let admin;
  try {
    admin = createSupabaseAdminClient();
  } catch {
    return { message: "Account setup could not be completed. Please request a new setup email." };
  }

  const { error: adminAuthError } = await admin.auth.admin.updateUserById(user.id, {
    app_metadata: { role: "student", account_status: "ACTIVE" }
  });

  if (adminAuthError) {
    return { message: "Account setup could not be completed. Please request a new setup email." };
  }

  const { error: profileError } = await admin
    .from("profiles")
    .update({ account_status: "ACTIVE" })
    .eq("id", user.id);

  if (profileError) {
    return { message: "Account setup could not be completed. Please request a new setup email." };
  }

  redirect("/student/dashboard");
}
