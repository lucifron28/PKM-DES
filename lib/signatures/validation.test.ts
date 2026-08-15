import assert from "node:assert/strict";
import test from "node:test";
import { createHash } from "node:crypto";
import sharp from "sharp";
import {
  MAX_SIGNATURE_BYTES,
  buildSignatureStoragePath,
  validatePngSignatureDataUrl,
  validateSignatureConfirmation
} from "./validation";

async function testPngDataUrl({
  width = 640,
  height = 180,
  kind = "signature"
}: {
  width?: number;
  height?: number;
  kind?: "signature" | "transparent" | "white" | "dot";
} = {}) {
  const raw = Buffer.alloc(width * height * 4, 0);
  if (kind === "white") {
    for (let index = 0; index < raw.length; index += 4) {
      raw[index] = 255;
      raw[index + 1] = 255;
      raw[index + 2] = 255;
      raw[index + 3] = 255;
    }
  } else if (kind === "dot") {
    const index = ((Math.floor(height / 2) * width) + Math.floor(width / 2)) * 4;
    raw[index] = 17;
    raw[index + 1] = 24;
    raw[index + 2] = 39;
    raw[index + 3] = 255;
  } else if (kind === "signature") {
    for (let x = 80; x < 240; x += 1) {
      const y = Math.round(height / 2 + Math.sin(x / 12) * 18);
      for (let offset = -1; offset <= 1; offset += 1) {
        const index = ((y + offset) * width + x) * 4;
        raw[index] = 17;
        raw[index + 1] = 24;
        raw[index + 2] = 39;
        raw[index + 3] = 255;
      }
    }
  }

  const bytes = await sharp(raw, { raw: { width, height, channels: 4 } }).png().toBuffer();
  return `data:image/png;base64,${bytes.toString("base64")}`;
}

test("signature input requires confirmation and contains meaningful visible ink", async () => {
  const dataUrl = await testPngDataUrl();
  const parsed = await validatePngSignatureDataUrl(dataUrl);
  assert.ok(parsed);
  assert.equal(parsed.signatureHash, createHash("sha256").update(parsed.bytes).digest("hex"));
  assert.equal(validateSignatureConfirmation("on"), true);
  assert.equal(validateSignatureConfirmation("true"), false);
  assert.equal(await validatePngSignatureDataUrl("data:image/svg+xml;base64,AAAA"), null);
  assert.equal(await validatePngSignatureDataUrl(await testPngDataUrl({ width: 1601, height: 180 })), null);
});

test("transparent, all-white, and one-pixel PNGs are rejected as blank signatures", async () => {
  assert.equal(await validatePngSignatureDataUrl(await testPngDataUrl({ kind: "transparent" })), null);
  assert.equal(await validatePngSignatureDataUrl(await testPngDataUrl({ kind: "white" })), null);
  assert.equal(await validatePngSignatureDataUrl(await testPngDataUrl({ kind: "dot" })), null);
});

test("signature storage paths are role-scoped and payload size is bounded", () => {
  assert.equal(
    buildSignatureStoragePath("enrollment-1", "DEAN", "signature-1"),
    "enrollment-1/DEAN/signature-1.png"
  );
  assert.equal(MAX_SIGNATURE_BYTES, 262144);
});
