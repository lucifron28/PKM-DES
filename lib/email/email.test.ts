import test from "node:test";
import assert from "node:assert/strict";
import { maskRecipientEmail } from "./recipient-mask";

test("recipient masking does not expose the full email address", () => {
  const masked = maskRecipientEmail("student@example.com");

  assert.equal(masked, "s******@example.com");
  assert.doesNotMatch(masked, /student@example\.com/);
  assert.equal(maskRecipientEmail("invalid"), "masked-recipient");
});
