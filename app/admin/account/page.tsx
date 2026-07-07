import { Card, CardHeader } from "@/components/ui/card";
import { ChangePasswordForm } from "@/components/forms/change-password-form";
import { requireRole } from "@/lib/auth/session";
import { changeAdminPasswordAction } from "./actions";
import { DetailList } from "@/components/ui/detail-list";

export default async function AdminAccountPage() {
  const { profile } = await requireRole("admin");
  const rows: Array<[string, string]> = [
    ["Admin Full Name", `${profile.first_name} ${profile.last_name}`.trim()],
    ["Admin Email Address", profile.email],
    ["Assigned Role", "Admin"],
    ["Account Status", profile.account_status]
  ];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader title="Admin Account" description="Internal administrator account details." />
        <DetailList rows={rows} />
      </Card>

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
