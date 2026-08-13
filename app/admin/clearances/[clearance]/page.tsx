import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { requireOfficialSignerRole } from "@/lib/auth/session";
import { getOfficialWorkspaceBySlug } from "@/lib/official-roles/roles";
import {
  filterOfficialClearanceQueue,
  loadOfficialClearanceQueue,
  type ClearanceQueueFilter,
  type OfficialClearanceQueueRow
} from "@/lib/official-roles/queue";
import { healthVerificationStateLabel } from "@/lib/health-records/presentation";

function statusLabel(status: OfficialClearanceQueueRow["clearanceStatus"]) {
  if (status === "SIGNED") return "Signed";
  if (status === "INVALIDATED") return "Invalidated";
  if (status === "NOT_APPLICABLE") return "Not Applicable";
  if (status === "REJECTED") return "Rejected";
  return "Pending Signature";
}

function statusTone(status: OfficialClearanceQueueRow["clearanceStatus"]) {
  if (status === "SIGNED") return "success" as const;
  if (status === "INVALIDATED") return "error" as const;
  if (status === "NOT_APPLICABLE") return "neutral" as const;
  if (status === "REJECTED") return "error" as const;
  return "warning" as const;
}

function rowTone(row: OfficialClearanceQueueRow) {
  if (row.healthVerificationState === "VERIFIED") return "success" as const;
  if (row.healthVerificationState === "REJECTED") return "error" as const;
  if (row.healthVerificationState === "LEGACY_VERIFICATION") return "warning" as const;
  return statusTone(row.clearanceStatus);
}

function parseFilter(value: string | undefined): ClearanceQueueFilter {
  return value === "signed" || value === "verified" || value === "rejected" || value === "all" ? value : "pending";
}

