import { cache } from "react";
import { redirect } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Profile, Student, UserRole } from "@/types/database";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const getCurrentProfile = cache(async function getCurrentProfile() {
  const supabase = await createSupabaseServerClient().catch(() => null);

  if (!supabase) {
    return { supabase: null, user: null, profile: null };
  }

  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return { supabase, user: null, profile: null };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role, account_status, first_name, last_name, email")
    .eq("id", user.id)
    .maybeSingle();

  return { supabase, user, profile: (profile as Profile | null) ?? null };
});

export async function requireRole(role: UserRole) {
  const context = await getCurrentProfile();

  if (!context.user) {
    redirect("/login");
  }

  if (!context.supabase) {
    redirect("/login");
  }

  if (!context.profile || context.profile.account_status !== "ACTIVE") {
    await context.supabase.auth.signOut();
    redirect("/login");
  }

  if (context.profile.role !== role) {
    redirect(context.profile.role === "admin" ? "/admin/dashboard" : "/student/dashboard");
  }

  return {
    ...context,
    user: context.user,
    profile: context.profile
  };
}

export async function fetchStudentForProfile(supabase: SupabaseClient, profileId: string) {
  const { data } = await supabase
    .from("students")
    .select("*, programs(*)")
    .eq("profile_id", profileId)
    .maybeSingle();

  return (data as Student | null) ?? null;
}

export const getStudentForProfile = cache(async function getStudentForProfile(profileId: string) {
  const supabase = await createSupabaseServerClient();
  return fetchStudentForProfile(supabase, profileId);
});
