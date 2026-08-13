import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { requireRole } from "@/lib/auth/session";
import { OFFICIAL_ROLE_LABELS, OFFICIAL_SIGNER_ROLES } from "@/lib/official-roles/roles";
import { setOfficialRoleAssignmentAction } from "./actions";
import type { OfficialRoleAssignment, Profile } from "@/types/database";

const RESULT_MESSAGES: Record<string, string> = {
  assigned: "Official signing assignment saved.",
  revoked: "Official signing assignment revoked. Historical signatures remain unchanged.",
  unchanged: "No assignment change was needed.",
  invalid_request: "The assignment request was invalid.",
  assignment_failed: "The official signing assignment could not be saved.",
  self_assignment_forbidden: "You cannot assign or revoke your own official signing roles.",
  target_not_admin: "Official signing assignments can only be attached to admin accounts.",
  target_not_active: "Only active admin accounts can receive a signing assignment.",
  invalid_program: "The selected program scope is not available.",
  not_found: "The requested assignment was not found.",
  conflict: "The assignment changed concurrently. Refresh and try again."
};

type AdminProfile = Pick<Profile, "id" | "first_name" | "last_name" | "email" | "role" | "account_status">;

function displayName(profile: AdminProfile) {
  return [profile.first_name, profile.last_name].filter(Boolean).join(" ").trim() || "Unnamed admin";
}

function accountTone(status: string) {
  return status === "ACTIVE" ? "success" as const : "warning" as const;
}

export default async function OfficialSignersPage({
  searchParams
}: {
  searchParams?: Promise<{ success?: string; error?: string }>;
}) {
  const { supabase, profile } = await requireRole("admin");
  const params = (await searchParams) ?? {};
  const [{ data: profileData, error: profileError }, { data: assignmentData, error: assignmentError }] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, first_name, last_name, email, role, account_status")
      .eq("role", "admin")
      .order("last_name", { ascending: true }),
    supabase
      .from("official_role_assignments")
      .select("id, profile_id, official_role, program_id, active, created_at, updated_at")
      .order("created_at", { ascending: true })
  ]);

  if (profileError || assignmentError) {
    return <EmptyState title="Official Signing Roles are unavailable" description="The admin accounts or assignment records could not be loaded safely." />;
  }

  const adminProfiles = (profileData as AdminProfile[] | null) ?? [];
  const assignments = (assignmentData as OfficialRoleAssignment[] | null) ?? [];
  const assignmentByProfile = new Map<string, OfficialRoleAssignment[]>(
    adminProfiles.map((adminProfile) => [
      adminProfile.id,
      assignments.filter((assignment) => assignment.profile_id === adminProfile.id)
    ])
  );
  const resultKey = params.success ?? params.error;
  const resultMessage = resultKey ? RESULT_MESSAGES[resultKey] ?? "The assignment request completed with an unrecognized result." : null;
  const resultIsSuccess = Boolean(params.success);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader
          title="Official Signing Roles"
          description="Attach explicit signing capabilities to existing admin/staff accounts. These assignments are not separate login roles."
        />
        <div className="space-y-3 text-sm leading-6 text-slateui-secondary">
          <p>Each official uses their own authenticated admin account. Every clearance still requires a separate drawn e-signature.</p>
          <p>For this research MVP, an active admin may manage another admin account&apos;s assignments, but cannot assign or revoke their own roles. Program-scoped assignments remain controlled configuration and are not created by this page.</p>
        </div>
        {resultMessage ? (
          <p className={`mt-4 rounded-md border px-3 py-2 text-sm font-semibold ${resultIsSuccess ? "border-green-200 bg-green-50 text-green-800" : "border-red-200 bg-red-50 text-red-800"}`} role={resultIsSuccess ? "status" : "alert"}>
            {resultMessage}
          </p>
        ) : null}
      </Card>

      {adminProfiles.length === 0 ? (
        <EmptyState title="No admin accounts found" description="Create or provision an individual admin account before assigning official signing responsibilities." />
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {adminProfiles.map((adminProfile) => {
            const profileAssignments = assignmentByProfile.get(adminProfile.id) ?? [];
            const isSelf = adminProfile.id === profile.id;
            return (
              <Card key={adminProfile.id}>
                <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slateui-border pb-4">
                  <div>
                    <h2 className="font-bold text-slateui-text">{displayName(adminProfile)}</h2>
                    <p className="mt-1 text-sm text-slateui-muted">{adminProfile.email}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Badge tone="brand">Admin account</Badge>
                    <Badge tone={accountTone(adminProfile.account_status)}>{adminProfile.account_status}</Badge>
                  </div>
                </div>

                {isSelf ? (
                  <p className="mt-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900" role="note">
                    Your own assignments are read-only here. Another authorized admin or reviewed SQL provisioning path must change them.
                  </p>
                ) : null}

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {OFFICIAL_SIGNER_ROLES.map((role) => {
                    const globalAssignment = profileAssignments.find((assignment) => assignment.official_role === role && assignment.program_id === null);
                    const scopedAssignments = profileAssignments.filter((assignment) => assignment.official_role === role && assignment.program_id !== null);
                    const isActive = globalAssignment?.active === true;
                    const isScoped = scopedAssignments.some((assignment) => assignment.active);
                    const canChange = !isSelf && !isScoped && (isActive || adminProfile.account_status === "ACTIVE");

                    return (
                      <div key={role} className="rounded-md border border-slateui-border bg-slateui-surfaceAlt p-3">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="font-semibold text-slateui-text">{OFFICIAL_ROLE_LABELS[role]}</p>
                            <p className="mt-1 text-xs text-slateui-muted">{globalAssignment ? "Global assignment" : isScoped ? "Program-scoped assignment" : "Not assigned"}</p>
                          </div>
                          <Badge tone={isActive || isScoped ? "success" : "neutral"}>{isActive || isScoped ? "Assigned" : "Unassigned"}</Badge>
                        </div>
                        {isScoped ? (
                          <p className="mt-3 text-xs leading-5 text-slateui-muted">Program-specific scope is managed separately and is not changed here.</p>
                        ) : (
                          <form action={setOfficialRoleAssignmentAction} className="mt-3">
                            <input type="hidden" name="profile_id" value={adminProfile.id} />
                            <input type="hidden" name="official_role" value={role} />
                            <input type="hidden" name="active" value={isActive ? "false" : "true"} />
                            <input type="hidden" name="program_id" value="" />
                            <Button type="submit" variant={isActive ? "danger" : "outline"} disabled={!canChange} className="w-full">
                              {isActive ? "Revoke assignment" : "Assign role"}
                            </Button>
                          </form>
                        )}
                      </div>
                    );
                  })}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
