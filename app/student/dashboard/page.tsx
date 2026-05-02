"use client";

import { BookOpen, ClipboardCheck, UserCircle } from "lucide-react";
import { Badge, enrollmentBadgeTone } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { StatCard } from "@/components/ui/stat-card";
import { useStudentPortal } from "@/components/student/student-portal-provider";
import { formatName } from "@/lib/utils/format";

export default function StudentDashboardPage() {
  const { profile, student } = useStudentPortal();

  if (!student) {
    return <EmptyState title="Student record not found." description="Please contact an administrator." />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slateui-text">Welcome, {formatName(profile.first_name, profile.last_name)}!</h2>
        <p className="mt-1 text-sm text-slateui-muted">Your enrollment pages remain accessible regardless of current enrollment status.</p>
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <StatCard
          label="Student Information"
          value={student.student_id_number ?? "Not provided"}
          helper={`${student.programs?.name ?? "Program unavailable"} · ${student.year_level}`}
          icon={<UserCircle className="h-5 w-5" />}
        />
        <StatCard
          label="Enrollment Status"
          value={<Badge tone={enrollmentBadgeTone(student.enrollment_status)}>{student.enrollment_status}</Badge>}
          helper="Status changes after enrollment review."
          icon={<ClipboardCheck className="h-5 w-5" />}
          tone={student.enrollment_status === "ENROLLED" ? "success" : student.enrollment_status === "PENDING" ? "warning" : "default"}
        />
        <StatCard
          label="Email Address"
          value={<span className="break-all text-base">{profile.email}</span>}
          helper="Use your active email address."
          icon={<BookOpen className="h-5 w-5" />}
          tone="info"
        />
      </div>
      <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <Card>
          <CardHeader title="Student Information" />
          <dl className="grid gap-3 text-sm">
            <div className="flex justify-between gap-4 border-b border-slateui-border pb-3">
              <dt className="font-medium text-slateui-muted">Student ID</dt>
              <dd className="text-right font-semibold text-slateui-text">{student.student_id_number ?? "Not provided"}</dd>
            </div>
            <div className="flex justify-between gap-4 border-b border-slateui-border pb-3">
              <dt className="font-medium text-slateui-muted">Program</dt>
              <dd className="text-right font-semibold text-slateui-text">{student.programs?.name ?? "Not available"}</dd>
            </div>
            <div className="flex justify-between gap-4 border-b border-slateui-border pb-3">
              <dt className="font-medium text-slateui-muted">Year Level</dt>
              <dd className="text-right font-semibold text-slateui-text">{student.year_level}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="font-medium text-slateui-muted">Email Address</dt>
              <dd className="text-right font-semibold text-slateui-text">{profile.email}</dd>
            </div>
          </dl>
        </Card>
        <Card>
          <CardHeader title="Quick Actions" />
          <div className="grid gap-3 sm:grid-cols-2">
            <ButtonLink href="/student/subjects" variant="outline">Subject List</ButtonLink>
            <ButtonLink href="/student/enrollment">Online Enrollment</ButtonLink>
            <ButtonLink href="/student/grades" variant="outline">Grades</ButtonLink>
            <ButtonLink href="/student/schedule" variant="outline">Class Schedule</ButtonLink>
            <ButtonLink href="/student/balances" variant="outline">Balances</ButtonLink>
            <ButtonLink href="/student/account" variant="secondary">Account</ButtonLink>
          </div>
        </Card>
      </div>
    </div>
  );
}
