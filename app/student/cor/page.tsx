import { redirect } from "next/navigation";
import { Badge, enrollmentBadgeTone } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { getStudentQueryResult, requireRole } from "@/lib/auth/session";
import { getActiveEnrollmentTermResult } from "@/lib/enrollment/term-authority";
import { formatDate } from "@/lib/utils/format";
import type { EnrollmentReviewStatus } from "@/types/database";

type ApprovedEnrollmentRow = {
  id: string;
  academic_year: string;
  semester: string;
  status: EnrollmentReviewStatus;
  submitted_at: string;
};

export default async function StudentCorPage() {
  const { supabase, profile } = await requireRole("student");
  const studentResult = await getStudentQueryResult(profile.id);

  if (studentResult.status === "query_failed") {
    return (
      <EmptyState
        title="Student record could not be loaded."
        description="A database query error occurred. Please refresh or try again later."
      />
    );
  }

  if (studentResult.status === "not_found") {
    return <EmptyState title="Student record not found." description="Please contact an administrator." />;
  }

  const student = studentResult.student;

  const [activeTermResult, approvedResponse] = await Promise.all([
    getActiveEnrollmentTermResult(supabase),
    supabase
      .from("enrollments")
      .select("id, academic_year, semester, status, submitted_at")
      .eq("student_id", student.id)
      .eq("status", "APPROVED")
      .order("submitted_at", { ascending: false })
  ]);

  if (approvedResponse.error) {
    console.error("student_cor:approved_load", approvedResponse.error);
    return (
      <EmptyState
        title="Registration form selection could not be loaded."
        description="Please try again."
      />
    );
  }

  const approvedEnrollments = (approvedResponse.data as ApprovedEnrollmentRow[] | null) ?? [];
  const activeTerm = activeTermResult.ok ? activeTermResult.term : null;

  if (approvedEnrollments.length === 1) {
    redirect(`/student/enrollments/${approvedEnrollments[0].id}/registration`);
  }

  if (activeTerm && approvedEnrollments.length > 1) {
    const currentTermApproved = approvedEnrollments.find(
      (e) => e.academic_year === activeTerm.academicYear && e.semester === activeTerm.semester
    );
    if (currentTermApproved) {
      redirect(`/student/enrollments/${currentTermApproved.id}/registration`);
    }
  }

  if (approvedEnrollments.length === 0) {
    return (
      <EmptyState
        title="No approved registration form available"
        description="A draft registration form can only be printed after an enrollment request is approved by the Registrar."
        action={<ButtonLink href="/student/enrollment-status">View Enrollment Status</ButtonLink>}
      />
    );
  }

  return (
    <Card className="border-t-4 border-t-secondary-600">
      <CardHeader
        title="Available Approved Registration Forms"
        description="Select an approved enrollment record below to view and print its draft registration form."
      />
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slateui-border bg-slateui-surfaceAlt text-xs font-semibold uppercase tracking-wider text-slateui-muted">
            <tr>
              <th className="px-4 py-3">Academic Term</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Submitted Date</th>
              <th className="px-4 py-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slateui-border">
            {approvedEnrollments.map((record) => (
              <tr key={record.id}>
                <td className="px-4 py-3 font-semibold text-slateui-text">
                  {record.academic_year} – {record.semester}
                </td>
                <td className="px-4 py-3">
                  <Badge tone={enrollmentBadgeTone(record.status)}>{record.status}</Badge>
                </td>
                <td className="px-4 py-3 text-slateui-secondary">
                  {formatDate(record.submitted_at)}
                </td>
                <td className="px-4 py-3 text-right">
                  <ButtonLink
                    href={`/student/enrollments/${record.id}/registration`}
                    variant="outline"
                    className="text-xs"
                  >
                    View / Print Form
                  </ButtonLink>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
