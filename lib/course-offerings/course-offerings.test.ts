import assert from "node:assert/strict";
import test from "node:test";
import { COURSE_OFFERINGS_MANIFEST } from "@/lib/course-offerings/manifest";

test("manifest expected total rows equal 245", () => {
  assert.equal(COURSE_OFFERINGS_MANIFEST.expectedTotalRows, 245);
});

test("manifest counts by program match exact expectations", () => {
  const counts = COURSE_OFFERINGS_MANIFEST.countsByProgram;
  assert.equal(counts.BSAIS, 25);
  assert.equal(counts.BSMA, 24);
  assert.equal(counts.BEED, 24);
  assert.equal(counts.ENGLISH, 25);
  assert.equal(counts.FILIPINO, 25);
  assert.equal(counts.MATH, 25);
  assert.equal(counts.SS, 25);
  assert.equal(counts.CRIM, 16);
  assert.equal(counts.ACP, 28);
  assert.equal(counts.FSM, 28);
  const sum = Object.values(counts).reduce((a, b) => a + b, 0);
  assert.equal(sum, 245);
});

test("heading mappings map legacy variants correctly", () => {
  assert.equal(COURSE_OFFERINGS_MANIFEST.headingMappings.AIS, "BSAIS");
  assert.equal(COURSE_OFFERINGS_MANIFEST.headingMappings.MATHEMATICS, "MATH");
  assert.equal(COURSE_OFFERINGS_MANIFEST.headingMappings.CRIMINOLOGY, "CRIM");
});
