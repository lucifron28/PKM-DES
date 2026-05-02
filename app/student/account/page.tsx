"use client";

import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { useStudentPortal } from "@/components/student/student-portal-provider";

export default function StudentAccountPage() {
  const { profile, student } = useStudentPortal();

  if (!student) {
    return <EmptyState title="Student record not found." description="Please contact an administrator." />;
  }

  const rows = [
    ["Student ID Number", student.student_id_number ?? "Not provided"],
    ["First Name", profile.first_name],
    ["Last Name", profile.last_name],
    ["Active Email Address", profile.email],
    ["Program", student.programs?.name ?? "Not available"],
    ["Year Level", student.year_level]
  ];

  return (
    <Card>
      <CardHeader title="Account" description="Displayed student profile details." />
      <dl className="grid gap-3 text-sm">
        {rows.map(([label, value]) => (
          <div key={label} className="grid gap-1 border-b border-slateui-border pb-3 sm:grid-cols-[220px_1fr]">
            <dt className="font-medium text-slateui-muted">{label}</dt>
            <dd className="font-semibold text-slateui-text">{value}</dd>
          </div>
        ))}
      </dl>
      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <Button type="button" variant="outline" disabled>
          Edit Profile
        </Button>
        <Button type="button" variant="outline" disabled>
          Change Password
        </Button>
      </div>
    </Card>
  );
}
