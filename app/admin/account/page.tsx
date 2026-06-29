import { Card, CardHeader } from "@/components/ui/card";
import { ChangePasswordForm } from "@/components/forms/change-password-form";
import { requireRole } from "@/lib/auth/session";
import { changeAdminPasswordAction } from "./actions";

function DetailList({ rows }: { rows: Array<[string, string]> }) {
  return (
    <dl className="grid gap-3 text-sm">
      {rows.map(([label, value]) => (
        <div key={label} className="grid gap-1 border-b border-slateui-border pb-3 sm:grid-cols-[220px_1fr]">
          <dt className="font-medium text-slateui-muted">{label}</dt>
          <dd className="font-semibold text-slateui-text">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

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
