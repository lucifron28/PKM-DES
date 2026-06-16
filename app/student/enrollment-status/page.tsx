"use client";

import { Badge, enrollmentBadgeTone } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { useStudentPortal } from "@/components/student/student-portal-provider";

export default function EnrollmentStatusPage() {
  const { student } = useStudentPortal();

  if (!student) {
    return <EmptyState title="Student record not found." description="Please contact an administrator." />;
  }

  const status = student.enrollment_status;

  return (
    <Card>
      <CardHeader title="Enrollment Status Result" description="Your latest enrollment status is shown below." />
      <div className="rounded-lg bg-slateui-surfaceAlt p-5">
        <Badge tone={enrollmentBadgeTone(status)}>{status}</Badge>
        {status === "PENDING" ? (
          <p className="mt-4 text-base font-semibold text-slateui-text">
            Your enrollment request has been submitted and is pending approval.
          </p>
        ) : status === "ENROLLED" ? (
          <div className="mt-4 space-y-2">
            <p className="text-base font-semibold text-slateui-text">Congratulations! You are now officially enrolled.</p>
            <p className="text-sm text-slateui-secondary">Please print your draft registration form.</p>
          </div>
        ) : (
          <p className="mt-4 text-base font-semibold text-slateui-text">
            No active enrollment request is recorded for your account.
          </p>
        )}
      </div>
      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <ButtonLink href="/student/cor" variant="secondary">Print Registration Form</ButtonLink>
        <ButtonLink href="/student/grades" variant="outline">View Grades</ButtonLink>
        <ButtonLink href="/student/schedule" variant="outline">View Class Schedule</ButtonLink>
        <ButtonLink href="/student/balances" variant="outline">View Balances</ButtonLink>
      </div>
    </Card>
  );
}