export default async function OfficialClearanceQueuePage({
  params,
  searchParams
}: {
  params: Promise<{ clearance: string }>;
  searchParams?: Promise<{ status?: string; q?: string }>;
}) {
  const { clearance } = await params;
  const workspace = getOfficialWorkspaceBySlug(clearance);
  if (!workspace) notFound();

  const { supabase, assignments } = await requireOfficialSignerRole(workspace.role);
  const query = (await searchParams) ?? {};
  const status = parseFilter(query.status);
  const search = (query.q ?? "").trim();
  const result = await loadOfficialClearanceQueue(supabase, workspace.role, assignments);

  if (result.error) {
    console.error("official_clearance_queue:load", result.error);
    return <EmptyState title={`${workspace.label} is unavailable`} description="The clearance queue could not be loaded safely. Please refresh and try again." />;
  }

  const allRows: OfficialClearanceQueueRow[] = result.rows as OfficialClearanceQueueRow[];
  const rows = filterOfficialClearanceQueue(allRows, status, search);
  const pendingCount = allRows.filter((row) => row.clearanceStatus === "PENDING" || row.clearanceStatus === "INVALIDATED").length;
  const signedCount = allRows.filter((row) => row.clearanceStatus === "SIGNED" || row.healthVerificationState === "VERIFIED").length;
  const rejectedCount = allRows.filter((row) => row.clearanceStatus === "REJECTED" || row.healthVerificationState === "REJECTED").length;
  const emptyStateLabel = status === "verified" || status === "signed" ? "verified" : status === "rejected" ? "rejected" : "pending";

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader title={workspace.label} description={workspace.description} />
        <p className="text-sm leading-6 text-slateui-secondary">
          This workspace is limited to the active <strong>{workspace.signerLabel}</strong> assignment on your authenticated admin account. Review the enrollment before drawing a separate, immutable signature.
        </p>
      </Card>

      <div className={`grid gap-4 ${workspace.role === "NURSE" ? "sm:grid-cols-4" : "sm:grid-cols-3"}`}>
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
          <p className="text-xs font-bold uppercase tracking-wide text-amber-800">Pending</p>
          <p className="mt-2 text-3xl font-bold text-amber-950">{pendingCount}</p>
          <p className="mt-1 text-sm text-amber-900">{workspace.pendingDescription}</p>
        </div>
        <div className="rounded-lg border border-green-200 bg-green-50 p-4">
          <p className="text-xs font-bold uppercase tracking-wide text-green-800">{workspace.role === "NURSE" ? "Verified" : "Signed"}</p>
          <p className="mt-2 text-3xl font-bold text-green-950">{signedCount}</p>
          <p className="mt-1 text-sm text-green-900">Current signatures for this clearance.</p>
        </div>
        {workspace.role === "NURSE" ? <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-xs font-bold uppercase tracking-wide text-red-800">Rejected</p>
          <p className="mt-2 text-3xl font-bold text-red-950">{rejectedCount}</p>
          <p className="mt-1 text-sm text-red-900">Records needing Nurse follow-up.</p>
        </div> : null}
        <div className="rounded-lg border border-slateui-border bg-slateui-surfaceAlt p-4">
          <p className="text-xs font-bold uppercase tracking-wide text-slateui-muted">All records</p>
          <p className="mt-2 text-3xl font-bold text-slateui-text">{allRows.length}</p>
          <p className="mt-1 text-sm text-slateui-secondary">Current active enrollment term.</p>
        </div>
      </div>

      <Card>
        <CardHeader title="Clearance queue" description={workspace.role === "NURSE" ? "Use Pending, Verified, Rejected, or All to focus the applicable Incoming 1st Year female records." : "Use Pending, Signed, or All to focus the list. Search by student, ID, program, or term."} />
        <form method="get" className="grid gap-3 border-b border-slateui-border px-6 pb-5 sm:grid-cols-[minmax(0,1fr)_180px_auto] sm:items-end">
          <label className="block text-sm font-semibold text-slateui-text">
            Search
            <input name="q" defaultValue={search} placeholder="Student name or ID" className="mt-1 block min-h-11 w-full rounded-md border border-slateui-border bg-white px-3 py-2 text-sm font-normal text-slateui-text outline-none focus:border-primary-700 focus:ring-2 focus:ring-primary-200" />
          </label>
          <label className="block text-sm font-semibold text-slateui-text">
            Status
            <select name="status" defaultValue={status} className="mt-1 block min-h-11 w-full rounded-md border border-slateui-border bg-white px-3 py-2 text-sm font-normal text-slateui-text outline-none focus:border-primary-700 focus:ring-2 focus:ring-primary-200">
              <option value="pending">Pending</option>
              <option value="verified">{workspace.role === "NURSE" ? "Verified" : "Signed"}</option>
              {workspace.role === "NURSE" ? <option value="rejected">Rejected</option> : null}
              {workspace.role !== "NURSE" ? <option value="signed">Signed</option> : null}
              <option value="all">All</option>
            </select>
          </label>
          <button type="submit" className="min-h-11 rounded-md bg-primary-800 px-4 py-2 text-sm font-bold text-white hover:bg-primary-900 focus:outline-none focus:ring-2 focus:ring-primary-700 focus:ring-offset-2">Apply filters</button>
        </form>

        {rows.length === 0 ? (
          <div className="p-6">
            <EmptyState
              title={emptyStateLabel === "verified" ? `No verified ${workspace.label.toLowerCase()} records` : emptyStateLabel === "rejected" ? `No rejected ${workspace.label.toLowerCase()} records` : `No ${workspace.label.toLowerCase()} signatures pending`}
              description={emptyStateLabel === "verified" ? "No current verified records match the selected search." : emptyStateLabel === "rejected" ? "No rejected records match the selected search." : `There are currently no students awaiting ${workspace.signerLabel} signature in the selected view.`}
            />
          </div>
        ) : (
          <div className="grid gap-4 p-6 lg:grid-cols-2">
            {rows.map((row) => (
              <article key={row.enrollmentId} className="rounded-lg border border-slateui-border bg-white p-4 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="font-bold text-slateui-text">{row.studentName}</h2>
                    <p className="mt-1 text-sm text-slateui-muted">{row.studentIdNumber ?? "Student ID unavailable"}</p>
                  </div>
                  <Badge tone={rowTone(row)}>{row.healthVerificationState ? healthVerificationStateLabel(row.healthVerificationState) : statusLabel(row.clearanceStatus)}</Badge>
                </div>
                <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
                  <div><dt className="text-slateui-muted">Program</dt><dd className="font-semibold text-slateui-text">{row.programName}</dd></div>
                  <div><dt className="text-slateui-muted">Year level</dt><dd className="font-semibold text-slateui-text">{row.yearLevel}</dd></div>
                  <div><dt className="text-slateui-muted">Academic year</dt><dd className="font-semibold text-slateui-text">{row.academicYear}</dd></div>
                  <div><dt className="text-slateui-muted">Semester</dt><dd className="font-semibold text-slateui-text">{row.semester}</dd></div>
                </dl>
                {row.signerName && row.signedAt ? <p className="mt-3 text-xs text-slateui-muted">Latest signer: {row.signerName} · {new Intl.DateTimeFormat("en-PH", { dateStyle: "medium", timeStyle: "short" }).format(new Date(row.signedAt))}</p> : null}
                <ButtonLink href={`/admin/clearances/${workspace.slug}/${row.enrollmentId}`} variant={row.actionable ? "primary" : "outline"} className="mt-4 w-full">
                  {row.actionable ? "Review & E-Sign" : "Review clearance"}
                </ButtonLink>
              </article>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
