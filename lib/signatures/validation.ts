import { createHash } from "node:crypto";

export const SIGNATURE_BUCKET = "enrollment-signatures";
export const MAX_SIGNATURE_BYTES = 262144;
export const MAX_SIGNATURE_WIDTH = 1600;
export const MAX_SIGNATURE_HEIGHT = 600;

export type SignatureInputMode = "DRAWN";

export type ValidatedSignaturePayload = {
  bytes: Buffer;
  signatureHash: string;
};

const PNG_SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

export function validateSignatureConfirmation(value: FormDataEntryValue | null) {
  return value === "on";
}

export function validatePngSignatureDataUrl(value: FormDataEntryValue | null): ValidatedSignaturePayload | null {
  if (typeof value !== "string") return null;

  const match = /^data:image\/png;base64,([A-Za-z0-9+/]+={0,2})$/.exec(value.trim());
  if (!match) return null;

  const encoded = match[1];
  if (encoded.length % 4 === 1) return null;

  const bytes = Buffer.from(encoded, "base64");
  if (bytes.length < 100 || bytes.length > MAX_SIGNATURE_BYTES) return null;
  if (!bytes.subarray(0, PNG_SIGNATURE.length).equals(PNG_SIGNATURE)) return null;

  const normalizedInput = encoded.replace(/=+$/, "");
  const normalizedOutput = bytes.toString("base64").replace(/=+$/, "");
  if (normalizedInput !== normalizedOutput) return null;

  // A valid PNG signature image must begin with an IHDR chunk containing
  // dimensions. The storage bucket additionally restricts the MIME type.
  if (bytes.length < 33 || bytes.readUInt32BE(8) !== 13 || bytes.subarray(12, 16).toString("ascii") !== "IHDR") {
    return null;
  }

  const width = bytes.readUInt32BE(16);
  const height = bytes.readUInt32BE(20);
  if (width < 1 || width > MAX_SIGNATURE_WIDTH || height < 1 || height > MAX_SIGNATURE_HEIGHT) return null;

  return {
    bytes,
    signatureHash: createHash("sha256").update(bytes).digest("hex")
  };
}

export function buildSignatureStoragePath(enrollmentId: string, signerRole: string, signatureId: string) {
  return `${enrollmentId}/${signerRole}/${signatureId}.png`;
}
