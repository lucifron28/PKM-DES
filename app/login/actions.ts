"use server";

import { redirect } from "next/navigation";
import { getSafeNextDestination } from "@/lib/auth/safe-next-destination";
import { createSupabaseServerClient } from "@/lib/supabase/server";
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
  const destination = getSafeNextDestination(rawNext, typedProfile.role);
  redirect(destination);
}
