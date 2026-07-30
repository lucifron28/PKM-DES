"use server";

import { redirect } from "next/navigation";
import { isEligibleStudentSetupProfile } from "@/lib/account-setup/rules";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { AccountStatus, UserRole } from "@/types/database";

export type SetupAccountState = {
  message?: string;
};

type SetupCompletionResult = {
  outcome: "completed" | "invalid_setup" | "unauthorized";
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

  const { data: profileData, error: profileLookupError } = await supabase
    .from("profiles")
    .select("role, account_status")
    .eq("id", user.id)
    .maybeSingle();
  const profile = profileData as { role: UserRole; account_status: AccountStatus } | null;

  if (profileLookupError || !isEligibleStudentSetupProfile(profile)) {
    return { message: "Your setup session has expired or is invalid. Please request a new setup email." };
  }

  const { error: updateError } = await supabase.auth.updateUser({ password });
  if (updateError) {
    return { message: "Could not update your password. Please try again." };
  }

  const { data: completionData, error: completionError } = await supabase.rpc("complete_student_account_setup");
  const completion = (completionData as SetupCompletionResult[] | null)?.[0];

  if (completionError || completion?.outcome !== "completed") {
    return {
      message: "Your password was saved, but account activation is not complete. Please submit this form again while this setup session is open."
    };
  }

  redirect("/student/dashboard");
}
