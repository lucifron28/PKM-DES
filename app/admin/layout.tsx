import type { ReactNode } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { adminNavigation } from "@/lib/constants/navigation";
import { requireRole } from "@/lib/auth/session";
import { getOfficialWorkspaceNavigation, OFFICIAL_ROLE_LABELS } from "@/lib/official-roles/roles";
import { loadActiveOfficialRoleAssignments } from "@/lib/official-roles/repository";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const { profile, supabase } = await requireRole("admin");
  const { assignments, error } = await loadActiveOfficialRoleAssignments(supabase, profile.id);
  const isRegistrar = Boolean(profile.is_registrar);
  const isOfficialStaff = !isRegistrar;
  const navigation = isRegistrar ? adminNavigation : getOfficialWorkspaceNavigation(error ? [] : assignments);
  const assignedLabels = assignments.map((assignment) => OFFICIAL_ROLE_LABELS[assignment.official_role]).join(" · ") || "Official Staff";

  return (
    <AppShell portalLabel={isOfficialStaff ? "Official Staff Portal" : "Registrar/Admin Portal"} subtitle={isOfficialStaff ? "Focused clearance workspace for authenticated official signers" : "Registrar and enrollment management workspace"} navigation={navigation} userName={[profile.first_name, profile.last_name].filter(Boolean).join(" ") || "Admin User"} userRole={isOfficialStaff ? assignedLabels : "Registrar/Admin"}>
      {children}
    </AppShell>
  );
}
