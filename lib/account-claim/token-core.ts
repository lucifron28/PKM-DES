import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import type { StudentType, YearLevel } from "@/types/database";
import { normalizeClaimEmail, normalizeStudentId } from "./rules";

const TOKEN_VERSION = 1;
export const ACCOUNT_CLAIM_TOKEN_LIFETIME_SECONDS = 10 * 60;
const CLOCK_TOLERANCE_SECONDS = 30;

export type AccountClaimProof = {
  version: number;
  officialRecordId: string;
  claimedStudentType: StudentType;
  fingerprint: string;
  issuedAt: number;
  expiresAt: number;
};

type ClaimFingerprintRecord = {
  id: string;
  email: string;
  student_id_number: string | null;
  program_id: string;
  year_level: YearLevel;
  student_type: StudentType;
};

function encode(value: unknown) {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}

function decode(value: string) {
  return JSON.parse(Buffer.from(value, "base64url").toString("utf8")) as unknown;
}

function sign(payload: string, secret: string) {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

function isAccountClaimProof(value: unknown): value is AccountClaimProof {
  if (!value || typeof value !== "object") {
    return false;
  }

  const proof = value as Record<string, unknown>;
  return (
    proof.version === TOKEN_VERSION &&
    typeof proof.officialRecordId === "string" &&
    typeof proof.claimedStudentType === "string" &&
    typeof proof.fingerprint === "string" &&
    typeof proof.issuedAt === "number" &&
    typeof proof.expiresAt === "number"
  );
}

export function createClaimFingerprint(record: ClaimFingerprintRecord) {
  const input = [
    record.id,
    normalizeClaimEmail(record.email),
    normalizeStudentId(record.student_id_number),
    record.program_id,
    record.year_level,
    record.student_type
  ].join("\u001f");

  return createHash("sha256").update(input).digest("base64url");
}

export function serializeAccountClaimProof(proof: AccountClaimProof, secret: string) {
  const payload = encode(proof);
  return `${payload}.${sign(payload, secret)}`;
}

export function createAccountClaimProof({
  secret,
  officialRecordId,
  claimedStudentType,
  fingerprint,
  now = Date.now()
}: {
  secret: string;
  officialRecordId: string;
  claimedStudentType: StudentType;
  fingerprint: string;
  now?: number;
}) {
  const issuedAt = Math.floor(now / 1000);
  return serializeAccountClaimProof(
    {
      version: TOKEN_VERSION,
      officialRecordId,
      claimedStudentType,
      fingerprint,
      issuedAt,
      expiresAt: issuedAt + ACCOUNT_CLAIM_TOKEN_LIFETIME_SECONDS
    },
    secret
  );
}

export function verifyAccountClaimProof({ token, secret, now = Date.now() }: { token: string; secret: string; now?: number }) {
  const [payload, signature, ...remaining] = token.split(".");
  if (!payload || !signature || remaining.length) {
    return null;
  }

  const expectedSignature = sign(payload, secret);
  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSignature);
  if (signatureBuffer.length !== expectedBuffer.length || !timingSafeEqual(signatureBuffer, expectedBuffer)) {
    return null;
  }

  try {
    const proof = decode(payload);
    if (!isAccountClaimProof(proof)) {
      return null;
    }

    const nowSeconds = Math.floor(now / 1000);
    if (
      proof.issuedAt > nowSeconds + CLOCK_TOLERANCE_SECONDS ||
      proof.expiresAt <= proof.issuedAt ||
      proof.expiresAt < nowSeconds ||
      proof.expiresAt - proof.issuedAt > ACCOUNT_CLAIM_TOKEN_LIFETIME_SECONDS
    ) {
      return null;
    }

    return proof;
  } catch {
    return null;
  }
}
