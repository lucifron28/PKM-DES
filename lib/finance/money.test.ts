import assert from "node:assert/strict";
import test from "node:test";
import { parseMoneyInput } from "./money";

test("accepts nonnegative currency values with at most two decimals", () => {
  assert.equal(parseMoneyInput("0", true), 0);
  assert.equal(parseMoneyInput("125", true), 125);
  assert.equal(parseMoneyInput("125.5", true), 125.5);
  assert.equal(parseMoneyInput("9999999999.99", true), 9999999999.99);
});

test("rejects negatives, excessive precision, malformed values, and disallowed zero", () => {
  for (const value of ["-1", "1.001", "1,000", "Infinity", "", "10000000000"]) {
    assert.equal(parseMoneyInput(value, true), null, value);
  }
  assert.equal(parseMoneyInput("0.00", false), null);
});
