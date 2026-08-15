import { ESignatureInput, type SignatureEvidenceView } from "@/components/signatures/e-signature-input";
import { PrintButton } from "@/components/print/print-button";
import { Badge } from "@/components/ui/badge";
import { HealthRecordRejectionForm } from "@/components/health/health-record-rejection-form";
import { verifyHealthClearanceAction } from "@/app/admin/enrollments/signature-actions";
import { getHealthVerificationViewState, healthVerificationStateLabel, healthVerificationStateTone } from "@/lib/health-records/presentation";
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
  signerName: string;
  signedSignature: SignatureEvidenceView | null;
  canVerify: boolean;
  canReject: boolean;
  savedSignature?: SignatureSpecimenView | null;
};

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-slateui-border bg-slateui-surfaceAlt px-3 py-2">
      <dt className="text-[11px] font-bold uppercase tracking-wide text-slateui-muted">{label}</dt>
      <dd className="mt-1 break-words text-sm font-semibold text-slateui-text">{value}</dd>
    </div>
  );
}

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
    <section className="print-page space-y-5 rounded-lg border border-slateui-border bg-white p-5 shadow-panel sm:p-7" aria-labelledby="health-record-form-title">
      <header className="flex flex-wrap items-start justify-between gap-4 border-b-2 border-slateui-text pb-4">
        <div className="text-center sm:flex-1">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-slateui-muted">Pambayang Kolehiyo ng Mauban</p>
          <p className="mt-1 text-sm font-semibold tracking-wide text-slateui-secondary">HEALTH SERVICES</p>
          <h2 id="health-record-form-title" className="mt-4 text-xl font-extrabold uppercase tracking-wide text-slateui-text">Health Record Update</h2>
          <p className="mt-1 text-sm text-slateui-muted">Administrative verification form</p>
        </div>
        <PrintButton label="Print verification form" />
      </header>

      <dl className="grid gap-3 sm:grid-cols-2">
        <ReadOnlyField label="Date" value={formatDate(new Date().toISOString())} />
        <ReadOnlyField label="Student ID" value={studentId} />
        <ReadOnlyField label="Name" value={studentName} />
        <ReadOnlyField label="Program" value={program} />
        <ReadOnlyField label="Year level" value={yearLevel} />
        <ReadOnlyField label="Student type" value={studentType} />
        <ReadOnlyField label="Academic year" value={academicYear} />
        <ReadOnlyField label="Semester" value={semester} />
      </dl>

      <div className="rounded-md border border-primary-200 bg-primary-50 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="font-bold text-primary-950">Verification scope</h3>
            <p className="mt-1 text-sm leading-6 text-primary-900">This workflow records only whether the submitted paper form was administratively verified for the current enrollment term.</p>
          </div>
          <Badge tone={healthVerificationStateTone(state)}>{healthVerificationStateLabel(state)}</Badge>
        </div>
        <dl className="mt-4 grid gap-3 sm:grid-cols-2">
          <ReadOnlyField label="Applicability" value={applicability === "APPLICABLE" ? "Applicable" : "Not applicable"} />
          <ReadOnlyField label="Requirement" value="Health Record Update" />
        </dl>
      </div>

      {state === "NOT_APPLICABLE" ? (
        <p className="rounded-md border border-slateui-border bg-slateui-surfaceAlt px-4 py-3 text-sm leading-6 text-slateui-secondary">This requirement is not applicable. No Nurse verification or signature is requested.</p>
      ) : null}

      {state === "LEGACY_VERIFICATION" ? (
        <p className="rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm font-semibold leading-6 text-amber-950" role="alert">This requirement is marked VERIFIED but has no current Nurse signature. It is treated as legacy verification and does not satisfy the approval gate until a current signature is recorded.</p>
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
          description="This signature is immutable evidence bound to the current administrative verification record."
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
          description="Review the read-only identity and term fields, confirm the administrative verification statement, then draw your own signature. No clinical details are entered or stored here."
          signedSignature={signedSignature}
          savedSignature={savedSignature}
          applyLabel="Verify & Apply E-Signature"
          verificationFields={(
            <div className="rounded-md border border-primary-200 bg-primary-50 p-4">
              <h3 className="font-bold text-primary-950">Nurse acknowledgment</h3>
              <p className="mt-1 text-sm leading-6 text-primary-900">I confirm that I reviewed the submitted Health Record Update paper form for this student and term. This action records administrative verification only.</p>
              <label className="mt-3 flex items-start gap-2 text-sm leading-6 text-slateui-secondary">
                <input type="checkbox" name="verification_acknowledged" required className="mt-1 h-4 w-4 rounded border-slateui-border text-primary-800 focus:ring-primary-700" />
                <span>I confirm the Nurse verification statement above.</span>
              </label>
              <label className="mt-3 block text-sm font-semibold text-slateui-secondary" htmlFor={`${enrollmentId}-verification-note`}>
                Administrative verification note <span className="font-normal text-slateui-muted">(optional, 240 characters)</span>
              </label>
              <textarea id={`${enrollmentId}-verification-note`} name="verification_note" maxLength={240} placeholder="Optional short status-only note. Do not enter medical details." className="mt-2 min-h-24 w-full rounded-md border border-slateui-border bg-white px-3 py-2 text-sm text-slateui-text outline-none focus:border-primary-700 focus:ring-2 focus:ring-primary-200" />
            </div>
          )}
        />
      ) : (
        <p className="rounded-md border border-slateui-border bg-slateui-surfaceAlt px-4 py-3 text-sm leading-6 text-slateui-secondary">This enrollment is not currently available for Nurse verification.</p>
      )}

      {canReject ? <HealthRecordRejectionForm enrollmentId={enrollmentId} /> : null}
    </section>
  );
}
