"use client";

import { BookOpen, ClipboardCheck, UserCircle } from "lucide-react";
import { Badge, enrollmentBadgeTone } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { StatCard } from "@/components/ui/stat-card";
import { useStudentPortal } from "@/components/student/student-portal-provider";
import { formatName } from "@/lib/utils/format";
import { ENABLE_STUB_PAGES } from "@/lib/constants/navigation";

export default function StudentDashboardPage() {
  const { profile, student } = useStudentPortal();

  if (!student) {
    return <EmptyState title="Student record not found." description="Please contact an administrator." />;
  }

  return (
    <div className="space-y-6">
      <div className="border-l-4 border-secondary-600 pl-4">
        <h2 className="text-xl font-bold text-slateui-text sm:text-2xl">Welcome, {formatName(profile.first_name, profile.last_name)}!</h2>
        <p className="mt-1 text-sm leading-6 text-slateui-muted">Your enrollment pages remain accessible regardless of current enrollment status.</p>
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
        <Card className="border-t-4 border-t-primary-800">
          <CardHeader title="Student Information" />
          <dl className="grid gap-3 text-sm">
            <div className="grid gap-1 border-b border-slateui-border pb-3 sm:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] sm:gap-4">
              <dt className="font-medium text-slateui-muted">Student ID</dt>
              <dd className="break-words font-semibold text-slateui-text sm:text-right">{student.student_id_number ?? "Not provided"}</dd>
            </div>
            <div className="grid gap-1 border-b border-slateui-border pb-3 sm:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] sm:gap-4">
              <dt className="font-medium text-slateui-muted">Program</dt>
              <dd className="break-words font-semibold text-slateui-text sm:text-right">{student.programs?.name ?? "Not available"}</dd>
            </div>
            <div className="grid gap-1 border-b border-slateui-border pb-3 sm:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] sm:gap-4">
              <dt className="font-medium text-slateui-muted">Year Level</dt>
              <dd className="font-semibold text-slateui-text sm:text-right">{student.year_level}</dd>
            </div>
            <div className="grid gap-1 sm:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] sm:gap-4">
              <dt className="font-medium text-slateui-muted">Email Address</dt>
              <dd className="break-all font-semibold text-slateui-text sm:text-right">{profile.email}</dd>
            </div>
          </dl>
        </Card>
        <Card className="border-t-4 border-t-secondary-600">
          <CardHeader title="Quick Actions" />
          <div className="grid gap-3 sm:grid-cols-2">
            <ButtonLink href="/student/enrollment" className="w-full">Online Enrollment</ButtonLink>
            <ButtonLink href="/student/enrollment-status" variant="outline" className="w-full">Enrollment Status</ButtonLink>
            <ButtonLink href="/student/subjects" variant="outline" className="w-full">Subject List</ButtonLink>
            <ButtonLink href="/student/account" variant="secondary" className="w-full">Account</ButtonLink>
            {ENABLE_STUB_PAGES ? <><ButtonLink href="/student/grades" variant="outline" className="w-full">Grades</ButtonLink><ButtonLink href="/student/schedule" variant="outline" className="w-full">Class Schedule</ButtonLink><ButtonLink href="/student/balances" variant="outline" className="w-full">Balances</ButtonLink></> : null}
          </div>
        </Card>
      </div>
    </div>
  );
}
