import test from "node:test";
import assert from "node:assert/strict";
import {
  processEnrollmentDecisionNotification,
  processEnrollmentReviewNotification,
  type EnrollmentDecisionNotificationStore,
  type EnrollmentNotificationReservation
} from "./enrollment-decision";
import type { SupabaseClient } from "@supabase/supabase-js";

const admin = {} as SupabaseClient;
const reservation: EnrollmentNotificationReservation = {
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

function withEnvironment(callback: () => Promise<void>) {
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
    for (const [key, value] of Object.entries({
      EMAIL_DELIVERY_ENABLED: previous.enabled,
      GMAIL_SMTP_USER: previous.gmailUser,
      GMAIL_SMTP_APP_PASSWORD: previous.gmailAppPassword,
      EMAIL_FROM: previous.from,
      APP_BASE_URL: previous.baseUrl
    })) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });
}

test("failed and already-reviewed outcomes do not reserve or send email", async () => {
  const calls = { reserve: 0 };
  const store: EnrollmentDecisionNotificationStore = {
    async reserve() {
      calls.reserve += 1;
      return reservation;
    },
    async markSent() { return "sent"; },
    async markFailed() { return "failed"; }
  };

  const failedReview = await processEnrollmentReviewNotification("review_failed", admin, "enrollment-1", "APPROVED", { store });
  const alreadyReviewed = await processEnrollmentReviewNotification("already_reviewed", admin, "enrollment-1", "APPROVED", { store });

  assert.equal(failedReview, "not_sent");
  assert.equal(alreadyReviewed, "not_sent");
  assert.equal(calls.reserve, 0);
});

test("concurrent review notification processing sends at most once", async () => {
  await withEnvironment(async () => {
    let reservations = 0;
    let sends = 0;
    const store: EnrollmentDecisionNotificationStore = {
      async reserve() {
        reservations += 1;
        return reservations === 1 ? reservation : { ...reservation, outcome: "in_progress", notification_id: null, reservation_token: null };
      },
      async markSent() {
        sends += 1;
        return "sent";
      },
      async markFailed() { return "failed"; }
    };

    const results = await Promise.all([
      processEnrollmentDecisionNotification(store, "enrollment-1", "APPROVED", { adapter: { async send() {} } }),
      processEnrollmentDecisionNotification(store, "enrollment-1", "APPROVED", { adapter: { async send() {} } })
    ]);

    assert.deepEqual(results.sort(), ["failed", "sent"]);
    assert.equal(sends, 1);
  });
});

test("a failed delivery can be retried once without changing the decision", async () => {
  await withEnvironment(async () => {
    let status: "FAILED" | "SENDING" | "SENT" = "FAILED";
    let providerAttempts = 0;
    const store: EnrollmentDecisionNotificationStore = {
      async reserve() {
        if (status === "SENT") return { ...reservation, outcome: "already_sent" };
        if (status === "SENDING") return { ...reservation, outcome: "in_progress", notification_id: null, reservation_token: null };
        status = "SENDING";
        return reservation;
      },
      async markSent() {
        status = "SENT";
        return "sent";
      },
      async markFailed() {
        status = "FAILED";
        return "failed";
      }
    };

    const first = await processEnrollmentDecisionNotification(store, "enrollment-1", "APPROVED", {
      adapter: {
        async send() {
          providerAttempts += 1;
          throw new Error("temporary provider failure");
        }
      }
    });
    const retry = await processEnrollmentDecisionNotification(store, "enrollment-1", "APPROVED", {
      adapter: {
        async send() {
          providerAttempts += 1;
        }
      }
    });

    assert.equal(first, "failed");
    assert.equal(retry, "sent");
    assert.equal(providerAttempts, 2);
    assert.equal(status, "SENT");
  });
});
