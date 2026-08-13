import type { SupabaseClient } from "@supabase/supabase-js";
import type { OfficialRoleAssignment, OfficialSignerRole } from "@/types/database";

export async function loadActiveOfficialRoleAssignments(supabase: SupabaseClient, profileId: string) {
  const { data, error } = await supabase
    .from("official_role_assignments")
    .select("id, profile_id, official_role, program_id, active, created_at, updated_at")
    .eq("profile_id", profileId)
    .eq("active", true);

  return {
    assignments: (data as OfficialRoleAssignment[] | null) ?? [],
    error
  };
}

export function hasActiveOfficialRole(assignments: OfficialRoleAssignment[], role: OfficialSignerRole) {
  return assignments.some((assignment) => assignment.active && assignment.official_role === role);
}

export function hasActiveOfficialRoleForProgram(
  assignments: OfficialRoleAssignment[],
  role: OfficialSignerRole,
  programId: string
) {
  return assignments.some(
    (assignment) =>
      assignment.active &&
      assignment.official_role === role &&
      (assignment.program_id === null || assignment.program_id === programId)
  );
}
