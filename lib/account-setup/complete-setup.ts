import type { SupabaseClient } from "@supabase/supabase-js";
import { isEligibleStudentSetupProfile } from "./rules";
import type { AccountStatus, UserRole } from "@/types/database";

type SetupCompletionResult = {
  outcome: "completed" | "invalid_setup" | "unauthorized";
};

export type StudentSetupResult =
  | { outcome: "completed" }
  | { outcome: "already_active"; role: UserRole }
  | { outcome: "unauthorized" | "invalid_setup" | "password_update_failed" | "activation_failed" };

export async function completeStudentAccountSetup(
  supabase: SupabaseClient,
  password: string
): Promise<StudentSetupResult> {
  const {
    data: { user },
    error: userError
  } = await supabase.auth.getUser();

  if (userError || !user) return { outcome: "unauthorized" };

  const { data: profileData, error: profileLookupError } = await supabase
    .from("profiles")
    .select("role, account_status")
    .eq("id", user.id)
    .maybeSingle();
  const profile = profileData as { role: UserRole; account_status: AccountStatus } | null;

  if (profileLookupError || !profile) return { outcome: "invalid_setup" };
  if (profile.account_status === "ACTIVE") return { outcome: "already_active", role: profile.role };
  if (!isEligibleStudentSetupProfile(profile)) return { outcome: "invalid_setup" };

  const { error: updateError } = await supabase.auth.updateUser({ password });
  if (updateError) return { outcome: "password_update_failed" };

  const { data: completionData, error: completionError } = await supabase.rpc(
    "complete_student_account_setup"
  );
  const completion = (completionData as SetupCompletionResult[] | null)?.[0];

  if (completionError || completion?.outcome !== "completed") {
    return { outcome: "activation_failed" };
  }

  return { outcome: "completed" };
}
