import test from "node:test";
import assert from "node:assert/strict";
import { maskRecipientEmail } from "./recipient-mask";
import { sendEnrollmentDecisionEmailService, type EnrollmentDecisionNotificationStore, type EnrollmentNotificationReservation } from "./enrollment-decision";
import type { SupabaseClient } from "@supabase/supabase-js";

const baseReservation: EnrollmentNotificationReservation = {
  outcome: "reserved",
  notification_id: "notification-1",
  enrollment_id: "enrollment-1",
  decision: "APPROVED",
  recipient_email: "maria@example.com",
  first_name: "Maria",
  academic_year: "2025-2026",
  semester: "2nd Semester",
  reservation_token: "reservation-1"
};

function fakeStore(
  reservation: EnrollmentNotificationReservation = baseReservation,
  markSentOutcome = "sent"
) {
  const calls = { reserve: 0, sent: 0, failed: [] as string[] };
  const store: EnrollmentDecisionNotificationStore = {
    async reserve() {
      calls.reserve += 1;
      return reservation;
    },
    async markSent() {
      calls.sent += 1;
      return markSentOutcome;
    },
    async markFailed(_notificationId, _token, code) {
      calls.failed.push(code);
      return "failed";
    }
  };
  return { store, calls };
}

const fakeAdmin = {} as SupabaseClient;

function withDeliveryEnvironment(callback: () => Promise<void>) {
  const previous = {
    enabled: process.env.EMAIL_DELIVERY_ENABLED,
    gmailUser: process.env.GMAIL_SMTP_USER,
    gmailAppPassword: process.env.GMAIL_SMTP_APP_PASSWORD,
    from: process.env.EMAIL_FROM,
    baseUrl: process.env.APP_BASE_URL
  };

  process.env.EMAIL_DELIVERY_ENABLED = "true";
  process.env.GMAIL_SMTP_USER = "registrar@example.com";
  process.env.GMAIL_SMTP_APP_PASSWORD = "test-app-password";
  process.env.EMAIL_FROM = "noreply@example.com";
  process.env.APP_BASE_URL = "https://pkm-des.example.com";

  return callback().finally(() => {
    if (previous.enabled === undefined) delete process.env.EMAIL_DELIVERY_ENABLED;
    else process.env.EMAIL_DELIVERY_ENABLED = previous.enabled;
    if (previous.gmailUser === undefined) delete process.env.GMAIL_SMTP_USER;
    else process.env.GMAIL_SMTP_USER = previous.gmailUser;
    if (previous.gmailAppPassword === undefined) delete process.env.GMAIL_SMTP_APP_PASSWORD;
    else process.env.GMAIL_SMTP_APP_PASSWORD = previous.gmailAppPassword;
    if (previous.from === undefined) delete process.env.EMAIL_FROM;
    else process.env.EMAIL_FROM = previous.from;
    if (previous.baseUrl === undefined) delete process.env.APP_BASE_URL;
    else process.env.APP_BASE_URL = previous.baseUrl;
  });
}

test("recipient masking does not expose the full email address", () => {
  const masked = maskRecipientEmail("student@example.com");

  assert.equal(masked, "s******@example.com");
  assert.doesNotMatch(masked, /student@example\.com/);
  assert.equal(maskRecipientEmail("invalid"), "masked-recipient");
});

test("enrollment decision notification sends an approval message without exposing remarks", async () => {
  await withDeliveryEnvironment(async () => {
    const sent: Array<{ to: string; subject: string; html: string; text: string }> = [];
    const { store, calls } = fakeStore();
    const result = await sendEnrollmentDecisionEmailService(fakeAdmin, "enrollment-1", "APPROVED", {
      store,
      adapter: { async send(options) { sent.push(options); } }
    });

    assert.equal(result, "sent");
    assert.equal(calls.reserve, 1);
    assert.equal(calls.sent, 1);
    assert.deepEqual(calls.failed, []);
    assert.equal(sent.length, 1);
    assert.equal(sent[0].to, "maria@example.com");
    assert.equal(sent[0].subject, "PKM-DES Enrollment Request Approved");
    assert.match(sent[0].html, /has been approved by the Registrar\./);
    assert.match(sent[0].html, /https:\/\/pkm-des\.example\.com\/student\/enrollment-status/);
    assert.doesNotMatch(`${sent[0].html} ${sent[0].text}`, /specific internal rejection reason/i);
  });
});

