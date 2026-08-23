import { ESignatureInput, type SignatureEvidenceView } from "@/components/signatures/e-signature-input";
import { HealthRecordUpdatePaper } from "@/components/health/health-record-update-paper";
import { Badge } from "@/components/ui/badge";
import { HealthRecordRejectionForm } from "@/components/health/health-record-rejection-form";
import { verifyHealthClearanceAction } from "@/app/admin/enrollments/signature-actions";
import { getHealthVerificationViewState, healthVerificationStateLabel, healthVerificationStateTone } from "@/lib/health-records/presentation";
import type { HealthRecordUpdate } from "@/lib/health-records/types";
import type { RequirementApplicability, RequirementStatus } from "@/lib/requirements/types";
import type { SignatureSpecimenView } from "@/lib/signatures/specimens";
import { formatDate } from "@/lib/utils/format";

type HealthRecordVerificationFormProps = {
  enrollmentId: string;
  studentName: string;
  studentId: string;
  program: string;
  yearLevel: string;
  studentType: string;
  academicYear: string;
  semester: string;
  applicability: RequirementApplicability;
  status: RequirementStatus;
  note: string | null;
  healthRecord: HealthRecordUpdate | null;
  studentSignature?: SignatureEvidenceView | null;
  signerName: string;
  signedSignature: SignatureEvidenceView | null;
  canVerify: boolean;
  canReject: boolean;
  savedSignature?: SignatureSpecimenView | null;
};

