import assert from "node:assert/strict";
import test from "node:test";
import { isUsableSignatureSpecimen, type SignatureSpecimenCandidate } from "./specimen-policy";

const validCandidate: SignatureSpecimenCandidate = {
  authenticatedProfileId: "profile-a",
  specimenProfileId: "profile-a",
  retiredAt: null,
  storedHash: "hash-a",
  payloadHash: "hash-a"
};

test("an authenticated owner may apply a current intact specimen", () => {
  assert.equal(isUsableSignatureSpecimen(validCandidate), true);
});

test("a different profile cannot apply another person's specimen", () => {
  assert.equal(isUsableSignatureSpecimen({ ...validCandidate, authenticatedProfileId: "profile-b" }), false);
});

test("retired or changed specimens cannot be applied", () => {
  assert.equal(isUsableSignatureSpecimen({ ...validCandidate, retiredAt: "2026-08-15T00:00:00.000Z" }), false);
  assert.equal(isUsableSignatureSpecimen({ ...validCandidate, payloadHash: "changed-hash" }), false);
});
