import assert from "node:assert/strict";
import test from "node:test";
import { createHash } from "node:crypto";
import {
  MAX_SIGNATURE_BYTES,
  buildSignatureStoragePath,
  validatePngSignatureDataUrl,
  validateSignatureConfirmation
} from "./validation";

function testPngDataUrl(width = 640, height = 180) {
  const bytes = Buffer.alloc(100, 0);
  bytes.set([137, 80, 78, 71, 13, 10, 26, 10], 0);
  bytes.writeUInt32BE(13, 8);
  bytes.write("IHDR", 12, 4, "ascii");
  bytes.writeUInt32BE(width, 16);
  bytes.writeUInt32BE(height, 20);
  return `data:image/png;base64,${bytes.toString("base64")}`;
}

test("signature input requires explicit confirmation and a bounded PNG", () => {
  const dataUrl = testPngDataUrl();
  const parsed = validatePngSignatureDataUrl(dataUrl);
  assert.ok(parsed);
  assert.equal(parsed.bytes.length, 100);
  assert.equal(parsed.signatureHash, createHash("sha256").update(parsed.bytes).digest("hex"));
  assert.equal(validateSignatureConfirmation("on"), true);
  assert.equal(validateSignatureConfirmation("true"), false);
  assert.equal(validatePngSignatureDataUrl("data:image/svg+xml;base64,AAAA"), null);
  assert.equal(validatePngSignatureDataUrl(testPngDataUrl(1601, 180)), null);
});

test("signature storage paths are role-scoped and payload size is bounded", () => {
  assert.equal(
    buildSignatureStoragePath("enrollment-1", "DEAN", "signature-1"),
    "enrollment-1/DEAN/signature-1.png"
  );
  assert.equal(MAX_SIGNATURE_BYTES, 262144);
});
