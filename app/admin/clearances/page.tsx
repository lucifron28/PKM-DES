import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth/session";
import { getAdminLandingDestination } from "@/lib/official-roles/roles";
import { loadActiveOfficialRoleAssignments } from "@/lib/official-roles/repository";

export default async function OfficialClearancesIndexPage() {
  const { supabase, profile } = await requireRole("admin");
  const { assignments } = await loadActiveOfficialRoleAssignments(supabase, profile.id);
  redirect(getAdminLandingDestination(assignments));
}
