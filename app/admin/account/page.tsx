import { Card, CardHeader } from "@/components/ui/card";
import { ChangePasswordForm } from "@/components/forms/change-password-form";
import { SignatureSpecimenManager } from "@/components/signatures/signature-specimen-manager";
import { requireRole } from "@/lib/auth/session";
import { loadActiveOfficialRoleAssignments } from "@/lib/official-roles/repository";
import { OFFICIAL_ROLE_LABELS } from "@/lib/official-roles/roles";
import { loadCurrentSignatureSpecimen } from "@/lib/signatures/specimens";
import { changeAdminPasswordAction, deleteAdminSignatureSpecimenAction, saveAdminSignatureSpecimenAction } from "./actions";
import { DetailList } from "@/components/ui/detail-list";

export default async function AdminAccountPage() {
  const { profile, supabase } = await requireRole("admin");
  const { assignments, error } = await loadActiveOfficialRoleAssignments(supabase, profile.id);
  const assignedRole = error
    ? "Unavailable"
    : assignments.length
      ? assignments.map((assignment) => OFFICIAL_ROLE_LABELS[assignment.official_role]).join(" - ")
      : "Registrar/Admin management";
  const signatureSpecimen = await loadCurrentSignatureSpecimen(supabase, profile.id);
  const rows: Array<[string, string]> = [
    ["Admin Full Name", `${profile.first_name} ${profile.last_name}`.trim()],
    ["Admin Email Address", profile.email],
    ["Assigned Role", assignedRole],
    ["Account Status", profile.account_status]
  ];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader title="Admin Account" description="Internal administrator account details." />
        <DetailList rows={rows} />
      </Card>

      <SignatureSpecimenManager
        specimen={signatureSpecimen}
        roleLabels={assignments.map((assignment) => OFFICIAL_ROLE_LABELS[assignment.official_role])}
        saveAction={saveAdminSignatureSpecimenAction}
        deleteAction={deleteAdminSignatureSpecimenAction}
      />

      <Card>
        <CardHeader
          title="Account Security"
          description="Change your admin password while signed in."
        />
        <ChangePasswordForm action={changeAdminPasswordAction} />
      </Card>
    </div>
  );
}
