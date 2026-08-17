import assert from "node:assert/strict";
import test from "node:test";
import { hasMeaningfulSignatureMotion, MIN_SIGNATURE_PATH_DISTANCE, signatureSegmentDistance } from "./drawing";

test("signature drawing requires actual path distance", () => {
  assert.equal(hasMeaningfulSignatureMotion(0), false);
  assert.equal(hasMeaningfulSignatureMotion(1), false);
  assert.equal(hasMeaningfulSignatureMotion(MIN_SIGNATURE_PATH_DISTANCE), true);
  assert.equal(signatureSegmentDistance({ x: 0, y: 0 }, { x: 3, y: 4 }), 5);
});
