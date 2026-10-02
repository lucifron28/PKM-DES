import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { PresentedEnrollmentSignature } from "@/lib/signatures/presentation";
import { RegistrationPolicy } from "./registration-policy";

const currentSignature = {
  id: "signature-id",
  enrollment_id: "enrollment-id",
  student_id: "student-id",
  signer_profile_id: "profile-id",
  signer_role: "STUDENT",
  clearance_type: "STUDENT_ENROLLMENT_SIGNATURE",
  document_type: "ENROLLMENT_REGISTRATION",
  signer_name_snapshot: "Test Student",
  signature_storage_path: "enrollment-id/signature.png",
  document_hash: "current-hash",
  signed_at: "2026-10-02T00:00:00.000Z",
  signed_url: "https://example.invalid/signature.png",
  is_current: true
} as PresentedEnrollmentSignature;

test("historical signature is not printed as pledge acceptance without server coverage", () => {
  const markup = renderToStaticMarkup(
    React.createElement(RegistrationPolicy, {
      studentSignature: currentSignature,
      registrationPledgeVersion: null
    })
  );

  assert.match(markup, /UNSIGNED HISTORICAL PLEDGE/);
  assert.match(markup, /Existing signatures do not confirm acceptance of this policy version\./);
  assert.doesNotMatch(markup, /<img\b/);
});

test("current pledge version without a covered signature is labeled unsigned", () => {
  const markup = renderToStaticMarkup(
    React.createElement(RegistrationPolicy, {
      studentSignature: currentSignature,
      registrationPledgeVersion: "pledge-v1"
    })
  );

  assert.match(markup, /Pledge not yet signed\./);
  assert.doesNotMatch(markup, /<img\b/);
});

test("back-page signature appears only for an explicitly covered current signature", () => {
  const coveredMarkup = renderToStaticMarkup(
    React.createElement(RegistrationPolicy, {
      studentPledgeCovered: true,
      studentSignature: currentSignature
    })
  );
  const staleMarkup = renderToStaticMarkup(
    React.createElement(RegistrationPolicy, {
      studentPledgeCovered: true,
      studentSignature: { ...currentSignature, is_current: false }
    })
  );

  assert.match(coveredMarkup, /<img[^>]+src="https:\/\/example\.invalid\/signature\.png"/);
  assert.match(coveredMarkup, /Test Student/);
  assert.doesNotMatch(staleMarkup, /<img\b/);
  assert.match(staleMarkup, /UNSIGNED HISTORICAL PLEDGE/);
});
