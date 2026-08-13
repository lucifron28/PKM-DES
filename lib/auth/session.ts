import { cache } from "react";
import { redirect } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { OfficialSignerRole, Profile, Student, UserRole } from "@/types/database";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { hasRegistrarManagementAccess } from "@/lib/official-roles/management";
import { hasActiveOfficialRole, loadActiveOfficialRoleAssignments } from "@/lib/official-roles/repository";

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

export async function requireRegistrarAdmin() {
  const context = await requireRole("admin");
  const { assignments, error } = await loadActiveOfficialRoleAssignments(context.supabase, context.profile.id);

  if (error || !hasRegistrarManagementAccess(assignments)) {
    redirect("/admin/dashboard?error=registrar_only");
  }

  return { ...context, assignments };
}

export async function requireOfficialSignerRole(role: OfficialSignerRole) {
  const context = await requireRole("admin");
  const { assignments, error } = await loadActiveOfficialRoleAssignments(context.supabase, context.profile.id);

  if (error || !hasActiveOfficialRole(assignments, role)) {
    redirect("/admin/dashboard?error=official_role_required");
  }

  return { ...context, assignments };
}

export type StudentQueryResult =
  | { status: "found"; student: Student }
  | { status: "not_found"; student: null }
  | { status: "query_failed"; student: null; error: unknown };

export async function fetchStudentQueryResult(
  supabase: SupabaseClient,
  profileId: string
): Promise<StudentQueryResult> {
  const { data, error } = await supabase
    .from("students")
    .select("*, programs(*)")
    .eq("profile_id", profileId)
    .maybeSingle();

  if (error) {
    console.error("lib_auth_session:fetch_student_query_failed", { profileId, message: error.message });
    return { status: "query_failed", student: null, error };
  }

  if (!data) {
    return { status: "not_found", student: null };
  }

  return { status: "found", student: data as Student };
}

/**
 * Convenience helper returning Student | null where callers intentionally treat error or missing student as null.
 */
export async function fetchStudentForProfile(supabase: SupabaseClient, profileId: string): Promise<Student | null> {
  const result = await fetchStudentQueryResult(supabase, profileId);
  return result.status === "found" ? result.student : null;
}

export const getStudentQueryResult = cache(async function getStudentQueryResult(profileId: string) {
  const supabase = await createSupabaseServerClient();
  return fetchStudentQueryResult(supabase, profileId);
});

/**
 * Convenience cached helper returning Student | null where callers intentionally treat error or missing student as null.
 */
export const getStudentForProfile = cache(async function getStudentForProfile(profileId: string) {
  const result = await getStudentQueryResult(profileId);
  return result.status === "found" ? result.student : null;
});
