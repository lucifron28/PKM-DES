import assert from "node:assert/strict";
import test from "node:test";
import { parseEnrollmentFinancialSummary } from "./presentation";

test("summary preserves decimal cents in fees, balances, and receipts", () => {
  for (const amount of [19.99, 0.29, 0.57, "19.99", 9999999999.99]) {
    const summary = {
      fee_items: [{ fee_code: "ADMISSION_FEE", fee_name: "Admission Fee", amount }],
      assessment_version: 1, assessed_amount: amount, paid_amount: amount, balance_due: 0,
      currency_code: "PHP", payment_status: "PAID",
      payment_receipts: [{ payment_id: "receipt", amount, paid_at: "2026-10-14T00:00:00Z", reference: null }]
    };
    const parsed = parseEnrollmentFinancialSummary(summary);
    assert.equal(parsed?.assessed_amount, Number(amount));
    assert.equal(parsed?.fee_items?.[0].amount, Number(amount));
    assert.equal(parsed?.payment_receipts[0].amount, Number(amount));
    for (const invalid of [true, "", -1, 1.001, "1e2", Infinity, 10000000000]) {
      assert.equal(parseEnrollmentFinancialSummary({ ...summary, assessed_amount: invalid }), null);
    }
  }
});

test("keeps unset amounts null instead of inventing zeroes", () => {
  assert.deepEqual(parseEnrollmentFinancialSummary({
    fee_items: null,
    assessment_version: null,
    assessed_amount: null,
    paid_amount: null,
    balance_due: null,
    currency_code: "PHP",
    payment_status: "UNASSESSED",
    payment_receipts: []
  }), {
    fee_items: null,
    assessment_version: null,
    assessed_amount: null,
    paid_amount: null,
    balance_due: null,
    currency_code: "PHP",
    payment_status: "UNASSESSED",
    payment_receipts: []
  });
});

test("retains unknown historical fee codes and actual receipt rows", () => {
  const parsed = parseEnrollmentFinancialSummary({
    fee_items: [{ fee_code: "LEGACY_MISC", fee_name: "Legacy Miscellaneous Fee", amount: 100 }],
    assessment_version: 2,
    assessed_amount: 100,
    paid_amount: 25,
    balance_due: 75,
    currency_code: "PHP",
    payment_status: "PARTIAL",
    payment_receipts: [{ payment_id: "payment-1", amount: 25, paid_at: "2026-10-14T00:00:00Z", reference: "OR-1" }]
  });

  assert.equal(parsed?.fee_items?.[0]?.fee_code, "LEGACY_MISC");
  assert.equal(parsed?.assessment_version, "2");
  assert.equal(parsed?.balance_due, 75);
  assert.deepEqual(parsed?.payment_receipts[0], {
    payment_id: "payment-1",
    amount: 25,
    paid_at: "2026-10-14T00:00:00Z",
    reference: "OR-1"
  });
});

test("rejects malformed or negative finance values", () => {
  assert.equal(parseEnrollmentFinancialSummary({ payment_status: "PAID" }), null);
  assert.equal(parseEnrollmentFinancialSummary({
    fee_items: [], assessment_version: "1", assessed_amount: -1, paid_amount: 0, balance_due: 0,
    currency_code: "PHP", payment_status: "UNPAID", payment_receipts: []
  }), null);
});
