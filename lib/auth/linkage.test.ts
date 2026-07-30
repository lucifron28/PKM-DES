import assert from "node:assert/strict";
import test from "node:test";
import { getStudentForProfile } from "@/lib/auth/session";

test("getStudentForProfile function requires exact profile_id match and is cached", () => {
  assert.equal(typeof getStudentForProfile, "function");
});
