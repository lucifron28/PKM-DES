import assert from "node:assert/strict";
import test from "node:test";
import { getActiveEnrollmentTerm } from "@/lib/enrollment/term-authority";
import { COURSE_OFFERINGS_MANIFEST } from "@/lib/course-offerings/manifest";

test("domain service helpers are decoupled and exported", () => {
  assert.equal(typeof getActiveEnrollmentTerm, "function");
  assert.equal(COURSE_OFFERINGS_MANIFEST.expectedTotalRows, 245);
});
