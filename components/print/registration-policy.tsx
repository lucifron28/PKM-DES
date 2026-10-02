import React from "react";
import { formatDate } from "@/lib/utils/format";
import {
  REGISTRATION_POLICY_CONTENT,
  REGISTRATION_POLICY_VERSION
} from "@/lib/registration-form/policy";
import type { PresentedEnrollmentSignature } from "@/lib/signatures/presentation";

export function RegistrationPolicy({
  studentPledgeCovered = false,
  registrationPledgeVersion = null,
  studentSignature
}: {
  studentPledgeCovered?: boolean;
  registrationPledgeVersion?: string | null;
  studentSignature?: PresentedEnrollmentSignature | null;
}) {
  const coveredSignature = studentPledgeCovered && studentSignature?.is_current ? studentSignature : null;

  return (
    <section
      className="registration-policy-print print-page mx-auto max-w-[960px] rounded-lg border border-black bg-white p-4 sm:p-6"
      aria-labelledby="registration-policy-title"
      data-policy-version={REGISTRATION_POLICY_VERSION}
    >
      <header className="registration-policy-header">
        <h1 id="registration-policy-title" className="registration-policy-title">
          {REGISTRATION_POLICY_CONTENT.title}
        </h1>
      </header>

      <section className="registration-policy-section" aria-labelledby="free-higher-education-heading">
        <h2 id="free-higher-education-heading" className="registration-policy-heading">
          {REGISTRATION_POLICY_CONTENT.freeHigherEducationHeading}
        </h2>
        {REGISTRATION_POLICY_CONTENT.freeHigherEducationParagraphs.map((paragraph) => (
          <p className="registration-policy-copy" key={paragraph}>{paragraph}</p>
        ))}
      </section>

      <section className="registration-policy-section registration-policy-guidelines" aria-labelledby="enrollment-guidelines-heading">
        <h2 id="enrollment-guidelines-heading" className="registration-policy-heading">
          {REGISTRATION_POLICY_CONTENT.enrollmentGuidelinesHeading}
        </h2>
        <p className="registration-policy-subtitle">{REGISTRATION_POLICY_CONTENT.enrollmentGuidelinesSubtitle}</p>
        <p className="registration-policy-copy">{REGISTRATION_POLICY_CONTENT.enrollmentGuidelinesParagraph}</p>
      </section>

      <p className="registration-policy-warning">{REGISTRATION_POLICY_CONTENT.warning}</p>

      <section className="registration-policy-section registration-policy-pledge" aria-labelledby="student-pledge-heading">
        <h2 id="student-pledge-heading" className="registration-policy-heading">
          {REGISTRATION_POLICY_CONTENT.pledgeHeading}
        </h2>
        <p className="registration-policy-copy">{REGISTRATION_POLICY_CONTENT.pledge}</p>
        <div className="registration-policy-signature">
          <div className="registration-policy-signature-image">
            {coveredSignature?.signed_url ? (
              <img
                src={coveredSignature.signed_url}
                alt="Student electronic signature for the registration pledge"
              />
            ) : null}
          </div>
          <div className="registration-policy-signature-line" />
          <p className="registration-policy-signature-label">
            {REGISTRATION_POLICY_CONTENT.signatureLabel}
          </p>
          {coveredSignature ? (
            <div className="registration-policy-signature-meta">
              <span>{coveredSignature.signer_name_snapshot}</span>
              <span>Electronically Signed — {formatDate(coveredSignature.signed_at)}</span>
            </div>
          ) : registrationPledgeVersion === REGISTRATION_POLICY_VERSION ? (
            <p className="registration-policy-signature-status">Pledge not yet signed.</p>
          ) : (
            <p className="registration-policy-signature-status">
              UNSIGNED HISTORICAL PLEDGE. Existing signatures do not confirm acceptance of this policy version.
            </p>
          )}
        </div>
      </section>
    </section>
  );
}
