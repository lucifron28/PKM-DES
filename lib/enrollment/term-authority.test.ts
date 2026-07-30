import assert from "node:assert/strict";
import test from "node:test";
import { getStudentSubmissionMessage } from "@/lib/enrollment/student-submission";

test("term_unavailable maps to clear unavailable message", () => {
  assert.match(
    getStudentSubmissionMessage("term_unavailable"),
    /No active enrollment term is currently configured/
  );
});

test("term_not_open maps to clear closed message", () => {
  assert.match(
    getStudentSubmissionMessage("term_not_open"),
    /Online enrollment is not available for the configured academic term/
  );
});
