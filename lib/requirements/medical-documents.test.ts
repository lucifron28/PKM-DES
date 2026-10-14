import assert from "node:assert/strict";
import test from "node:test";
import { MAX_MEDICAL_DOCUMENT_BYTES, validateMedicalDocument } from "./medical-documents";

test("medical uploads reject wrong content types, signatures, and oversized papers", () => {
  const pdf = new TextEncoder().encode("%PDF-1.7 test");
  assert.equal(validateMedicalDocument(pdf, "application/pdf"), null);
  assert.ok(validateMedicalDocument(pdf, "image/png"));
  assert.ok(validateMedicalDocument(pdf, "text/html"));
  assert.equal(validateMedicalDocument(new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]), "image/png"), null);
  assert.equal(validateMedicalDocument(new Uint8Array([255, 216, 255]), "image/jpeg"), null);
  assert.ok(validateMedicalDocument(new Uint8Array(), "application/pdf"));
  assert.ok(validateMedicalDocument(new Uint8Array(MAX_MEDICAL_DOCUMENT_BYTES + 1), "application/pdf"));
});
