import { ClipboardCheck, FileText, ListChecks, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { StatCard } from "@/components/ui/stat-card";
import { requireRole } from "@/lib/auth/session";
import { countEnrollmentStatuses } from "@/lib/enrollment/query";
import { getActiveEnrollmentTermResult } from "@/lib/enrollment/term-authority";
import { loadActiveOfficialRoleAssignments } from "@/lib/official-roles/repository";
import { getOfficialWorkspace, OFFICIAL_SIGNER_ROLES } from "@/lib/official-roles/roles";
import { loadOfficialClearanceQueue } from "@/lib/official-roles/queue";
import type { EnrollmentReviewStatus } from "@/types/database";
import { ENABLE_STUB_PAGES } from "@/lib/constants/navigation";

async function OfficialStaffDashboard({
  supabase,
  assignments
}: {
  supabase: Awaited<ReturnType<typeof requireRole>>["supabase"];
  assignments: Awaited<ReturnType<typeof loadActiveOfficialRoleAssignments>>["assignments"];
}) {
  const roles = OFFICIAL_SIGNER_ROLES.filter((role) => assignments.some((assignment) => assignment.official_role === role));
  const queueResults = await Promise.all(roles.map(async (role) => [role, await loadOfficialClearanceQueue(supabase, role, assignments)] as const));

  return (
    <div className="space-y-6">
      <Card className="border-t-4 border-t-secondary-600">
        <CardHeader title="Official Staff Dashboard" description="Your active signing assignments and their current clearance queues." />
        <p className="text-sm leading-6 text-slateui-secondary">Use only the workspace assigned to your authenticated capacity. Registrar enrollment-management tools are not part of this staff shell.</p>
      </Card>

      {roles.length === 0 ? (
        <EmptyState title="No active signing assignment" description="This account has no active official workspace. Contact the Registrar if an assignment is expected." />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {queueResults.map(([role, result]) => {
            const workspace = getOfficialWorkspace(role);
            const pendingCount = result.rows.filter((row) => row.clearanceStatus === "PENDING" || row.clearanceStatus === "INVALIDATED").length;
            const signedCount = result.rows.filter((row) => row.clearanceStatus === "SIGNED").length;
            const previewRows = result.rows.filter((row) => row.clearanceStatus === "PENDING" || row.clearanceStatus === "INVALIDATED").slice(0, 3);

            return (
              <Card key={role}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-bold text-slateui-text">{workspace.label}</h2>
                    <p className="mt-1 text-sm leading-6 text-slateui-muted">{workspace.description}</p>
                  </div>
                  <Badge tone="brand">{workspace.signerLabel}</Badge>
                </div>
                {result.error ? (
                  <p className="mt-5 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-900" role="alert">Queue unavailable. Refresh to try again.</p>
                ) : (
                  <>
                    <dl className="mt-5 grid grid-cols-2 gap-3">
                      <div className="rounded-md border border-amber-200 bg-amber-50 p-3"><dt className="text-xs font-bold uppercase tracking-wide text-amber-800">Pending</dt><dd className="mt-1 text-2xl font-bold text-amber-950">{pendingCount}</dd></div>
                      <div className="rounded-md border border-green-200 bg-green-50 p-3"><dt className="text-xs font-bold uppercase tracking-wide text-green-800">Signed</dt><dd className="mt-1 text-2xl font-bold text-green-950">{signedCount}</dd></div>
                    </dl>
                    {previewRows.length ? (
                      <div className="mt-5 space-y-2">
                        {previewRows.map((row) => <div key={row.enrollmentId} className="flex items-center justify-between gap-3 rounded-md border border-slateui-border px-3 py-2 text-sm"><span className="min-w-0 truncate font-semibold text-slateui-text">{row.studentName}</span><span className="shrink-0 text-xs text-slateui-muted">{row.studentIdNumber ?? "No ID"}</span></div>)}
                      </div>
                    ) : <p className="mt-5 text-sm text-slateui-secondary">No pending records in the active enrollment term.</p>}
                  </>
                )}
                <ButtonLink href={`/admin/clearances/${workspace.slug}`} variant="primary" className="mt-5 w-full">Open {workspace.label}</ButtonLink>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default async function AdminDashboardPage() {
  const { supabase, profile } = await requireRole("admin");
  const { assignments, error: assignmentsError } = await loadActiveOfficialRoleAssignments(supabase, profile.id);
  if (assignmentsError) {
    return <EmptyState title="Staff access could not be verified" description="The authenticated account assignments could not be loaded safely. Refresh and try again." />;
  }
  if (assignments.length > 0) return <OfficialStaffDashboard supabase={supabase} assignments={assignments} />;

  const activeTermResult = await getActiveEnrollmentTermResult(supabase);

  const activeTerm = activeTermResult.ok ? activeTermResult.term : null;

  let statusCounts = null;

  if (activeTerm) {
    const { data: enrollmentStatuses, error: enrollmentStatusesError } = await supabase
      .from("enrollments")
      .select("status")
      .eq("academic_year", activeTerm.academicYear)
      .eq("semester", activeTerm.semester)
      .returns<Array<{ status: EnrollmentReviewStatus }>>();

    if (enrollmentStatusesError) {
      console.error("enrollment_reporting:dashboard_counts", enrollmentStatusesError);
    } else {
      statusCounts = countEnrollmentStatuses(enrollmentStatuses ?? []);
    }
  }

  const countedTermLabel = activeTerm ? activeTerm.label : "No active term configured";

  return (
    <div className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-4">
        <StatCard
          label="Pending Enrollments"
          value={statusCounts?.PENDING ?? "Unavailable"}
          helper={activeTerm ? `Pending for ${countedTermLabel}` : "No active term configured."}
          icon={<ListChecks className="h-5 w-5" />}
          tone="warning"
        />
        <StatCard
          label="Approved Enrollments"
          value={statusCounts?.APPROVED ?? "Unavailable"}
          helper={activeTerm ? `Approved for ${countedTermLabel}` : "No active term configured."}
          icon={<ClipboardCheck className="h-5 w-5" />}
          tone="success"
        />
        <StatCard
          label="Rejected Enrollments"
          value={statusCounts?.REJECTED ?? "Unavailable"}
          helper={activeTerm ? `Rejected for ${countedTermLabel}` : "No active term configured."}
          icon={<XCircle className="h-5 w-5" />}
          tone="danger"
        />
        <StatCard
          label="Enrollment Records"
          value={statusCounts?.total ?? "Unavailable"}
          helper={activeTerm ? `Active Term: ${countedTermLabel}` : "No active term configured."}
          icon={<FileText className="h-5 w-5" />}
          tone="info"
        />
      </div>
      <Card className="border-t-4 border-t-primary-800">
        <CardHeader title="Registrar Workflow" description="Start with pending requests, then continue with source records and reporting." />
        <div className="mb-5 border-l-4 border-sky-500 bg-sky-50 px-4 py-3 text-sm text-sky-900">
          <p className="font-semibold">Demo path</p>
          <p className="mt-1">
            Review pending requests first. Search and edit official records when identity matching is required.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <ButtonLink href="/admin/enrollments" variant="primary" className="w-full">
            Review Pending Requests
          </ButtonLink>
          <ButtonLink href="/admin/students" variant="secondary" className="w-full">
            Official Student Records
          </ButtonLink>
          <ButtonLink href="/admin/masterlist" variant="outline" className="w-full">
            Enrollment Masterlist
          </ButtonLink>
          <ButtonLink href="/admin/reports" variant="outline" className="w-full">
            Enrollment Reports
          </ButtonLink>
          {ENABLE_STUB_PAGES ? (
            <>
              <ButtonLink href="/admin/encode" variant="outline" className="w-full">
                Encode Grades / Schedule
              </ButtonLink>
            </>
          ) : null}
        </div>
      </Card>
    </div>
  );
}
