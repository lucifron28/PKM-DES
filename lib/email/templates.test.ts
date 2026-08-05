import test from "node:test";
import assert from "node:assert/strict";
import { createEnrollmentDecisionEmail } from "./templates";

test("enrollment decision templates escape HTML-sensitive student and term values", () => {
  const email = createEnrollmentDecisionEmail({
    firstName: "<Student>",
    decision: "REJECTED",
    academicYear: "2026-2027",
    semester: "1st Semester",
    statusLink: "https://pkm-des.example.com/student/enrollment-status?next=<unsafe>"
  });

  assert.match(email.html, /Hello &lt;Student&gt;/);
  assert.match(email.html, /next=&lt;unsafe&gt;/);
  assert.doesNotMatch(email.html, /Hello <Student>/);
  assert.match(email.text, /Hello <Student>/);
});
