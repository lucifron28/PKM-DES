"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { updateEnrollmentRequirementAction, type RequirementUpdateState } from "@/app/admin/enrollments/actions";
import { Button } from "@/components/ui/button";
import { TextArea } from "@/components/ui/field";
import type { RequirementApplicability, RequirementStatus } from "@/lib/requirements/types";

const initialState: RequirementUpdateState = {};

function StatusButton({ status, currentStatus }: { status: RequirementStatus; currentStatus: RequirementStatus }) {
  const { pending } = useFormStatus();
  const labels: Record<RequirementStatus, string> = {
    VERIFIED: "Verify",
    REJECTED: "Reject",
    PENDING: "Mark Pending"
  };
  const variant = status === "VERIFIED" ? "primary" : status === "REJECTED" ? "danger" : "outline";

  return (
    <Button type="submit" name="status" value={status} variant={variant} disabled={pending || currentStatus === status}>
      {pending ? "Saving..." : labels[status]}
    </Button>
  );
}

export function RequirementStatusCard({
  enrollmentId,
  currentStatus = "PENDING",
  applicability = "APPLICABLE",
  currentNote = null,
  unavailable = false
}: {
  enrollmentId: string;
  currentStatus?: RequirementStatus;
  applicability?: RequirementApplicability;
  currentNote?: string | null;
  unavailable?: boolean;
}) {
  const [state, formAction] = useActionState(updateEnrollmentRequirementAction, initialState);

  const statusColor =
    currentStatus === "VERIFIED"
      ? "bg-green-100 text-green-800 border-green-200"
      : currentStatus === "REJECTED"
      ? "bg-red-100 text-red-800 border-red-200"
      : "bg-amber-100 text-amber-800 border-amber-200";

  return (
    <div className="rounded-lg border border-slateui-border bg-slateui-surface p-4 shadow-sm space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h4 className="font-semibold text-slateui-text">Health Record Update</h4>
          <p className="text-xs text-slateui-muted">Status-only paper-form verification. Do not enter medical details.</p>
        </div>
        <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${statusColor}`}>
          {applicability === "APPLICABLE" ? currentStatus : "NOT REQUIRED"}
        </span>
      </div>

      {unavailable ? <p className="border-l-4 border-amber-500 bg-amber-50 px-3 py-2 text-sm text-amber-950">Requirement information could not be loaded. Refresh before reviewing this request.</p> : null}
      {applicability === "NOT_APPLICABLE" ? <p className="text-sm leading-6 text-slateui-secondary">No Health Record Update verification is required for this student and term.</p> : null}
      {applicability === "APPLICABLE" && !unavailable ? (
        <form action={formAction} className="space-y-3 border-t border-slateui-border pt-3">
          <input type="hidden" name="enrollment_id" value={enrollmentId} />
          <input type="hidden" name="requirement_code" value="HEALTH_RECORD_UPDATE" />
          {state.message ? (
            <p
              role={state.success ? "status" : "alert"}
              aria-live={state.success ? "polite" : undefined}
              className={state.success ? "text-sm font-medium text-green-700" : "text-sm font-medium text-red-700"}
            >
              {state.message}
            </p>
          ) : null}
          <TextArea
            label="Administrative note"
            name="note"
            defaultValue={currentNote ?? ""}
            placeholder="Optional short status-only note. Do not enter medical details."
            maxLength={240}
          />
          <div className="flex flex-wrap gap-2">
            <StatusButton status="VERIFIED" currentStatus={currentStatus} />
            <StatusButton status="REJECTED" currentStatus={currentStatus} />
            <StatusButton status="PENDING" currentStatus={currentStatus} />
          </div>
        </form>
      ) : null}
    </div>
  );
}
