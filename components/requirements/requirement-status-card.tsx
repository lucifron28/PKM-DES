"use client";

import { Badge } from "@/components/ui/badge";
import type { RequirementApplicability, RequirementStatus } from "@/lib/requirements/types";
import { formatDate } from "@/lib/utils/format";

export function RequirementStatusCard({
  currentStatus = "PENDING",
  applicability = "APPLICABLE",
  currentNote = null,
  unavailable = false,
  nurseSignatureStatus = "MISSING",
  nurseSignerName = null,
  nurseSignedAt = null
}: {
  enrollmentId: string;
  currentStatus?: RequirementStatus;
  applicability?: RequirementApplicability;
  currentNote?: string | null;
  unavailable?: boolean;
  nurseSignatureStatus?: "SIGNED" | "MISSING" | "INVALIDATED" | "NOT_REQUIRED" | "UNAVAILABLE";
  nurseSignerName?: string | null;
  nurseSignedAt?: string | null;
}) {
  const isLegacyVerification = currentStatus === "VERIFIED" && nurseSignatureStatus !== "SIGNED";
  const statusTone = applicability === "NOT_APPLICABLE"
    ? "neutral" as const
    : currentStatus === "REJECTED"
      ? "error" as const
      : currentStatus === "VERIFIED" && !isLegacyVerification
        ? "success" as const
        : "warning" as const;
  const statusLabel = applicability === "NOT_APPLICABLE"
    ? "NOT REQUIRED"
    : isLegacyVerification
      ? "LEGACY VERIFICATION"
      : currentStatus;

  return (
    <div className="rounded-lg border border-slateui-border bg-slateui-surface p-4 shadow-sm space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h4 className="font-semibold text-slateui-text">Health Record Update</h4>
          <p className="text-xs text-slateui-muted">Registrar view is read-only. The assigned Nurse controls verification and rejection.</p>
        </div>
        <Badge tone={statusTone}>{statusLabel}</Badge>
      </div>

      {unavailable ? <p className="border-l-4 border-amber-500 bg-amber-50 px-3 py-2 text-sm text-amber-950">Requirement information could not be loaded. Refresh before reviewing this request.</p> : null}
      {applicability === "NOT_APPLICABLE" ? <p className="text-sm leading-6 text-slateui-secondary">Nurse verification is not required for this enrollment.</p> : null}
      {applicability === "APPLICABLE" && !unavailable ? (
        <div className="rounded-md border border-slateui-border bg-white p-3 text-sm text-slateui-secondary">
          <p className="font-semibold text-slateui-text">Nurse Health Clearance</p>
          <p className="mt-1">
            Evidence: <span className="font-semibold text-slateui-text">
              {nurseSignatureStatus === "SIGNED" ? "CURRENT SIGNATURE" : nurseSignatureStatus === "NOT_REQUIRED" ? "NOT REQUIRED" : nurseSignatureStatus === "UNAVAILABLE" ? "UNAVAILABLE" : nurseSignatureStatus === "INVALIDATED" ? "INVALIDATED" : "SIGNATURE MISSING"}
            </span>
          </p>
          {nurseSignerName && nurseSignatureStatus === "SIGNED" ? <p>Signed by: <span className="font-semibold text-slateui-text">{nurseSignerName}</span>{nurseSignedAt ? ` on ${formatDate(nurseSignedAt)}` : ""}.</p> : null}
          {isLegacyVerification ? <p className="mt-2 font-semibold text-amber-900">The requirement is VERIFIED but has no current Nurse signature. Approval remains blocked until the Nurse records a current signature.</p> : null}
          {currentNote ? <p className="mt-2"><span className="font-semibold text-slateui-text">Administrative note:</span> {currentNote}</p> : null}
        </div>
      ) : null}
    </div>
  );
}
