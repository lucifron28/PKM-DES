import assert from "node:assert/strict";
import test from "node:test";
import { requiresRegistrarAssignedLoad } from "@/lib/enrollment/registrar-load";
import type { CourseOffering, StandardLoadSet, StudentType } from "@/types/database";

const activeLoad = {
  status: "ACTIVE",
  expected_course_count: 2,
  expected_total_units: 6
} satisfies Pick<StandardLoadSet, "status" | "expected_course_count" | "expected_total_units">;

const matchingOfferings = [
  { units: 3 },
  { units: 3 }
] satisfies Pick<CourseOffering, "units">[];

test("a standard student with no year-level load needs Registrar assignment", () => {
  assert.equal(
    requiresRegistrarAssignedLoad("Regular Student", null, []),
    true
  );
});

test("a standard student with an incomplete configured load needs Registrar assignment", () => {
  assert.equal(
    requiresRegistrarAssignedLoad("Continuing Student", activeLoad, [{ units: 3 }]),
    true
  );
});

test("a complete configured standard load stays on the normal student submission path", () => {
  assert.equal(
    requiresRegistrarAssignedLoad("Regular Student", activeLoad, matchingOfferings),
    false
  );
});

for (const studentType of ["Transferee", "Irregular Student"] as StudentType[]) {
  test(`${studentType} continues to use Registrar assignment`, () => {
    assert.equal(requiresRegistrarAssignedLoad(studentType, activeLoad, matchingOfferings), true);
  });
}

test("a CRIM third-year standard student with no configured load needs Registrar assignment", () => {
  assert.equal(
    requiresRegistrarAssignedLoad("Old Student", null, []),
    true
  );
});
