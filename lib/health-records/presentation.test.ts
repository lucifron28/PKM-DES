import assert from "node:assert/strict";
import test from "node:test";
import { getHealthVerificationViewState, healthVerificationStateLabel, isCurrentHealthVerification } from "./presentation";

test("Health Record Update presentation distinguishes current, legacy, rejected, pending, and not-applicable states", () => {
  assert.equal(
    getHealthVerificationViewState({ applicability: "APPLICABLE", status: "PENDING", nurseSignatureIsCurrent: false }),
    "PENDING"
  );
  assert.equal(
    getHealthVerificationViewState({ applicability: "APPLICABLE", status: "VERIFIED", nurseSignatureIsCurrent: true }),
    "VERIFIED"
  );
  assert.equal(
    getHealthVerificationViewState({ applicability: "APPLICABLE", status: "VERIFIED", nurseSignatureIsCurrent: false }),
    "LEGACY_VERIFICATION"
  );
  assert.equal(
    getHealthVerificationViewState({ applicability: "APPLICABLE", status: "REJECTED", nurseSignatureIsCurrent: false }),
    "REJECTED"
  );
  assert.equal(
    getHealthVerificationViewState({ applicability: "NOT_APPLICABLE", status: "PENDING", nurseSignatureIsCurrent: false }),
    "NOT_APPLICABLE"
  );
  assert.equal(healthVerificationStateLabel("LEGACY_VERIFICATION"), "LEGACY VERIFICATION");
  assert.equal(isCurrentHealthVerification({ applicability: "APPLICABLE", status: "VERIFIED", nurseSignatureIsCurrent: true }), true);
  assert.equal(isCurrentHealthVerification({ applicability: "APPLICABLE", status: "VERIFIED", nurseSignatureIsCurrent: false }), false);
});
