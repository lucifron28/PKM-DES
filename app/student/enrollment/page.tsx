"use client";

import { Card, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { EnrollmentForm } from "@/components/forms/enrollment-form";
import { useStudentPortal } from "@/components/student/student-portal-provider";
import { formatName } from "@/lib/utils/format";

export default function OnlineEnrollmentPage() {
  const { profile, student } = useStudentPortal();

  if (!student) {
    return <EmptyState title="Student record not found." description="Please contact an administrator." />;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader title="Online Enrollment" description={`Enrollment Type: ${student.student_type}`} />
        <div className="mb-6 grid gap-4 rounded-lg bg-slateui-surfaceAlt p-4 text-sm sm:grid-cols-3">
          <div>
            <p className="font-medium text-slateui-muted">Student ID</p>
            <p className="mt-1 font-semibold text-slateui-text">{student.student_id_number ?? "Not provided"}</p>
          </div>
          <div>
            <p className="font-medium text-slateui-muted">Full Name</p>
            <p className="mt-1 font-semibold text-slateui-text">{formatName(profile.first_name, profile.last_name)}</p>
          </div>
          <div>
            <p className="font-medium text-slateui-muted">Email Address</p>
            <p className="mt-1 break-all font-semibold text-slateui-text">{profile.email}</p>
          </div>
        </div>
        <EnrollmentForm student={student} />
      </Card>
    </div>
  );
}
