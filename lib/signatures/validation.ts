import { createHash } from "node:crypto";
import sharp from "sharp";

export const SIGNATURE_BUCKET = "enrollment-signatures";
export const SIGNATURE_SPECIMEN_BUCKET = "signature-specimens";
export const MAX_SIGNATURE_BYTES = 262144;
export const MAX_SIGNATURE_WIDTH = 1600;
export const MAX_SIGNATURE_HEIGHT = 600;
export const MIN_SIGNATURE_INK_PIXELS = 12;
export const MIN_SIGNATURE_INK_WIDTH = 4;
export const MIN_SIGNATURE_INK_HEIGHT = 2;

export type SignatureInputMode = "DRAWN";

export type ValidatedSignaturePayload = {
  bytes: Buffer;
  signatureHash: string;
};

const PNG_SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

export function validateSignatureConfirmation(value: FormDataEntryValue | null) {
  return value === "on";
}

export async function validatePngSignatureBytes(bytes: Buffer): Promise<ValidatedSignaturePayload | null> {
  if (!Buffer.isBuffer(bytes)) return null;
  if (bytes.length < 100 || bytes.length > MAX_SIGNATURE_BYTES) return null;
  if (!bytes.subarray(0, PNG_SIGNATURE.length).equals(PNG_SIGNATURE)) return null;

  // Keep the inexpensive header checks before handing the bytes to the decoder.
  if (bytes.length < 33 || bytes.readUInt32BE(8) !== 13 || bytes.subarray(12, 16).toString("ascii") !== "IHDR") {
    return null;
  }

  const width = bytes.readUInt32BE(16);
  const height = bytes.readUInt32BE(20);
  if (width < 1 || width > MAX_SIGNATURE_WIDTH || height < 1 || height > MAX_SIGNATURE_HEIGHT) return null;

  try {
    const decoded = await sharp(bytes, { failOn: "error" })
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    if (decoded.info.width !== width || decoded.info.height !== height || decoded.info.channels !== 4) {
      return null;
    }

    let inkCount = 0;
    let minX = width;
    let minY = height;
    let maxX = -1;
    let maxY = -1;

    for (let index = 0; index < decoded.data.length; index += 4) {
      const alpha = decoded.data[index + 3];
      if (alpha < 16) continue;

      const luminance = 0.2126 * decoded.data[index] + 0.7152 * decoded.data[index + 1] + 0.0722 * decoded.data[index + 2];
      if (luminance > 250) continue;

      const pixel = index / 4;
      const x = pixel % width;
      const y = Math.floor(pixel / width);
      inkCount += 1;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }

    const inkWidth = maxX >= minX ? maxX - minX + 1 : 0;
    const inkHeight = maxY >= minY ? maxY - minY + 1 : 0;
    if (inkCount < MIN_SIGNATURE_INK_PIXELS || inkWidth < MIN_SIGNATURE_INK_WIDTH || inkHeight < MIN_SIGNATURE_INK_HEIGHT) {
      return null;
    }
  } catch {
    return null;
  }

  return {
    bytes,
    signatureHash: createHash("sha256").update(bytes).digest("hex")
  };
}

export async function validatePngSignatureDataUrl(value: FormDataEntryValue | null): Promise<ValidatedSignaturePayload | null> {
  if (typeof value !== "string") return null;

  const match = /^data:image\/png;base64,([A-Za-z0-9+/]+={0,2})$/.exec(value.trim());
  if (!match) return null;

  const encoded = match[1];
  if (encoded.length % 4 === 1) return null;

  const bytes = Buffer.from(encoded, "base64");

  const normalizedInput = encoded.replace(/=+$/, "");
  const normalizedOutput = bytes.toString("base64").replace(/=+$/, "");
  if (normalizedInput !== normalizedOutput) return null;

  return validatePngSignatureBytes(bytes);
}

export function buildSignatureStoragePath(enrollmentId: string, signerRole: string, signatureId: string) {
  return `${enrollmentId}/${signerRole}/${signatureId}.png`;
}

export function buildSignatureSpecimenStoragePath(profileId: string, specimenId: string) {
  return `${profileId}/${specimenId}.png`;
}
