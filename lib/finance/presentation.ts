import type { EnrollmentFinancialSummary } from "@/types/database";
import { parseMoneyInput } from "./money";

const PAYMENT_STATUSES = new Set<EnrollmentFinancialSummary["payment_status"]>([
  "UNASSESSED",
  "UNPAID",
  "PARTIAL",
  "PAID"
]);

function record(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function money(value: unknown): number | null {
  if (typeof value !== "number" && typeof value !== "string") return null;
  return parseMoneyInput(String(value), true);
}

function nullableMoney(value: unknown): number | null | undefined {
  return value === null ? null : money(value) ?? undefined;
}

export function parseEnrollmentFinancialSummary(value: unknown): EnrollmentFinancialSummary | null {
  const summary = record(value);
  if (!summary || summary.currency_code !== "PHP" || typeof summary.payment_status !== "string" || !PAYMENT_STATUSES.has(summary.payment_status as EnrollmentFinancialSummary["payment_status"])) {
    return null;
  }

  const assessedAmount = nullableMoney(summary.assessed_amount);
  const paidAmount = nullableMoney(summary.paid_amount);
  const balanceDue = nullableMoney(summary.balance_due);
  if (assessedAmount === undefined || paidAmount === undefined || balanceDue === undefined) return null;

  let feeItems: EnrollmentFinancialSummary["fee_items"] = null;
  if (summary.fee_items !== null) {
    if (!Array.isArray(summary.fee_items)) return null;
    feeItems = [];
    for (const rawItem of summary.fee_items) {
      const item = record(rawItem);
      const amount = money(item?.amount);
      if (!item || typeof item.fee_code !== "string" || !item.fee_code || typeof item.fee_name !== "string" || amount === null) {
        return null;
      }
      feeItems.push({ fee_code: item.fee_code, fee_name: item.fee_name, amount });
    }
  }

  const version = summary.assessment_version;
  const assessmentVersion = version === null
    ? null
    : typeof version === "string" || typeof version === "number"
      ? String(version)
      : undefined;
  if (assessmentVersion === undefined) return null;

  if (!Array.isArray(summary.payment_receipts)) return null;
  const paymentReceipts: EnrollmentFinancialSummary["payment_receipts"] = [];
  for (const rawReceipt of summary.payment_receipts) {
    const receipt = record(rawReceipt);
    const amount = money(receipt?.amount);
    if (
      !receipt ||
      typeof receipt.payment_id !== "string" || !receipt.payment_id ||
      amount === null ||
      typeof receipt.paid_at !== "string" || !Number.isFinite(Date.parse(receipt.paid_at)) ||
      (receipt.reference !== null && typeof receipt.reference !== "string")
    ) {
      return null;
    }
    paymentReceipts.push({
      payment_id: receipt.payment_id,
      amount,
      paid_at: receipt.paid_at,
      reference: receipt.reference as string | null
    });
  }

  return {
    fee_items: feeItems,
    assessment_version: assessmentVersion,
    assessed_amount: assessedAmount,
    paid_amount: paidAmount,
    balance_due: balanceDue,
    currency_code: "PHP",
    payment_status: summary.payment_status as EnrollmentFinancialSummary["payment_status"],
    payment_receipts: paymentReceipts
  };
}
