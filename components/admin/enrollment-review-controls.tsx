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
  enrollmentId
}: {
  decision: "approve" | "reject";
  enrollmentId: string;
}) {
  const { pending } = useFormStatus();
  const isApproval = decision === "approve";

  return (
    <Button
      type="submit"
      variant={isApproval ? "primary" : "danger"}
      className="w-full"
      disabled={pending}
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
        <ReviewSubmitButton decision="approve" enrollmentId={enrollmentId} />
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
        <p className="text-xs text-slateui-muted">Optional free-text information that will be visible with the enrollment result.</p>
        <ReviewSubmitButton decision="reject" enrollmentId={enrollmentId} />
      </form>
    </div>
  );
}
