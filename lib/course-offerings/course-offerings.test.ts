import assert from "node:assert/strict";
import test from "node:test";
import { COURSE_OFFERINGS_MANIFEST } from "@/lib/course-offerings/manifest";

test("course offerings manifest maps heading aliases to canonical program codes", () => {
  const mappings = COURSE_OFFERINGS_MANIFEST.headingMappings;
  assert.equal(mappings.AIS, "BSAIS");
  assert.equal(mappings.BSAIS, "BSAIS");
  assert.equal(mappings.CRIMINOLOGY, "CRIM");
  assert.equal(mappings.MATHEMATICS, "MATH");
  assert.equal(mappings["SOCIAL STUDIES"], "SS");
});

test("course offerings manifest specifies academic year and semester constraints for workbook data", () => {
  assert.equal(COURSE_OFFERINGS_MANIFEST.academicYear, "2025-2026");
  assert.equal(COURSE_OFFERINGS_MANIFEST.semester, "2nd Semester");
  assert.equal(typeof COURSE_OFFERINGS_MANIFEST.workbookSha256, "string");
  assert.equal(COURSE_OFFERINGS_MANIFEST.workbookSha256.length, 64);
});

test("manifest counts by program sum to total expected course offerings", () => {
  const counts = COURSE_OFFERINGS_MANIFEST.countsByProgram;
  const totalCalculated = Object.values(counts).reduce((sum, n) => sum + n, 0);
  assert.equal(totalCalculated, COURSE_OFFERINGS_MANIFEST.expectedTotalRows);
});