test("enrollment decision notification sends a rejection message without exposing remarks", async () => {
  await withDeliveryEnvironment(async () => {
    const sent: Array<{ subject: string; html: string; text: string }> = [];
    const { store } = fakeStore({ ...baseReservation, decision: "REJECTED" });
    const result = await sendEnrollmentDecisionEmailService(fakeAdmin, "enrollment-1", "REJECTED", {
      store,
      adapter: { async send(options) { sent.push(options); } }
    });

    assert.equal(result, "sent");
    assert.equal(sent.length, 1);
    assert.equal(sent[0].subject, "PKM-DES Enrollment Request Update");
    assert.match(sent[0].html, /has been rejected by the Registrar\./);
    assert.doesNotMatch(`${sent[0].html} ${sent[0].text}`, /specific internal rejection reason/i);
  });
});

test("unconfigured delivery records a retryable failure without sending", async () => {
  const previous = {
    enabled: process.env.EMAIL_DELIVERY_ENABLED,
    gmailUser: process.env.GMAIL_SMTP_USER,
    gmailAppPassword: process.env.GMAIL_SMTP_APP_PASSWORD,
    from: process.env.EMAIL_FROM,
    baseUrl: process.env.APP_BASE_URL
  };
  delete process.env.EMAIL_DELIVERY_ENABLED;
  delete process.env.GMAIL_SMTP_USER;
  delete process.env.GMAIL_SMTP_APP_PASSWORD;
  delete process.env.EMAIL_FROM;
  delete process.env.APP_BASE_URL;

  const { store, calls } = fakeStore();
  let sent = false;
  const result = await sendEnrollmentDecisionEmailService(fakeAdmin, "enrollment-1", "APPROVED", {
    store,
    adapter: { async send() { sent = true; } }
  });

  assert.equal(result, "not_configured");
  assert.equal(sent, false);
  assert.deepEqual(calls.failed, ["not_configured"]);

  if (previous.enabled === undefined) delete process.env.EMAIL_DELIVERY_ENABLED;
  else process.env.EMAIL_DELIVERY_ENABLED = previous.enabled;
  if (previous.gmailUser === undefined) delete process.env.GMAIL_SMTP_USER;
  else process.env.GMAIL_SMTP_USER = previous.gmailUser;
  if (previous.gmailAppPassword === undefined) delete process.env.GMAIL_SMTP_APP_PASSWORD;
  else process.env.GMAIL_SMTP_APP_PASSWORD = previous.gmailAppPassword;
  if (previous.from === undefined) delete process.env.EMAIL_FROM;
  else process.env.EMAIL_FROM = previous.from;
  if (previous.baseUrl === undefined) delete process.env.APP_BASE_URL;
  else process.env.APP_BASE_URL = previous.baseUrl;
});

test("provider failure records a retryable failure without changing the decision", async () => {
  await withDeliveryEnvironment(async () => {
    const { store, calls } = fakeStore();
    const logs: string[] = [];
    const previousError = console.error;
    console.error = (...args: unknown[]) => logs.push(args.map(String).join(" "));
    let result: string;
    try {
      result = await sendEnrollmentDecisionEmailService(fakeAdmin, "enrollment-1", "REJECTED", {
        store,
        adapter: { async send() { throw new Error("provider unavailable"); } }
      });
    } finally {
      console.error = previousError;
    }

    assert.equal(result, "failed");
    assert.deepEqual(calls.failed, ["provider"]);
    assert.equal(calls.sent, 0);
    assert.deepEqual(logs, ["enrollment_email:provider"]);
    assert.doesNotMatch(logs.join(" "), /remarks?|maria@example\.com|enrollment-1/i);
  });
});

test("invalid recipients are rejected before the provider is called", async () => {
  await withDeliveryEnvironment(async () => {
    const { store, calls } = fakeStore({ ...baseReservation, recipient_email: "invalid recipient" });
    let sent = false;
    const result = await sendEnrollmentDecisionEmailService(fakeAdmin, "enrollment-1", "APPROVED", {
      store,
      adapter: { async send() { sent = true; } }
    });

    assert.equal(result, "failed");
    assert.equal(sent, false);
    assert.deepEqual(calls.failed, ["invalid_recipient"]);
  });
});

test("invalid application URLs are rejected before the provider is called", async () => {
  await withDeliveryEnvironment(async () => {
    const { store, calls } = fakeStore();
    let sent = false;
    const result = await sendEnrollmentDecisionEmailService(fakeAdmin, "enrollment-1", "APPROVED", {
      store,
      appBaseUrl: "not-a-url",
      adapter: { async send() { sent = true; } }
    });

    assert.equal(result, "failed");
    assert.equal(sent, false);
    assert.deepEqual(calls.failed, ["invalid_base_url"]);
  });
});
