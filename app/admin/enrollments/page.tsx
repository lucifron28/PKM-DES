import { Badge, enrollmentBadgeTone } from "@/components/ui/badge";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { TextArea } from "@/components/ui/field";
import { approveEnrollmentAction, rejectEnrollmentAction } from "./actions";
import { requireRole } from "@/lib/auth/session";
import { formatDate, formatName } from "@/lib/utils/format";
import type { Enrollment, Profile, Student } from "@/types/database";

type EnrollmentRow = Enrollment & {
  students?: (Student & { profiles?: Profile | null }) | null;
};

export default async function PendingEnrollmentsPage() {
  const { supabase } = await requireRole("admin");
  const { data } = await supabase
    .from("enrollments")
    .select("*, students(*, profiles(*)), programs(*)")
    .eq("status", "PENDING")
    .order("submitted_at", { ascending: true });

  const enrollments = (data as EnrollmentRow[] | null) ?? [];

  return (
    <Card>
      <CardHeader title="Pending Enrollments" description="Approve or reject submitted enrollment requests." />
      {enrollments.length ? (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slateui-border text-left text-sm">
            <thead className="bg-primary-800 text-white">
              <tr>
                {[
                  "Student name",
                  "Student ID",
                  "Program",
                  "Year level",
                  "Student type",
                  "Academic year",
                  "Semester",
                  "Submitted date",
                  "Status",
                  "Actions"
                ].map((column) => (
                  <th key={column} className="whitespace-nowrap px-4 py-3 font-semibold">
                    {column}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slateui-border">
              {enrollments.map((enrollment) => {
                const student = enrollment.students;
                const profile = student?.profiles;

                return (
                  <tr key={enrollment.id} className="bg-white align-top">
                    <td className="whitespace-nowrap px-4 py-3 font-semibold text-slateui-text">
                      {formatName(profile?.first_name, profile?.last_name)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-slateui-secondary">
                      {student?.student_id_number ?? "Not provided"}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-slateui-secondary">
                      {enrollment.programs?.name ?? "Not available"}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-slateui-secondary">{enrollment.year_level}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-slateui-secondary">{student?.student_type ?? ""}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-slateui-secondary">{enrollment.academic_year}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-slateui-secondary">{enrollment.semester}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-slateui-secondary">{formatDate(enrollment.submitted_at)}</td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <Badge tone={enrollmentBadgeTone(enrollment.status)}>{enrollment.status}</Badge>
                    </td>
                    <td className="min-w-[280px] px-4 py-3">
                      <div className="space-y-3">
                        <ButtonLink
                          href={`/admin/enrollments/${enrollment.id}/registration`}
                          variant="outline"
                          className="w-full"
                        >
                          View/Print Form
                        </ButtonLink>
                        <form action={approveEnrollmentAction}>
                          <input type="hidden" name="enrollment_id" value={enrollment.id} />
                          <Button type="submit" className="w-full">Approve</Button>
                        </form>
                        <form action={rejectEnrollmentAction} className="space-y-2">
                          <input type="hidden" name="enrollment_id" value={enrollment.id} />
                          <TextArea label="Remarks" name="remarks" placeholder="Optional remarks" />
                          <Button type="submit" variant="danger" className="w-full">Reject</Button>
                        </form>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState
          title="No pending enrollments found."
          description="Official Student Records do not appear here automatically. A student must claim their account and submit Online Enrollment before a pending enrollment request is created."
        />
      )}
    </Card>
  );
}
