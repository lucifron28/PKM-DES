import test from "node:test";
import assert from "node:assert/strict";
import { maskRecipientEmail } from "./recipient-mask";
import { sendEnrollmentDecisionEmailService } from "./enrollment-decision";
import type { SupabaseClient } from "@supabase/supabase-js";

test("recipient masking does not expose the full email address", () => {
  const masked = maskRecipientEmail("student@example.com");

  assert.equal(masked, "s******@example.com");
  assert.doesNotMatch(masked, /student@example\.com/);
  assert.equal(maskRecipientEmail("invalid"), "masked-recipient");
});

function fakeAdmin(row: unknown, error: unknown = null) {
  return {
    from() {
      return {
        select() {
          return {
            eq() {
              return {
                async maybeSingle() {
                  return { data: row, error };
                }
              };
            }
          };
        }
      };
    }
  } as unknown as SupabaseClient;
}

function withDeliveryEnvironment(callback: () => Promise<void>) {
  const previous = {
    enabled: process.env.EMAIL_DELIVERY_ENABLED,
    apiKey: process.env.RESEND_API_KEY,
    from: process.env.EMAIL_FROM,
    baseUrl: process.env.APP_BASE_URL
  };

  process.env.EMAIL_DELIVERY_ENABLED = "true";
  process.env.RESEND_API_KEY = "test-key";
  process.env.EMAIL_FROM = "noreply@example.com";
  process.env.APP_BASE_URL = "https://pkm-des.example.com";

  return callback().finally(() => {
    if (previous.enabled === undefined) delete process.env.EMAIL_DELIVERY_ENABLED;
    else process.env.EMAIL_DELIVERY_ENABLED = previous.enabled;
    if (previous.apiKey === undefined) delete process.env.RESEND_API_KEY;
    else process.env.RESEND_API_KEY = previous.apiKey;
    if (previous.from === undefined) delete process.env.EMAIL_FROM;
    else process.env.EMAIL_FROM = previous.from;
    if (previous.baseUrl === undefined) delete process.env.APP_BASE_URL;
    else process.env.APP_BASE_URL = previous.baseUrl;
  });
}

test("enrollment decision notification sends an approval message without exposing remarks", async () => {
  await withDeliveryEnvironment(async () => {
    const sent: Array<{ to: string; subject: string; react: unknown }> = [];
    const result = await sendEnrollmentDecisionEmailService(
      fakeAdmin({
        academic_year: "2025-2026",
        semester: "2nd Semester",
        students: { profiles: { first_name: "Maria", email: "maria@example.com" } }
      }),
      "enrollment-id",
      "APPROVED",
      {
        adapter: {
          async send(options) {
            sent.push(options);
          }
        }
      }
    );

    assert.equal(result, "sent");
    assert.equal(sent.length, 1);
    assert.equal(sent[0].to, "maria@example.com");
    assert.equal(sent[0].subject, "PKM-DES Enrollment Request Approved");
    assert.equal((sent[0].react as { props: Record<string, unknown> }).props.decision, "APPROVED");
    assert.equal((sent[0].react as { props: Record<string, unknown> }).props.remarks, undefined);
  });
});

test("enrollment decision notification sends a rejection message without exposing remarks", async () => {
  await withDeliveryEnvironment(async () => {
    const sent: Array<{ subject: string; react: unknown }> = [];
    const result = await sendEnrollmentDecisionEmailService(
      fakeAdmin({
        academic_year: "2025-2026",
        semester: "2nd Semester",
        students: { profiles: { first_name: "Maria", email: "maria@example.com" } }
      }),
      "enrollment-id",
      "REJECTED",
      {
        adapter: {
          async send(options) {
            sent.push(options);
          }
        }
      }
    );

    assert.equal(result, "sent");
    assert.equal(sent.length, 1);
    assert.equal(sent[0].subject, "PKM-DES Enrollment Request Update");
    assert.equal((sent[0].react as { props: Record<string, unknown> }).props.decision, "REJECTED");
    assert.equal((sent[0].react as { props: Record<string, unknown> }).props.remarks, undefined);
  });
});

test("enrollment decision notification reports unavailable delivery without using the mock adapter", async () => {
  const previousEnabled = process.env.EMAIL_DELIVERY_ENABLED;
  const previousApiKey = process.env.RESEND_API_KEY;
  const previousFrom = process.env.EMAIL_FROM;
  const previousBaseUrl = process.env.APP_BASE_URL;
  delete process.env.EMAIL_DELIVERY_ENABLED;
  delete process.env.RESEND_API_KEY;
  delete process.env.EMAIL_FROM;
  delete process.env.APP_BASE_URL;

  let called = false;
  const result = await sendEnrollmentDecisionEmailService(
    fakeAdmin(null),
    "enrollment-id",
    "REJECTED",
    {
      adapter: {
        async send() {
          called = true;
        }
      }
    }
  );

  assert.equal(result, "not_configured");
  assert.equal(called, false);

  if (previousEnabled === undefined) delete process.env.EMAIL_DELIVERY_ENABLED;
  else process.env.EMAIL_DELIVERY_ENABLED = previousEnabled;
  if (previousApiKey === undefined) delete process.env.RESEND_API_KEY;
  else process.env.RESEND_API_KEY = previousApiKey;
  if (previousFrom === undefined) delete process.env.EMAIL_FROM;
  else process.env.EMAIL_FROM = previousFrom;
  if (previousBaseUrl === undefined) delete process.env.APP_BASE_URL;
  else process.env.APP_BASE_URL = previousBaseUrl;
});

test("enrollment decision notification reports provider failure without changing the decision", async () => {
  await withDeliveryEnvironment(async () => {
    const result = await sendEnrollmentDecisionEmailService(
      fakeAdmin({
        academic_year: "2025-2026",
        semester: "2nd Semester",
        students: { profiles: { first_name: "Maria", email: "maria@example.com" } }
      }),
      "enrollment-id",
      "REJECTED",
      {
        adapter: {
          async send() {
            throw new Error("provider unavailable");
          }
        }
      }
    );

    assert.equal(result, "failed");
  });
});
