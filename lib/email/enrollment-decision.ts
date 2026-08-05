import "server-only";

import React from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { EnrollmentDecisionEmail, getAppBaseUrl, getEmailAdapter, getEmailEnv } from "@/lib/email";
import type { EmailAdapter } from "@/lib/email";
import type { EnrollmentReviewDecision } from "@/lib/enrollment/admin-review";

export type EnrollmentDecisionEmailDelivery = "sent" | "not_configured" | "failed";

export type EnrollmentDecisionEmailOptions = {
  adapter?: EmailAdapter;
  appBaseUrl?: string;
};

type EnrollmentNotificationProfile = {
  first_name: string | null;
  email: string | null;
};

type EnrollmentNotificationStudent = {
  profiles: EnrollmentNotificationProfile | EnrollmentNotificationProfile[] | null;
};

type EnrollmentNotificationRow = {
  academic_year: string;
  semester: string;
  students: EnrollmentNotificationStudent | EnrollmentNotificationStudent[] | null;
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function firstRelation<T>(relation: T | T[] | null | undefined): T | null {
  return Array.isArray(relation) ? relation[0] ?? null : relation ?? null;
}

export function getEnrollmentDecisionEmailSubject(decision: EnrollmentReviewDecision) {
  return decision === "APPROVED"
    ? "PKM-DES Enrollment Request Approved"
    : "PKM-DES Enrollment Request Update";
}

function logDeliveryFailure(stage: string) {
  console.error(`enrollment_email:${stage}`);
}

export async function sendEnrollmentDecisionEmailService(
  admin: SupabaseClient,
  enrollmentId: string,
  decision: EnrollmentReviewDecision,
  options: EnrollmentDecisionEmailOptions = {}
): Promise<EnrollmentDecisionEmailDelivery> {
  const environment = getEmailEnv();

  if (!environment.enabled || !environment.apiKey || !environment.fromAddress) {
    logDeliveryFailure("not_configured");
    return "not_configured";
  }

  let appBaseUrl: string;
  try {
    appBaseUrl = options.appBaseUrl ?? getAppBaseUrl();
  } catch {
    logDeliveryFailure("configuration");
    return "failed";
  }

  const { data, error } = await admin
    .from("enrollments")
    .select("academic_year, semester, students(profiles(first_name, email))")
    .eq("id", enrollmentId)
    .maybeSingle();

  if (error || !data) {
    logDeliveryFailure("recipient_lookup");
    return "failed";
  }

  const enrollment = data as EnrollmentNotificationRow;
  const student = firstRelation(enrollment.students);
  const profile = firstRelation(student?.profiles);
  const recipient = profile?.email?.trim() ?? "";

  if (!recipient || !EMAIL_PATTERN.test(recipient)) {
    logDeliveryFailure("recipient_invalid");
    return "failed";
  }

  const firstName = profile?.first_name?.trim() || "Student";
  const statusLink = new URL("/student/enrollment-status", appBaseUrl).toString();
  const emailAdapter = options.adapter ?? getEmailAdapter();

  try {
    await emailAdapter.send({
      to: recipient,
      subject: getEnrollmentDecisionEmailSubject(decision),
      react: React.createElement(EnrollmentDecisionEmail, {
        firstName,
        decision,
        academicYear: enrollment.academic_year,
        semester: enrollment.semester,
        statusLink
      })
    });
  } catch {
    logDeliveryFailure("provider");
    return "failed";
  }

  return "sent";
}
