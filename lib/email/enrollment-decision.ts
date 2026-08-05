import "server-only";

import React from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { EnrollmentDecisionEmail } from "./templates";
import { getAppBaseUrl, getEmailAdapter, getEmailEnv } from "./index";
import type { EmailAdapter } from "./index";
import type { EnrollmentReviewDecision } from "@/lib/enrollment/admin-review";

export type EnrollmentDecisionEmailDelivery = "sent" | "not_configured" | "failed";

export type EnrollmentDecisionEmailOptions = {
  adapter?: EmailAdapter;
  appBaseUrl?: string;
  store?: EnrollmentDecisionNotificationStore;
  environment?: ReturnType<typeof getEmailEnv>;
};

export type EnrollmentNotificationReservation = {
  outcome: string;
  notification_id: string | null;
  enrollment_id: string | null;
  decision: EnrollmentReviewDecision | null;
  recipient_email: string | null;
  first_name: string | null;
  academic_year: string | null;
  semester: string | null;
  reservation_token: string | null;
};

export type EnrollmentDecisionNotificationStore = {
  reserve: (
    enrollmentId: string,
    decision: EnrollmentReviewDecision
  ) => Promise<EnrollmentNotificationReservation>;
  markSent: (notificationId: string, reservationToken: string) => Promise<string>;
  markFailed: (notificationId: string, reservationToken: string, errorCode: string) => Promise<string>;
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function firstRpcRow<T>(data: T | T[] | null): T | null {
  return Array.isArray(data) ? data[0] ?? null : data;
}

function logDeliveryFailure(stage: string) {
  console.error(`enrollment_email:${stage}`);
}

function normalizeAppBaseUrl(value: string) {
  const parsed = new URL(value);
  if (!["http:", "https:"].includes(parsed.protocol) || parsed.username || parsed.password) {
    throw new Error("app_base_url_invalid");
  }
  return parsed.origin;
}

export function getEnrollmentDecisionEmailSubject(decision: EnrollmentReviewDecision) {
  return decision === "APPROVED"
    ? "PKM-DES Enrollment Request Approved"
    : "PKM-DES Enrollment Request Update";
}

export function createEnrollmentDecisionNotificationStore(
  admin: SupabaseClient
): EnrollmentDecisionNotificationStore {
  return {
    async reserve(enrollmentId, decision) {
      const { data, error } = await admin.rpc("reserve_enrollment_decision_notification", {
        p_enrollment_id: enrollmentId,
        p_decision: decision
      });

      if (error) throw new Error("notification_reservation_failed");
      const result = firstRpcRow(data as EnrollmentNotificationReservation[] | EnrollmentNotificationReservation | null);
      if (!result) throw new Error("notification_reservation_empty");
      return result;
    },
    async markSent(notificationId, reservationToken) {
      const { data, error } = await admin.rpc("mark_enrollment_decision_notification_sent", {
        p_notification_id: notificationId,
        p_reservation_token: reservationToken
      });

      if (error) throw new Error("notification_sent_update_failed");
      return String(firstRpcRow<{ outcome?: string }>(data as { outcome?: string }[] | { outcome?: string } | null)?.outcome ?? "");
    },
    async markFailed(notificationId, reservationToken, errorCode) {
      const { data, error } = await admin.rpc("mark_enrollment_decision_notification_failed", {
        p_notification_id: notificationId,
        p_reservation_token: reservationToken,
        p_error_code: errorCode
      });

      if (error) throw new Error("notification_failed_update_failed");
      return String(firstRpcRow<{ outcome?: string }>(data as { outcome?: string }[] | { outcome?: string } | null)?.outcome ?? "");
    }
  };
}

async function recordFailure(
  store: EnrollmentDecisionNotificationStore,
  reservation: EnrollmentNotificationReservation,
  errorCode: string
) {
  if (!reservation.notification_id || !reservation.reservation_token) {
    logDeliveryFailure("failure_reservation_missing");
    return;
  }

  try {
    await store.markFailed(reservation.notification_id, reservation.reservation_token, errorCode);
  } catch {
    logDeliveryFailure("failure_record");
  }
}

export async function processEnrollmentDecisionNotification(
  store: EnrollmentDecisionNotificationStore,
  enrollmentId: string,
  decision: EnrollmentReviewDecision,
  options: Omit<EnrollmentDecisionEmailOptions, "store"> = {}
): Promise<EnrollmentDecisionEmailDelivery> {
  let reservation: EnrollmentNotificationReservation;

  try {
    reservation = await store.reserve(enrollmentId, decision);
  } catch {
    logDeliveryFailure("reservation");
    return "failed";
  }

  if (reservation.outcome === "already_sent") return "sent";
  if (reservation.outcome !== "reserved") {
    logDeliveryFailure("reservation_unavailable");
    return "failed";
  }

  const environment = options.environment ?? getEmailEnv();
  if (!environment.enabled || !environment.apiKey || !environment.fromAddress) {
    await recordFailure(store, reservation, "not_configured");
    logDeliveryFailure("not_configured");
    return "not_configured";
  }

  let appBaseUrl: string;
  try {
    appBaseUrl = options.appBaseUrl ? normalizeAppBaseUrl(options.appBaseUrl) : getAppBaseUrl();
  } catch {
    await recordFailure(store, reservation, "invalid_base_url");
    logDeliveryFailure("configuration");
    return "failed";
  }

  const recipient = reservation.recipient_email?.trim() ?? "";
  if (!recipient || !EMAIL_PATTERN.test(recipient)) {
    await recordFailure(store, reservation, "invalid_recipient");
    logDeliveryFailure("recipient_invalid");
    return "failed";
  }

  if (
    !reservation.notification_id ||
    !reservation.reservation_token ||
    !reservation.academic_year ||
    !reservation.semester ||
    !reservation.decision
  ) {
    await recordFailure(store, reservation, "reservation");
    logDeliveryFailure("reservation_invalid");
    return "failed";
  }

  const statusLink = new URL("/student/enrollment-status", appBaseUrl).toString();
  const emailAdapter = options.adapter ?? getEmailAdapter();

  try {
    await emailAdapter.send({
      to: recipient,
      subject: getEnrollmentDecisionEmailSubject(reservation.decision),
      react: React.createElement(EnrollmentDecisionEmail, {
        firstName: reservation.first_name?.trim() || "Student",
        decision: reservation.decision,
        academicYear: reservation.academic_year,
        semester: reservation.semester,
        statusLink
      })
    });
  } catch {
    await recordFailure(store, reservation, "provider");
    logDeliveryFailure("provider");
    return "failed";
  }

  try {
    const result = await store.markSent(reservation.notification_id, reservation.reservation_token);
    if (result !== "sent" && result !== "already_sent") {
      await recordFailure(store, reservation, "delivery_commit");
      logDeliveryFailure("delivery_commit");
      return "failed";
    }
  } catch {
    await recordFailure(store, reservation, "delivery_commit");
    logDeliveryFailure("delivery_commit");
    return "failed";
  }

  return "sent";
}

export async function sendEnrollmentDecisionEmailService(
  admin: SupabaseClient,
  enrollmentId: string,
  decision: EnrollmentReviewDecision,
  options: EnrollmentDecisionEmailOptions = {}
): Promise<EnrollmentDecisionEmailDelivery> {
  const store = options.store ?? createEnrollmentDecisionNotificationStore(admin);
  return processEnrollmentDecisionNotification(store, enrollmentId, decision, options);
}

export async function processEnrollmentReviewNotification(
  reviewOutcome: string,
  admin: SupabaseClient,
  enrollmentId: string,
  decision: EnrollmentReviewDecision,
  options: EnrollmentDecisionEmailOptions = {}
): Promise<"not_sent" | EnrollmentDecisionEmailDelivery> {
  if (reviewOutcome !== "approved" && reviewOutcome !== "rejected") {
    return "not_sent";
  }

  return sendEnrollmentDecisionEmailService(admin, enrollmentId, decision, options);
}
