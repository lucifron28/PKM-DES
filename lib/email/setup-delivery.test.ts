import test from "node:test";
import assert from "node:assert/strict";
import { isSetupEmailResendAllowed, SETUP_EMAIL_RESEND_COOLDOWN_MS } from "./setup-delivery";

test("setup email resend cooldown accepts first sends and rejects recent requests", () => {
  const now = new Date("2026-07-29T08:00:00.000Z");

  assert.equal(isSetupEmailResendAllowed(null, now), true);
  assert.equal(isSetupEmailResendAllowed(new Date(now.getTime() - SETUP_EMAIL_RESEND_COOLDOWN_MS).toISOString(), now), true);
  assert.equal(isSetupEmailResendAllowed(new Date(now.getTime() - 1).toISOString(), now), false);
  assert.equal(isSetupEmailResendAllowed("not-a-timestamp", now), false);
});

test("failed email provider delivery permits safe retry when timestamp is cleared", () => {
  const now = new Date("2026-07-29T08:00:00.000Z");
  let sentAtTimestamp: string | null = now.toISOString();

  // Failed send releases reservation by clearing timestamp
  sentAtTimestamp = null;
  assert.equal(isSetupEmailResendAllowed(sentAtTimestamp, now), true);
});
