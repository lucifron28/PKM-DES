import assert from "node:assert/strict";
import test from "node:test";
import { maskEmail, maskStudentId } from "./masking";
import {
  ACCOUNT_CLAIM_TOKEN_LIFETIME_SECONDS,
  createAccountClaimProof,
  createClaimFingerprint,
  serializeAccountClaimProof,
  verifyAccountClaimProof,
  type AccountClaimProof
} from "./token-core";
import { isCompatibleStudentType, validateClaimLookupInput } from "./rules";

const secret = "account-claim-test-secret-with-at-least-thirty-two-characters";
const now = 1_700_000_000_000;
const record = {
  id: "official-record-123",
  email: "andrea.reyes@example.com",
  student_id_number: "99-90001",
  program_id: "program-bsais",
  year_level: "1st Year" as const,
  student_type: "Incoming 1st Year Student" as const
};
const fingerprint = createClaimFingerprint(record);

function createToken(at = now) {
  return createAccountClaimProof({
    secret,
    officialRecordId: record.id,
    claimedStudentType: record.student_type,
    fingerprint,
    now: at
  });
}

function createProof(overrides: Partial<AccountClaimProof> = {}) {
  const issuedAt = Math.floor(now / 1000);
  return {
    version: 1,
    officialRecordId: record.id,
    claimedStudentType: record.student_type,
    fingerprint,
    issuedAt,
    expiresAt: issuedAt + ACCOUNT_CLAIM_TOKEN_LIFETIME_SECONDS,
    ...overrides
  } as AccountClaimProof;
}

test("valid signed-token round trip", () => {
  const verified = verifyAccountClaimProof({ token: createToken(), secret, now });
  assert.deepEqual(verified, createProof());
});

test("tampered payload is rejected", () => {
  const [payload, signature] = createToken().split(".");
  const tampered = `${payload.slice(0, -1)}${payload.endsWith("A") ? "B" : "A"}.${signature}`;
  assert.equal(verifyAccountClaimProof({ token: tampered, secret, now }), null);
});

test("tampered signature is rejected", () => {
  const [payload, signature] = createToken().split(".");
  const tampered = `${payload}.${signature.slice(0, -1)}${signature.endsWith("A") ? "B" : "A"}`;
  assert.equal(verifyAccountClaimProof({ token: tampered, secret, now }), null);
});

test("expired token is rejected", () => {
  const token = createToken(now - (ACCOUNT_CLAIM_TOKEN_LIFETIME_SECONDS + 1) * 1000);
  assert.equal(verifyAccountClaimProof({ token, secret, now }), null);
});

test("future-issued token is rejected", () => {
  const token = createToken(now + 31_000);
  assert.equal(verifyAccountClaimProof({ token, secret, now }), null);
});

test("unsupported token version is rejected", () => {
  const token = serializeAccountClaimProof(createProof({ version: 2 }), secret);
  assert.equal(verifyAccountClaimProof({ token, secret, now }), null);
});

test("fingerprint changes when a claim-relevant field changes", () => {
  for (const changedRecord of [
    { ...record, id: "different-id" },
    { ...record, email: "different@example.com" },
    { ...record, student_id_number: "99-90002" },
    { ...record, program_id: "different-program" },
    { ...record, year_level: "2nd Year" as const },
    { ...record, student_type: "Transferee" as const }
  ]) {
    assert.notEqual(createClaimFingerprint(changedRecord), fingerprint);
  }
});

test("token payload does not contain raw email", () => {
  const [payload] = createToken().split(".");
  assert.doesNotMatch(Buffer.from(payload, "base64url").toString("utf8"), /andrea\.reyes@example\.com/);
});

test("token payload does not contain Student ID", () => {
  const [payload] = createToken().split(".");
  assert.doesNotMatch(Buffer.from(payload, "base64url").toString("utf8"), /99-90001/);
});

test("token payload does not contain first or last name", () => {
  const [payload] = createToken().split(".");
  const decoded = Buffer.from(payload, "base64url").toString("utf8");
  assert.doesNotMatch(decoded, /Andrea|Reyes/);
});

test("exact email-and-Student-ID input succeeds", () => {
  assert.deepEqual(validateClaimLookupInput({ email: " Andrea.Reyes@Example.com ", studentIdNumber: " 99-90001 " }), {
    valid: true,
    email: "andrea.reyes@example.com",
    studentIdNumber: "99-90001"
  });
});

test("missing email fails", () => {
  assert.deepEqual(validateClaimLookupInput({ email: "", studentIdNumber: record.student_id_number }), {
    valid: false,
    code: "missing_email"
  });
});

test("missing Student ID fails", () => {
  assert.deepEqual(validateClaimLookupInput({ email: record.email, studentIdNumber: "" }), {
    valid: false,
    code: "missing_student_id"
  });
});

test("invalid email fails", () => {
  assert.deepEqual(validateClaimLookupInput({ email: "not-an-email", studentIdNumber: record.student_id_number }), {
    valid: false,
    code: "invalid_email"
  });
});

test("email masking does not reveal the complete local part", () => {
  const masked = maskEmail(record.email);
  assert.notEqual(masked, record.email);
  assert.doesNotMatch(masked, /andrea\.reyes/);
});

test("Student ID masking exposes at most the final four characters", () => {
  const masked = maskStudentId(record.student_id_number!);
  assert.equal(masked.endsWith("0001"), true);
  assert.doesNotMatch(masked, /99-9/);
});

test("Old Student claims accept compatible stored types", () => {
  for (const storedType of ["Old Student", "Continuing Student", "Regular Student", "Irregular Student"] as const) {
    assert.equal(isCompatibleStudentType("Old Student", storedType), true);
  }
});

test("other student-type mismatches fail", () => {
  assert.equal(isCompatibleStudentType("Incoming 1st Year Student", "Transferee"), false);
  assert.equal(isCompatibleStudentType("Transferee", "Old Student"), false);
});

test("invalid token field types fail", () => {
  const token = serializeAccountClaimProof({ ...createProof(), issuedAt: "invalid" } as unknown as AccountClaimProof, secret);
  assert.equal(verifyAccountClaimProof({ token, secret, now }), null);
});

test("token expiration must be after issuance", () => {
  const proof = createProof();
  const token = serializeAccountClaimProof({ ...proof, expiresAt: proof.issuedAt }, secret);
  assert.equal(verifyAccountClaimProof({ token, secret, now }), null);
});
