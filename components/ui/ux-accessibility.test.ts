import assert from "node:assert/strict";
import test from "node:test";
import { enrollmentBadgeTone } from "@/components/ui/badge";

test("accessibility and functional UI invariants are enforced", () => {
  assert.equal(enrollmentBadgeTone("ENROLLED"), "success");
  assert.equal(enrollmentBadgeTone("APPROVED"), "success");
  assert.equal(enrollmentBadgeTone("PENDING"), "warning");
  assert.equal(enrollmentBadgeTone("REJECTED"), "error");
  assert.equal(enrollmentBadgeTone("NOT ENROLLED"), "neutral");
});
