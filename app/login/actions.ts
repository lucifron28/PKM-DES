"use server";

import { redirect } from "next/navigation";
import { getSafeNextDestination } from "@/lib/auth/safe-next-destination";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getAdminLandingDestination } from "@/lib/official-roles/roles";
import { loadActiveOfficialRoleAssignments } from "@/lib/official-roles/repository";
import type { Profile } from "@/types/database";

export type LoginState = {
  message?: string;
};

export async function loginAction(_previousState: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!password) {
    return { message: "Password required" };
  }

  if (!email) {
    return { message: "Invalid email or password" };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { message: "Invalid email or password" };
  }

  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return { message: "Account not found" };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  const typedProfile = profile as Profile | null;

  if (!typedProfile || typedProfile.account_status !== "ACTIVE") {
    await supabase.auth.signOut();
    return { message: "Account not found" };
  }

  const rawNext = String(formData.get("next") ?? "");
  let destination = getSafeNextDestination(rawNext, typedProfile.role);
  if (typedProfile.role === "admin" && !rawNext.trim()) {
    const { assignments, error: assignmentError } = await loadActiveOfficialRoleAssignments(supabase, typedProfile.id);
    destination = assignmentError ? "/admin/dashboard" : getAdminLandingDestination(assignments);
  }
  redirect(destination);
}
