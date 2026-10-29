"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { completeStudentAccountSetup } from "@/lib/account-setup/complete-setup";
import { createSupabaseServerClient } from "@/lib/supabase/server";

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
  const result = await completeStudentAccountSetup(supabase, password);

  if (result.outcome === "already_active") {
    redirect(result.role === "admin" ? "/admin/dashboard" : "/student/dashboard");
  }
  if (result.outcome === "unauthorized" || result.outcome === "invalid_setup") {
    return { message: "Your setup session has expired or is invalid. Please request a new setup email." };
  }
  if (result.outcome === "password_update_failed") {
    return { message: "Could not update your password. Please try again." };
  }
  if (result.outcome === "activation_failed") {
    return {
      message: "Your password was saved, but account activation is not complete. Please submit this form again while this setup session is open."
    };
  }

  revalidatePath("/student", "layout");
  revalidatePath("/student/dashboard");
  redirect("/student/dashboard");
}