export function HealthRecordVerificationForm({
  enrollmentId,
  studentName,
  studentId,
  program,
  yearLevel,
  studentType,
  academicYear,
  semester,
  applicability,
  status,
  note,
  healthRecord,
  studentSignature,
  signerName,
  signedSignature,
  canVerify,
  canReject,
  savedSignature
}: HealthRecordVerificationFormProps) {
  const state = getHealthVerificationViewState({
    applicability,
    status,
    nurseSignatureIsCurrent: Boolean(signedSignature?.isCurrent)
  });
  const currentSignature = signedSignature?.isCurrent ? signedSignature : null;

  return (
    <div className="space-y-5">
      {healthRecord ? (
        <HealthRecordUpdatePaper
          studentName={studentName}
          program={program}
          yearLevel={yearLevel}
          dateLabel={formatDate(healthRecord.submitted_at)}
          record={healthRecord}
          studentSignature={studentSignature}
          nurseSignature={currentSignature}
        />
      ) : (
        <section className="rounded-md border border-amber-300 bg-amber-50 p-4" aria-label="Health Record Update not submitted">
          <h3 className="font-bold text-amber-950">Health Record Update not submitted</h3>
          <p className="mt-1 text-sm leading-6 text-amber-900">
            The student has not completed the Health Record Update form yet. The Nurse signature control will become available after the student saves the form.
          </p>
        </section>
      )}

      <section className="space-y-5 rounded-lg border border-slateui-border bg-white p-5 shadow-panel sm:p-7" aria-labelledby="health-record-verification-title">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slateui-border pb-4">
          <div>
            <h2 id="health-record-verification-title" className="text-lg font-extrabold text-slateui-text">Nurse verification</h2>
            <p className="mt-1 text-sm leading-6 text-slateui-secondary">Review the completed form above and apply the School Nurse e-signature for the current enrollment term.</p>
          </div>
          <Badge tone={healthVerificationStateTone(state)}>{healthVerificationStateLabel(state)}</Badge>
        </div>

        <dl className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
          <div><dt className="font-bold uppercase tracking-wide text-slateui-muted">Student ID</dt><dd className="mt-1 font-semibold text-slateui-text">{studentId}</dd></div>
          <div><dt className="font-bold uppercase tracking-wide text-slateui-muted">Student type</dt><dd className="mt-1 font-semibold text-slateui-text">{studentType}</dd></div>
          <div><dt className="font-bold uppercase tracking-wide text-slateui-muted">Academic year</dt><dd className="mt-1 font-semibold text-slateui-text">{academicYear}</dd></div>
          <div><dt className="font-bold uppercase tracking-wide text-slateui-muted">Semester</dt><dd className="mt-1 font-semibold text-slateui-text">{semester}</dd></div>
        </dl>

        <div className="rounded-md border border-primary-200 bg-primary-50 p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="font-bold text-primary-950">Verification scope</h3>
              <p className="mt-1 text-sm leading-6 text-primary-900">This action confirms that the submitted Health Record Update was reviewed for the current enrollment term.</p>
            </div>
            <Badge tone={applicability === "APPLICABLE" ? "info" : "neutral"}>{applicability === "APPLICABLE" ? "Applicable" : "Not applicable"}</Badge>
          </div>
        </div>

        {state === "NOT_APPLICABLE" ? (
          <p className="rounded-md border border-slateui-border bg-slateui-surfaceAlt px-4 py-3 text-sm leading-6 text-slateui-secondary">This requirement is not applicable. No Nurse verification or signature is requested.</p>
        ) : null}

        {state === "LEGACY_VERIFICATION" ? (
          <p className="rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm font-semibold leading-6 text-amber-950" role="alert">This requirement is marked VERIFIED but has no current Nurse signature. It does not satisfy the approval gate until a current signature is recorded.</p>
        ) : null}

        {note ? (
          <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm leading-6 text-red-950">
            <p className="font-bold">Administrative note</p>
            <p className="mt-1">{note}</p>
          </div>
        ) : null}

        {currentSignature ? (
          <ESignatureInput
            action={verifyHealthClearanceAction}
            enrollmentId={enrollmentId}
            signerRole="NURSE"
            clearanceType="HEALTH_CLEARANCE"
            signerLabel="School Nurse"
            signerName={signerName}
            title="Nurse verification signature"
            description="This signature is immutable evidence bound to the completed Health Record Update and current enrollment term."
            signedSignature={currentSignature}
            savedSignature={savedSignature}
          />
        ) : canVerify ? (
          <ESignatureInput
            action={verifyHealthClearanceAction}
            enrollmentId={enrollmentId}
            signerRole="NURSE"
            clearanceType="HEALTH_CLEARANCE"
            signerLabel="School Nurse"
            signerName={signerName}
            title="Verify and apply Nurse e-signature"
            description="Review the completed Health Record Update above, confirm the verification statement, then draw your own signature."
            signedSignature={signedSignature}
            savedSignature={savedSignature}
            applyLabel="Verify & Apply E-Signature"
            verificationFields={(
              <div className="rounded-md border border-primary-200 bg-primary-50 p-4">
                <h3 className="font-bold text-primary-950">Nurse acknowledgment</h3>
                <p className="mt-1 text-sm leading-6 text-primary-900">I confirm that I reviewed the submitted Health Record Update for this student and term. This action records the administrative verification and my electronic signature.</p>
                <label className="mt-3 flex items-start gap-2 text-sm leading-6 text-slateui-secondary">
                  <input type="checkbox" name="verification_acknowledged" required className="mt-1 h-4 w-4 rounded border-slateui-border text-primary-800 focus:ring-primary-700" />
                  <span>I confirm the Nurse verification statement above.</span>
                </label>
                <label className="mt-3 block text-sm font-semibold text-slateui-secondary" htmlFor={`${enrollmentId}-verification-note`}>
                  Administrative verification note <span className="font-normal text-slateui-muted">(optional, 240 characters)</span>
                </label>
                <textarea id={`${enrollmentId}-verification-note`} name="verification_note" maxLength={240} placeholder="Optional short status-only note." className="mt-2 min-h-24 w-full rounded-md border border-slateui-border bg-white px-3 py-2 text-sm text-slateui-text outline-none focus:border-primary-700 focus:ring-2 focus:ring-primary-200" />
              </div>
            )}
          />
        ) : (
          <p className="rounded-md border border-slateui-border bg-slateui-surfaceAlt px-4 py-3 text-sm leading-6 text-slateui-secondary">This Health Record Update is not currently available for Nurse verification.</p>
        )}
      </section>

      {canReject ? <HealthRecordRejectionForm enrollmentId={enrollmentId} /> : null}
    </div>
  );
}
