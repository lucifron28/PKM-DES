import test from "node:test";
import assert from "node:assert/strict";
import { MockEmailAdapter } from "./mock-adapter";
import React from "react";
import { AccountSetupEmail } from "./templates";

test("MockEmailAdapter successfully logs without throwing", async () => {
  const adapter = new MockEmailAdapter();
  let thrown = false;
  
  try {
    await adapter.send({
      to: "test@example.com",
      subject: "Test Subject",
      react: React.createElement(AccountSetupEmail, { setupLink: "http://localhost/setup" })
    });
  } catch {
    thrown = true;
  }
  
  assert.equal(thrown, false, "Mock adapter should not throw on send.");
});
