"use client";

import { useCallback, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { approveEnrollmentAction, rejectEnrollmentAction } from "@/app/admin/enrollments/actions";
import { RequirementStatusCard } from "@/components/requirements/requirement-status-card";
import { Button, buttonClassName } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { TextArea } from "@/components/ui/field";
import type { RequirementApplicability, RequirementStatus } from "@/lib/requirements/types";
import { formatDate } from "@/lib/utils/format";

type ReviewSubject = {
  id: string;
  course_code: string;
  course_description: string;
  units: number;
};

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
      disabled={pending || disabled}
      aria-label={`${isApproval ? "Approve" : "Reject"} pending enrollment request ${enrollmentId}`}
    >
      {pending ? (isApproval ? "Approving..." : "Rejecting...") : isApproval ? "Confirm Approval" : "Confirm Rejection"}
    </Button>
  );
}

function SummaryField({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-slateui-border bg-slateui-surfaceAlt px-3 py-2">
      <dt className="text-[11px] font-bold uppercase tracking-wide text-slateui-muted">{label}</dt>
      <dd className="mt-1 break-words text-sm font-semibold text-slateui-text">{value}</dd>
    </div>
  );
}

export function EnrollmentReviewControls({
  enrollmentId,
  studentName,
  studentId,
  email,
  program,
  yearLevel,
  studentType,
  academicYear,
  semester,
  submittedAt,
  subjects,
  healthRequirement
}: {
  enrollmentId: string;
  studentName: string;
  studentId: string;
  email: string;
  program: string;
  yearLevel: string;
  studentType: string;
  academicYear: string;
  semester: string;
  submittedAt: string;
  subjects: ReviewSubject[];
  healthRequirement: {
    applicability: RequirementApplicability;
    status: RequirementStatus;
    note: string | null;
    unavailable: boolean;
  };
}) {
  const [open, setOpen] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const reviewButtonRef = useRef<HTMLButtonElement>(null);
  const closeReview = useCallback(() => {
    setOpen(false);
    setRejecting(false);
  }, []);

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
    <>
      <button
        ref={reviewButtonRef}
        type="button"
        className={buttonClassName("outline", "w-full")}
        aria-haspopup="dialog"
        onClick={() => {
          setRejecting(false);
          setOpen(true);
        }}
      >
        Review request
      </button>

      <Modal
        open={open}
        onClose={closeReview}
        returnFocusRef={reviewButtonRef}
        title="Review enrollment request"
        description="Confirm the student details and requirements before making a Registrar decision."
      >
        <div className="space-y-6">
          <section aria-labelledby={`${enrollmentId}-student-summary`}>
            <div className="flex items-center justify-between gap-3">
              <h3 id={`${enrollmentId}-student-summary`} className="text-base font-bold text-primary-900">
                Student summary
              </h3>
              <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-bold text-amber-900">PENDING</span>
            </div>
            <dl className="mt-3 grid gap-3 sm:grid-cols-2">
              <SummaryField label="Student name" value={studentName} />
              <SummaryField label="Student ID" value={studentId} />
              <SummaryField label="Email address" value={email} />
              <SummaryField label="Program" value={program} />
              <SummaryField label="Year level" value={yearLevel} />
              <SummaryField label="Student type" value={studentType} />
              <SummaryField label="Academic year" value={academicYear} />
              <SummaryField label="Semester" value={semester} />
              <SummaryField label="Submitted" value={formatDate(submittedAt)} />
            </dl>
          </section>

          <section aria-labelledby={`${enrollmentId}-subjects`}>
            <div className="flex items-end justify-between gap-3">
              <div>
                <h3 id={`${enrollmentId}-subjects`} className="text-base font-bold text-primary-900">
                  Attached subjects
                </h3>
                <p className="mt-1 text-sm text-slateui-muted">
                  {subjects.length ? `${subjects.length} subject${subjects.length === 1 ? "" : "s"} in this request.` : "No attached subjects were found."}
                </p>
              </div>
              <span className="text-sm font-bold tabular-nums text-slateui-secondary">
                {subjects.reduce((total, subject) => total + subject.units, 0)} units
              </span>
            </div>
            {subjects.length ? (
              <div className="mt-3 overflow-x-auto rounded-md border border-slateui-border">
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-primary-50 text-primary-900">
                    <tr>
                      <th scope="col" className="whitespace-nowrap px-3 py-2 font-bold">Code</th>
                      <th scope="col" className="px-3 py-2 font-bold">Subject</th>
                      <th scope="col" className="whitespace-nowrap px-3 py-2 text-right font-bold">Units</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slateui-border bg-white">
                    {subjects.map((subject) => (
                      <tr key={subject.id}>
                        <td className="whitespace-nowrap px-3 py-2 font-semibold text-slateui-text">{subject.course_code}</td>
                        <td className="px-3 py-2 text-slateui-secondary">{subject.course_description}</td>
                        <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums text-slateui-secondary">{subject.units}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}
          </section>

          <section aria-labelledby={`${enrollmentId}-requirements`}>
            <h3 id={`${enrollmentId}-requirements`} className="mb-3 text-base font-bold text-primary-900">
              Requirement verification
            </h3>
            <RequirementStatusCard
              enrollmentId={enrollmentId}
              applicability={healthRequirement.applicability}
              currentStatus={healthRequirement.status}
              currentNote={healthRequirement.note}
              unavailable={healthRequirement.unavailable}
            />
          </section>

          {isApprovalBlocked && approvalBlockReason ? (
            <p className="border-l-4 border-amber-500 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-950">
              Approval disabled: {approvalBlockReason}
            </p>
          ) : null}

          {rejecting ? (
            <form action={rejectEnrollmentAction} className="space-y-4 border-t border-slateui-border pt-5">
              <input type="hidden" name="enrollment_id" value={enrollmentId} />
              <div>
                <h3 className="text-base font-bold text-red-800">Reject this enrollment request</h3>
                <p className="mt-1 text-sm leading-6 text-slateui-secondary">
                  Rejection is terminal for this academic year and semester. Remarks are optional and visible to the student in the portal.
                </p>
              </div>
              <TextArea
                label="Rejection remarks"
                name="remarks"
                placeholder="Optional free-text information visible with the enrollment result."
                maxLength={2000}
              />
              <div className="flex flex-wrap justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setRejecting(false)}>
                  Back
                </Button>
                <ReviewSubmitButton decision="reject" enrollmentId={enrollmentId} />
              </div>
            </form>
          ) : (
            <div className="flex flex-wrap justify-end gap-2 border-t border-slateui-border pt-5">
              <Button type="button" variant="danger" onClick={() => setRejecting(true)}>
                Reject enrollment
              </Button>
              <form action={approveEnrollmentAction}>
                <input type="hidden" name="enrollment_id" value={enrollmentId} />
                <ReviewSubmitButton decision="approve" enrollmentId={enrollmentId} disabled={isApprovalBlocked} />
              </form>
            </div>
          )}
        </div>
      </Modal>
    </>
  );
}
