import "server-only";

import {
  ACCOUNT_CLAIM_TOKEN_LIFETIME_SECONDS,
  createAccountClaimProof as createProof,
  createClaimFingerprint,
  verifyAccountClaimProof as verifyProof
} from "./token-core";
import type { StudentType } from "@/types/database";

export { ACCOUNT_CLAIM_TOKEN_LIFETIME_SECONDS, createClaimFingerprint };

function getClaimSecret() {
  const secret = process.env.ACCOUNT_CLAIM_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("Account claim signing is not configured.");
  }

  return secret;
}

export function createAccountClaimProof({
  officialRecordId,
  claimedStudentType,
  fingerprint,
  now
}: {
  officialRecordId: string;
  claimedStudentType: StudentType;
  fingerprint: string;
  now?: number;
}) {
  return createProof({ officialRecordId, claimedStudentType, fingerprint, now, secret: getClaimSecret() });
}

export function verifyAccountClaimProof(token: string, now?: number) {
  return verifyProof({ token, now, secret: getClaimSecret() });
}
