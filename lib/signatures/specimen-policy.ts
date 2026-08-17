export type SignatureSpecimenCandidate = {
  authenticatedProfileId: string;
  specimenProfileId: string;
  retiredAt: string | null;
  storedHash: string;
  payloadHash: string;
};

/**
 * A specimen can be applied only when it belongs to the current signer,
 * remains the current row, and the private object matches its stored hash.
 */
export function isUsableSignatureSpecimen(candidate: SignatureSpecimenCandidate) {
  return (
    candidate.authenticatedProfileId === candidate.specimenProfileId &&
    candidate.retiredAt === null &&
    candidate.storedHash === candidate.payloadHash
  );
}
