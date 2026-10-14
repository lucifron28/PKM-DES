import assert from "node:assert/strict";
import test from "node:test";
import { ACCOUNTING_FEE_CODES, parseAccountingFeeCatalog } from "./fee-codes";

test("catalog preserves decimal cents and rejects invalid RPC amounts", () => {
  const row = { ...ACCOUNTING_FEE_CODES[0], active: true };
  for (const amount of [19.99, 0.29, 0.57, "19.99", 0, 9999999999.99]) {
    assert.equal(parseAccountingFeeCatalog([{ ...row, amount }])?.[0].amount, Number(amount));
  }
  for (const amount of [true, "", undefined, -1, 1.001, "1e2", Infinity, 10000000000]) {
    assert.equal(parseAccountingFeeCatalog([{ ...row, amount }]), null);
  }
});

test("accounting fee codes match the registration form categories", () => {
  assert.deepEqual(ACCOUNTING_FEE_CODES, [
    { fee_code: "ADMISSION_FEE", fee_name: "Admission Fee", section: "MISCELLANEOUS" },
    { fee_code: "ATHLETIC_FEE", fee_name: "Athletic Fee", section: "MISCELLANEOUS" },
    { fee_code: "COMPUTER_FEE", fee_name: "Computer Fee", section: "MISCELLANEOUS" },
    { fee_code: "CULTURAL_FEE", fee_name: "Cultural Fee", section: "MISCELLANEOUS" },
    { fee_code: "DEVELOPMENT_FEE", fee_name: "Development Fee", section: "MISCELLANEOUS" },
    { fee_code: "ENTRANCE_FEE", fee_name: "Entrance Fee", section: "MISCELLANEOUS" },
    { fee_code: "GUIDANCE_FEE", fee_name: "Guidance Fee", section: "MISCELLANEOUS" },
    { fee_code: "HANDBOOK_FEE", fee_name: "Handbook Fee", section: "MISCELLANEOUS" },
    { fee_code: "LABORATORY_FEE", fee_name: "Laboratory Fee", section: "MISCELLANEOUS" },
    { fee_code: "LIBRARY_FEE", fee_name: "Library Fee", section: "MISCELLANEOUS" },
    { fee_code: "MEDICAL_AND_DENTAL_FEE", fee_name: "Medical and Dental Fee", section: "MISCELLANEOUS" },
    { fee_code: "REGISTRATION_FEE", fee_name: "Registration Fee", section: "MISCELLANEOUS" },
    { fee_code: "SCHOOL_ID_FEE", fee_name: "School ID Fee", section: "MISCELLANEOUS" },
    { fee_code: "TUITION_FEE", fee_name: "Tuition Fee", section: "TUITION" },
    { fee_code: "NSTP_FEE_CWTS", fee_name: "NSTP Fee (CWTS)", section: "NSTP" },
    { fee_code: "SCHOLARSHIP", fee_name: "Scholarship", section: "SCHOLARSHIP" }
  ]);
});

test("accounting fee codes are unique and carry no default amounts", () => {
  const codes = ACCOUNTING_FEE_CODES.map((item) => item.fee_code);
  assert.equal(new Set(codes).size, codes.length);
  assert.equal(ACCOUNTING_FEE_CODES.length, 16);
  assert.equal(ACCOUNTING_FEE_CODES.some((item) => "amount" in item), false);
});

test("accounting fee catalog accepts unset amounts but not active unpriced fees", () => {
  const rows = ACCOUNTING_FEE_CODES.map((item) => ({
    fee_code: item.fee_code,
    fee_name: item.fee_name,
    section: item.section,
    amount: null,
    active: false
  }));
  assert.equal(parseAccountingFeeCatalog(rows)?.length, 16);
  assert.equal(parseAccountingFeeCatalog([{ ...rows[0], active: true }]), null);
});
