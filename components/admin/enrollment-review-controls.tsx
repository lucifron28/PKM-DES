"use client";

import type { FormEvent } from "react";
import { useFormStatus } from "react-dom";
import { approveEnrollmentAction, rejectEnrollmentAction } from "@/app/admin/enrollments/actions";
import { Button } from "@/components/ui/button";
import { TextArea } from "@/components/ui/field";
import { RequirementStatusCard } from "@/components/requirements/requirement-status-card";
import type { RequirementApplicability, RequirementStatus } from "@/lib/requirements/types";

function ReviewSubmitButton({
  decision,
  enrollmentId,
  disabled = false
}: {
  decision: "approve" | "reject";
  enrollmentId: string;
  disabled?: boolean;
}) {
  const { pending } = useFormStatus();
  const isApproval = decision === "approve";

  return (
    <Button
      type="submit"
      variant={isApproval ? "primary" : "danger"}
      className="w-full"
      disabled={pending || disabled}
      aria-label={`${isApproval ? "Approve" : "Reject"} pending enrollment request ${enrollmentId}`}
    >
      {pending ? (isApproval ? "Approving..." : "Rejecting...") : isApproval ? "Approve" : "Reject"}
    </Button>
  );
}

function confirmReview(event: FormEvent<HTMLFormElement>, message: string) {
  if (!window.confirm(message)) {
    event.preventDefault();
  }
}

export function EnrollmentReviewControls({
  enrollmentId,
  healthRequirement
}: {
  enrollmentId: string;
  healthRequirement: {
    applicability: RequirementApplicability;
    status: RequirementStatus;
    note: string | null;
    unavailable: boolean;
  };
}) {
  const isApprovalBlocked =
    healthRequirement.unavailable ||
    (healthRequirement.applicability === "APPLICABLE" && healthRequirement.status !== "VERIFIED");

  const approvalBlockReason = healthRequirement.unavailable
    ? "Requirement status data is currently unavailable."
    : healthRequirement.applicability === "APPLICABLE" && healthRequirement.status === "PENDING"
      ? "Health Record Update verification is PENDING."
      : healthRequirement.applicability === "APPLICABLE" && healthRequirement.status === "REJECTED"
        ? "Health Record Update status is REJECTED."
        : null;

  return (
    <div className="space-y-3">
      <RequirementStatusCard
        enrollmentId={enrollmentId}
        applicability={healthRequirement.applicability}
        currentStatus={healthRequirement.status}
        currentNote={healthRequirement.note}
        unavailable={healthRequirement.unavailable}
      />
      <form
        action={approveEnrollmentAction}
        onSubmit={(event) => confirmReview(event, "Approve this pending enrollment request?")}
      >
        <input type="hidden" name="enrollment_id" value={enrollmentId} />
        {isApprovalBlocked && approvalBlockReason ? (
          <p className="mb-2 rounded border border-amber-200 bg-amber-50 p-2 text-xs font-semibold text-amber-900">
            Approval disabled: {approvalBlockReason}
          </p>
        ) : null}
        <ReviewSubmitButton decision="approve" enrollmentId={enrollmentId} disabled={isApprovalBlocked} />
      </form>
      <form
        action={rejectEnrollmentAction}
        className="space-y-2"
        onSubmit={(event) => confirmReview(event, "Reject this pending enrollment request?")}
      >
        <input type="hidden" name="enrollment_id" value={enrollmentId} />
        <TextArea
          label="Rejection remarks"
          name="remarks"
          placeholder="Optional free-text information visible with the enrollment result."
          maxLength={2000}
        />
        <p className="text-xs text-slateui-muted">
          Rejection is terminal for the active term and closes automatic resubmission for this academic year and semester. Remarks will be visible to the student.
        </p>
        <ReviewSubmitButton decision="reject" enrollmentId={enrollmentId} />
      </form>
    </div>
  );
}
