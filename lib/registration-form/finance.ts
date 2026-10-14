import { REGISTRATION_FORM_MISCELLANEOUS_FEE_LABELS } from "./presentation";

export const REGISTRATION_PAYMENT_STATUSES = ["UNASSESSED", "UNPAID", "PARTIAL", "PAID"] as const;
export type RegistrationPaymentStatus = (typeof REGISTRATION_PAYMENT_STATUSES)[number];
export const REGISTRATION_PRINT_RECEIPT_LIMIT = 4;

export type RegistrationPaymentReceipt = {
  payment_id: string;
  amount: number;
  paid_at: string;
  reference: string | null;
};

export type PrintableRegistrationFinancialSummary = {
  fee_items: Array<{ fee_code: string; fee_name: string; amount: number | null }> | null;
  assessment_version: string | null;
  assessed_amount: number | null;
  paid_amount: number | null;
  balance_due: number | null;
  currency_code: "PHP";
  payment_status: RegistrationPaymentStatus;
  payment_receipts: RegistrationPaymentReceipt[] | null;
};

type MiscellaneousFeeLabel = (typeof REGISTRATION_FORM_MISCELLANEOUS_FEE_LABELS)[number];

export type RegistrationFinancePresentation = {
  miscellaneousAmounts: Record<MiscellaneousFeeLabel, number | null>;
  miscellaneousTotal: number | null;
  tuitionAmount: number | null;
  nstpAmount: number | null;
  scholarshipAmount: number | null;
  assessedAmount: number | null;
  paidAmount: number | null;
  balanceDue: number | null;
  assessmentVersion: string | null;
  currencyCode: "PHP";
  paymentStatus: RegistrationPaymentStatus | null;
  paymentReceipts: RegistrationPaymentReceipt[];
  unprintedReceiptCount: number;
};

function normalizeFeeKey(value: string) {
  return value.trim().toLocaleUpperCase().replace(/[^A-Z0-9]/g, "").replace(/^(MISCELLANEOUS|MISC)/, "").replaceAll("FEE", "");
}

function feeAmountFor(
  feeItems: PrintableRegistrationFinancialSummary["fee_items"],
  acceptedKeys: string[]
) {
  const accepted = new Set(acceptedKeys.map(normalizeFeeKey));
  const item = feeItems?.find((fee) => accepted.has(normalizeFeeKey(fee.fee_code)) || accepted.has(normalizeFeeKey(fee.fee_name)));
  return typeof item?.amount === "number" && Number.isFinite(item.amount) ? item.amount : null;
}

export function presentRegistrationFinance(
  summary: PrintableRegistrationFinancialSummary | null | undefined
): RegistrationFinancePresentation {
  const feeItems = summary?.fee_items ?? null;
  const entries = REGISTRATION_FORM_MISCELLANEOUS_FEE_LABELS.map((label) => [
    label,
    feeAmountFor(feeItems, [label])
  ] as const);
  const miscellaneousAmounts = Object.fromEntries(entries) as Record<MiscellaneousFeeLabel, number | null>;
  const miscAmounts = entries.map(([, amount]) => amount);
  const miscellaneousTotal = feeItems && miscAmounts.every((amount) => amount !== null)
    ? miscAmounts.reduce<number>((total, amount) => total + (amount ?? 0), 0)
    : null;
  const allReceipts = [...(summary?.payment_receipts ?? [])]
    .sort((left, right) => Date.parse(left.paid_at) - Date.parse(right.paid_at));
  const paymentReceipts = allReceipts.slice(-REGISTRATION_PRINT_RECEIPT_LIMIT);

  return {
    miscellaneousAmounts,
    miscellaneousTotal,
    tuitionAmount: feeAmountFor(feeItems, ["TUITION", "TUITION FEE"]),
    nstpAmount: feeAmountFor(feeItems, ["NSTP", "NSTP FEE (CWTS)", "CWTS"]),
    scholarshipAmount: feeAmountFor(feeItems, ["SCHOLARSHIP", "SCHOLARSHIP FEE"]),
    assessedAmount: summary?.assessed_amount ?? null,
    paidAmount: summary?.paid_amount ?? null,
    balanceDue: summary?.balance_due ?? null,
    assessmentVersion: summary?.assessment_version ?? null,
    currencyCode: summary?.currency_code ?? "PHP",
    paymentStatus: summary?.payment_status ?? null,
    paymentReceipts,
    unprintedReceiptCount: allReceipts.length - paymentReceipts.length
  };
}

export function formatRegistrationAmount(amount: number | null, currencyCode: "PHP" = "PHP") {
  if (amount === null || !Number.isFinite(amount)) return "Not configured";
  return `${currencyCode} ${amount.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function formatRegistrationReceiptDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) return "Not configured";

  return new Intl.DateTimeFormat("en-PH", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "Asia/Manila"
  }).format(date);
}
