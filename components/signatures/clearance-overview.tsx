import { formatDate } from "@/lib/utils/format";
import { Badge } from "@/components/ui/badge";
import { getEnrollmentClearanceOverallStatus, type ClearanceOverviewItem } from "@/lib/signatures/clearances";

const statusLabel = {
  PENDING: "Pending Signature",
  SIGNED: "Signed",
  NOT_APPLICABLE: "Not Applicable",
  INVALIDATED: "Invalidated — Re-sign required"
} as const;

export function ClearanceOverview({ items, title = "Enrollment Clearance" }: { items: ClearanceOverviewItem[]; title?: string }) {
  const overallStatus = getEnrollmentClearanceOverallStatus(items);

  return (
    <section className="rounded-lg border border-slateui-border bg-white p-4 shadow-sm" aria-labelledby="clearance-overview-heading">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="clearance-overview-heading" className="font-bold text-slateui-text">{title}</h2>
          <p className="mt-1 text-sm text-slateui-muted">Each applicable official must provide a separate authenticated e-signature.</p>
        </div>
        <Badge tone={overallStatus === "COMPLETE" ? "success" : overallStatus === "BLOCKED" ? "error" : "warning"}>
          {overallStatus === "COMPLETE" ? "COMPLETE" : overallStatus === "BLOCKED" ? "ACTION REQUIRED" : "INCOMPLETE"}
        </Badge>
      </div>
      <ul className="mt-4 divide-y divide-slateui-border" aria-label="Enrollment clearance statuses">
        {items.map((item) => (
          <li key={item.clearanceType} className="flex flex-col gap-2 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="font-semibold text-slateui-text">{item.label}</p>
              <p className="text-sm text-slateui-secondary">{item.evidence.signerName ? `${item.evidence.signerName} — ${item.signerLabel}` : item.status === "NOT_APPLICABLE" ? "No signature is required for this enrollment." : "No accepted signature has been recorded."}</p>
              {item.evidence.signedAt && item.status === "SIGNED" ? <p className="text-xs text-slateui-muted">{formatDate(item.evidence.signedAt)}</p> : null}
            </div>
            <span className={`inline-flex w-fit rounded-full border px-2.5 py-1 text-xs font-bold ${item.status === "SIGNED" ? "border-green-200 bg-green-50 text-green-800" : item.status === "NOT_APPLICABLE" ? "border-slateui-border bg-slateui-surfaceAlt text-slateui-secondary" : item.status === "INVALIDATED" ? "border-red-200 bg-red-50 text-red-800" : "border-amber-200 bg-amber-50 text-amber-900"}`}>
              {statusLabel[item.status]}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
