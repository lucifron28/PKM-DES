"use server";

import { revalidatePath } from "next/cache";
import { requireOfficialSignerRole } from "@/lib/auth/session";
import { isAccountingFeeCode } from "@/lib/finance/fee-codes";
import { parseMoneyInput } from "@/lib/finance/money";

export type AccountingActionState = {
  success: boolean;
  message: string;
};

const invalidState: AccountingActionState = {
  success: false,
  message: "Check the entered information and try again."
};

function text(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

function rpcOutcome(data: unknown) {
  const row = Array.isArray(data) ? data[0] : data;
  return row !== null && typeof row === "object" && !Array.isArray(row) && "outcome" in row
    ? String((row as { outcome: unknown }).outcome)
    : null;
}

function messageForOutcome(outcome: string | null, errorCode?: string): string {
  if (errorCode === "42501" || outcome === "unauthorized") return "Your active Accountant assignment does not allow this change.";
  if (outcome === "invalid_request") return "Check the entered amount and fee selection.";
  if (outcome === "not_found") return "The selected fee or enrollment could not be found.";
  if (outcome === "not_editable") return "Financial records can only be changed while an enrollment is pending.";
  if (outcome === "fee_unavailable") return "Choose only fees with an active configured amount.";
  if (outcome === "assessment_required") return "Record an assessment before adding a payment.";
  if (outcome === "invalid_amount") return "The assessed total is outside the supported amount range.";
  return "The accounting update could not be saved. Please refresh and try again.";
}

function revalidateFinanceViews(enrollmentId?: string) {
  revalidatePath("/admin/clearances/accounting");
  revalidatePath("/admin/enrollments");
  revalidatePath("/student/enrollment-status");
  if (!enrollmentId) return;
  revalidatePath(`/admin/clearances/accounting/${enrollmentId}`);
  revalidatePath(`/admin/enrollments/${enrollmentId}/registration`);
  revalidatePath(`/student/enrollments/${enrollmentId}/registration`);
}

export async function configureAccountingFeeAction(
  _previousState: AccountingActionState,
  formData: FormData
): Promise<AccountingActionState> {
  const feeCode = text(formData, "fee_code");
  const amountInput = text(formData, "amount");
  const active = formData.get("active") === "on";
  const amount = amountInput === "" ? null : parseMoneyInput(amountInput, true);
  if (!isAccountingFeeCode(feeCode) || (amountInput !== "" && amount === null) || (active && amount === null)) {
    return { ...invalidState, message: active ? "Enter a valid amount before activating this fee." : "Enter a nonnegative amount with up to two decimal places." };
  }

  const { supabase } = await requireOfficialSignerRole("ACCOUNTANT");
  const { data, error } = await supabase.rpc("accountant_configure_fee", {
    p_fee_code: feeCode,
    p_amount: amount,
    p_active: active
  });
  const outcome = rpcOutcome(data);
  if (error || outcome !== "updated") {
    console.error("accounting:configure_fee_failed", { code: error?.code, outcome });
    return { success: false, message: messageForOutcome(outcome, error?.code) };
  }

  revalidateFinanceViews();
  return { success: true, message: "Fee settings saved." };
}

export async function saveEnrollmentAssessmentAction(
  _previousState: AccountingActionState,
  formData: FormData
): Promise<AccountingActionState> {
  const enrollmentId = text(formData, "enrollment_id");
  const feeCodes = formData.getAll("fee_codes").map((value) => typeof value === "string" ? value.trim() : "");
  if (
    !isUuid(enrollmentId) ||
    feeCodes.length < 1 ||
    feeCodes.length > 16 ||
    feeCodes.some((code) => !isAccountingFeeCode(code)) ||
    new Set(feeCodes).size !== feeCodes.length
  ) {
    return { ...invalidState, message: "Select one or more unique active fees." };
  }

  const { supabase } = await requireOfficialSignerRole("ACCOUNTANT");
  const { data, error } = await supabase.rpc("accountant_save_enrollment_assessment", {
    p_enrollment_id: enrollmentId,
    p_fee_codes: feeCodes
  });
  const outcome = rpcOutcome(data);
  if (error || outcome !== "assessed") {
    console.error("accounting:save_assessment_failed", { code: error?.code, outcome });
    return { success: false, message: messageForOutcome(outcome, error?.code) };
  }

  revalidateFinanceViews(enrollmentId);
  return { success: true, message: "A new assessment version was recorded. The accounting clearance must be signed again." };
}

export async function recordEnrollmentPaymentAction(
  _previousState: AccountingActionState,
  formData: FormData
): Promise<AccountingActionState> {
  const enrollmentId = text(formData, "enrollment_id");
  const amount = parseMoneyInput(text(formData, "amount"), false);
  const reference = text(formData, "reference");
  if (!isUuid(enrollmentId) || amount === null || reference.length > 120) {
    return { ...invalidState, message: "Enter a valid positive payment amount and a reference up to 120 characters." };
  }

  const { supabase } = await requireOfficialSignerRole("ACCOUNTANT");
  const { data, error } = await supabase.rpc("accountant_record_enrollment_payment", {
    p_enrollment_id: enrollmentId,
    p_amount: amount,
    p_reference: reference || null
  });
  const outcome = rpcOutcome(data);
  if (error || outcome !== "recorded") {
    console.error("accounting:record_payment_failed", { code: error?.code, outcome });
    return { success: false, message: messageForOutcome(outcome, error?.code) };
  }

  revalidateFinanceViews(enrollmentId);
  return { success: true, message: "Payment recorded. The accounting clearance must be signed again." };
}
