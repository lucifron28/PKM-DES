import { Badge, enrollmentBadgeTone } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { EnrollmentReviewControls } from "@/components/admin/enrollment-review-controls";
import { requireRole } from "@/lib/auth/session";
import { formatDate, formatName } from "@/lib/utils/format";
import type { Enrollment, Profile, Student } from "@/types/database";

type EnrollmentRow = Enrollment & {
  students?: (Student & { profiles?: Profile | null }) | null;
};

export default async function PendingEnrollmentsPage({
  searchParams
}: {
  searchParams?: Promise<{ error?: string; success?: string }>;
}) {
  const { supabase } = await requireRole("admin");
  const params = (await searchParams) ?? {};
  const { data, error: enrollmentsError } = await supabase
    .from("enrollments")
    .select("*, students(*, profiles(*)), programs(*)")
    .eq("status", "PENDING")
    .order("submitted_at", { ascending: true });

  const enrollments = (data as EnrollmentRow[] | null) ?? [];

  if (enrollmentsError) {
    console.error("pending_enrollments:load");
    return (
      <Card>
        <CardHeader title="Pending Enrollments" description="Submitted Online Enrollment requests awaiting Registrar review." />
        <EmptyState
          title="Pending enrollments could not be loaded"
          description="Please try again. No enrollment decisions can be made until the current requests are available."
        />
      </Card>
    );
  }

  const errorMessages: Record<string, string> = {
    not_found: "Enrollment request is not available. Refresh the pending list.",
    already_reviewed: "This enrollment request has already been reviewed. Refresh the pending list.",
    invalid_request: "Enrollment request could not be reviewed. Please try again.",
    review_failed: "Enrollment request could not be reviewed. Please try again."
  };

  const successMessages: Record<string, string> = {
    approved: "Enrollment request approved successfully.",
    rejected: "Enrollment request rejected successfully."
  };

  return (
    <Card>
      <CardHeader
        title="Pending Enrollments"
        description="This queue contains submitted Online Enrollment requests awaiting Registrar review. The research MVP does not yet include the official document and requirements checklist."
      />
      {params.success ? (
        <div className="mb-4 rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-700">
          {successMessages[params.success] ?? "Action completed successfully."}
        </div>
      ) : null}
      {params.error ? (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          {errorMessages[params.error] ?? "An error occurred."}
        </div>
      ) : null}
      {enrollments.length ? (
        <div>
          <p className="mb-2 text-xs text-slateui-muted sm:hidden">Swipe horizontally to view all enrollment details and actions.</p>
          <div className="overflow-hidden rounded-lg border border-slateui-border bg-white">
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
                  <th key={column} scope="col" className="whitespace-nowrap px-4 py-3 font-semibold">
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
                    <td className="min-w-[280px] whitespace-normal px-4 py-3">
                      <div className="space-y-3">
                        <ButtonLink
                          href={`/admin/enrollments/${enrollment.id}/registration`}
                          variant="outline"
                          className="w-full"
                        >
                          View/Print Form
                        </ButtonLink>
                        <EnrollmentReviewControls enrollmentId={enrollment.id} />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
              </table>
            </div>
          </div>
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
