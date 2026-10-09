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
function getPolicyPrintMarkup(markup: string) {
  const printStart = markup.indexOf('<section class="registration-policy-print');
  assert.notEqual(printStart, -1, "institutional policy document should render");
  const screenNoteStart = markup.indexOf('<p class="registration-policy-screen-note print-hidden"', printStart);
  return markup.slice(printStart, screenNoteStart === -1 ? undefined : screenNoteStart);
}


test("historical pledge explanation stays on screen and outside the printed policy", () => {
  const markup = renderToStaticMarkup(
    React.createElement(RegistrationPolicy, {
      studentSignature: currentSignature,
      registrationPledgeVersion: null
    })
  );
  const printMarkup = getPolicyPrintMarkup(markup);

  assert.doesNotMatch(printMarkup, /UNSIGNED HISTORICAL PLEDGE|Pledge not yet signed|Existing signatures do not confirm acceptance/);
  assert.match(printMarkup, /class="registration-policy-signature-image"><\/div>/);
  assert.match(printMarkup, /class="registration-policy-signature-line"><\/div>/);
  assert.doesNotMatch(printMarkup, /Test Student|<img\b/);
  assert.match(
    markup,
    /class="registration-policy-screen-note print-hidden"[^>]*role="status">[^<]+<\/p>/
  );
});

test("unsigned current pledge status stays on screen and outside the printed policy", () => {
  const markup = renderToStaticMarkup(
    React.createElement(RegistrationPolicy, {
      studentSignature: currentSignature,
      registrationPledgeVersion: "pledge-v1"
    })
  );
  const printMarkup = getPolicyPrintMarkup(markup);

  assert.doesNotMatch(printMarkup, /Pledge not yet signed|UNSIGNED HISTORICAL PLEDGE/);
  assert.match(printMarkup, /class="registration-policy-signature-image"><\/div>/);
  assert.match(markup, /class="registration-policy-screen-note print-hidden"[^>]*role="status">[^<]+<\/p>/);
});

test("only an explicitly covered current signature appears on the printed pledge", () => {
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
  const coveredPrintMarkup = getPolicyPrintMarkup(coveredMarkup);
  const stalePrintMarkup = getPolicyPrintMarkup(staleMarkup);

  assert.match(coveredPrintMarkup, /<img[^>]+src="https:\/\/example\.invalid\/signature\.png"/);
  assert.match(coveredPrintMarkup, /Test Student/);
  assert.doesNotMatch(coveredPrintMarkup, /UNSIGNED HISTORICAL PLEDGE|Pledge not yet signed/);
  assert.doesNotMatch(stalePrintMarkup, /Test Student|UNSIGNED HISTORICAL PLEDGE|Pledge not yet signed|<img\b/);
  assert.match(stalePrintMarkup, /class="registration-policy-signature-image"><\/div>/);
  assert.match(staleMarkup, /class="registration-policy-screen-note print-hidden"[^>]*role="status">[^<]+<\/p>/);
});
