import assert from "node:assert/strict";
import test from "node:test";
import { formatRegistrationAmount, formatRegistrationReceiptDate, presentRegistrationFinance, type PrintableRegistrationFinancialSummary } from "./finance";
import { REGISTRATION_FORM_MISCELLANEOUS_FEE_LABELS } from "./presentation";

function financialSummary(
  overrides: Partial<PrintableRegistrationFinancialSummary> = {}
): PrintableRegistrationFinancialSummary {
  return {
    fee_items: [],
    assessment_version: null,
    assessed_amount: null,
    paid_amount: null,
    balance_due: null,
    currency_code: "PHP",
    payment_status: "UNASSESSED",
    payment_receipts: [],
    ...overrides
  };
}

test("maps fee codes and names to the existing tuition, NSTP, scholarship, and miscellaneous rows", () => {
  const finance = presentRegistrationFinance(financialSummary({
    fee_items: [
      { fee_code: "MISC_ADMISSION_FEE", fee_name: "Application charge", amount: 500 },
      { fee_code: "UNMAPPED_CODE", fee_name: "Medical and Dental Fee", amount: 125 },
      { fee_code: "TUITION_FEE", fee_name: "Tuition", amount: 18_000 },
      { fee_code: "NSTP_FEE_CWTS", fee_name: "CWTS", amount: 1_500 },
      { fee_code: "SCHOLARSHIP", fee_name: "Scholarship", amount: 2_000 }
    ],
    assessment_version: "QA-SYNTHETIC-1",
    assessed_amount: 19_950,
    paid_amount: 5_000,
    balance_due: 14_950,
    payment_status: "PARTIAL"
  }));

  assert.equal(finance.miscellaneousAmounts["Admission Fee"], 500);
  assert.equal(finance.miscellaneousAmounts["Medical and Dental Fee"], 125);
  assert.equal(finance.miscellaneousTotal, null);
  assert.equal(finance.tuitionAmount, 18_000);
  assert.equal(finance.nstpAmount, 1_500);
  assert.equal(finance.scholarshipAmount, 2_000);
  assert.equal(finance.assessedAmount, 19_950);
  assert.equal(finance.paidAmount, 5_000);
  assert.equal(finance.balanceDue, 14_950);
  assert.equal(finance.paymentStatus, "PARTIAL");
  assert.deepEqual(finance.paymentReceipts, []);
  assert.equal(finance.unprintedReceiptCount, 0);
});

test("only totals miscellaneous fees when every original fee row has an explicit amount", () => {
  const feeItems = REGISTRATION_FORM_MISCELLANEOUS_FEE_LABELS.map((feeName, index) => ({
    fee_code: "MISC_" + feeName.toUpperCase().replace(/[^A-Z0-9]+/g, "_") + "_FEE",
    fee_name: feeName,
    amount: index === 0 ? 0 : index + 10
  }));
  const finance = presentRegistrationFinance(financialSummary({ fee_items: feeItems }));

  assert.equal(finance.miscellaneousAmounts["Admission Fee"], 0);
  assert.equal(finance.miscellaneousTotal, feeItems.reduce((total, item) => total + item.amount, 0));
  assert.equal(formatRegistrationAmount(0), "PHP 0.00");
});

test("keeps absent finance values unconfigured instead of substituting zero", () => {
  const finance = presentRegistrationFinance(null);

  assert.equal(finance.miscellaneousAmounts["Admission Fee"], null);
  assert.equal(finance.miscellaneousTotal, null);
  assert.equal(finance.tuitionAmount, null);
  assert.equal(finance.assessedAmount, null);
  assert.equal(finance.paidAmount, null);
  assert.equal(finance.balanceDue, null);
  assert.equal(finance.paymentStatus, null);
  assert.equal(formatRegistrationAmount(null), "Not configured");
});

test("shows only the four newest receipts and counts earlier receipts", () => {
  const receipts = [
    { payment_id: "payment-6", amount: 1000, paid_at: "2026-10-13T16:30:00.000Z", reference: "OR-006" },
    { payment_id: "payment-1", amount: 500, paid_at: "2026-10-08T01:00:00.000Z", reference: "OR-001" },
    { payment_id: "payment-5", amount: 1100, paid_at: "2026-10-12T01:00:00.000Z", reference: "OR-005" },
    { payment_id: "payment-2", amount: 750, paid_at: "2026-10-09T01:00:00.000Z", reference: "OR-002" },
    { payment_id: "payment-4", amount: 650, paid_at: "2026-10-11T01:00:00.000Z", reference: "OR-004" },
    { payment_id: "payment-3", amount: 1000, paid_at: "2026-10-10T01:00:00.000Z", reference: "OR-003" }
  ];
  const finance = presentRegistrationFinance(financialSummary({ payment_receipts: receipts }));

  assert.deepEqual(finance.paymentReceipts.map((receipt) => receipt.payment_id), [
    "payment-3",
    "payment-4",
    "payment-5",
    "payment-6"
  ]);
  assert.equal(finance.unprintedReceiptCount, 2);
  assert.equal(formatRegistrationReceiptDate("2026-10-13T16:30:00.000Z"), "Oct 14, 2026");
});
