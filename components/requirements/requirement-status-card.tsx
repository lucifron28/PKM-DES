"use client";

import { useTransition } from "react";
import { RequirementStatus, updateRequirementStatusAction } from "@/lib/requirements";
import { Button } from "@/components/ui/button";

export function RequirementStatusCard({
  studentId,
  requirementCode = "HEALTH_RECORD_UPDATE",
  title = "Health Record Update",
  currentStatus = "PENDING",
  isAdmin = false
}: {
  studentId: string;
  requirementCode?: "HEALTH_RECORD_UPDATE";
  title?: string;
  currentStatus?: RequirementStatus;
  isAdmin?: boolean;
}) {
  const [isPending, startTransition] = useTransition();

  const handleStatusChange = (newStatus: RequirementStatus) => {
    startTransition(async () => {
      await updateRequirementStatusAction(studentId, requirementCode, newStatus);
      window.location.reload();
    });
  };

  const statusColor =
    currentStatus === "VERIFIED"
      ? "bg-green-100 text-green-800 border-green-200"
      : currentStatus === "REJECTED"
      ? "bg-red-100 text-red-800 border-red-200"
      : "bg-amber-100 text-amber-800 border-amber-200";

  return (
    <div className="rounded-lg border border-slateui-border bg-slateui-surface p-4 shadow-sm space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="font-semibold text-slateui-text">{title}</h4>
          <p className="text-xs text-slateui-muted">Status-only record verification</p>
        </div>
        <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${statusColor}`}>
          {currentStatus}
        </span>
      </div>

      {isAdmin && (
        <div className="flex items-center gap-2 pt-2 border-t border-slateui-border">
          <span className="text-xs text-slateui-muted font-medium">Update Status:</span>
          <Button
            type="button"
            variant="outline"
            disabled={isPending || currentStatus === "VERIFIED"}
            onClick={() => handleStatusChange("VERIFIED")}
            className="text-xs px-2 py-1 h-7 text-green-700 hover:bg-green-50"
          >
            Verify
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={isPending || currentStatus === "REJECTED"}
            onClick={() => handleStatusChange("REJECTED")}
            className="text-xs px-2 py-1 h-7 text-red-700 hover:bg-red-50"
          >
            Reject
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={isPending || currentStatus === "PENDING"}
            onClick={() => handleStatusChange("PENDING")}
            className="text-xs px-2 py-1 h-7 text-amber-700 hover:bg-amber-50"
          >
            Reset
          </Button>
        </div>
      )}
    </div>
  );
}
