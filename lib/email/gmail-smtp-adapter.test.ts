import test from "node:test";
import assert from "node:assert/strict";
import type { SendMailOptions } from "nodemailer";
import { GmailSmtpEmailAdapter } from "./gmail-smtp-adapter";

test("Gmail SMTP adapter renders the existing email content without sending during tests", async () => {
  const messages: SendMailOptions[] = [];
  const adapter = new GmailSmtpEmailAdapter(
    {
      fromAddress: "PKM-DES <registrar@example.com>",
      user: "registrar@example.com",
      appPassword: "test-app-password"
    },
    {
      async sendMail(message) {
        messages.push(message);
        return {};
      }
    }
  );

  await adapter.send({
    to: "student@example.com",
    subject: "PKM-DES Student Account Setup",
    html: "<p>Set up your account</p>",
    text: "Set up your account"
  });

  assert.equal(messages.length, 1);
  assert.equal(messages[0].from, "PKM-DES <registrar@example.com>");
  assert.equal(messages[0].to, "student@example.com");
  assert.equal(messages[0].subject, "PKM-DES Student Account Setup");
  assert.match(String(messages[0].html), /Set up your account/);
  assert.equal(messages[0].text, "Set up your account");
});

test("Gmail SMTP adapter keeps provider failures out of the email content", async () => {
  const adapter = new GmailSmtpEmailAdapter(
    {
      fromAddress: "PKM-DES <registrar@example.com>",
      user: "registrar@example.com",
      appPassword: "test-app-password"
    },
    {
      async sendMail() {
        throw new Error("transport failure");
      }
    }
  );
  const logs: string[] = [];
  const previousError = console.error;
  console.error = (...args: unknown[]) => logs.push(args.map(String).join(" "));

  try {
    await assert.rejects(
      adapter.send({
        to: "student@example.com",
        subject: "PKM-DES Student Account Setup",
        html: "<p>Set up your account</p>",
        text: "Set up your account"
      }),
      /Email delivery failed\./
    );
  } finally {
    console.error = previousError;
  }

  assert.deepEqual(logs, ["email_delivery:gmail_smtp_failed"]);
  assert.doesNotMatch(logs.join(" "), /student@example\.com|transport failure/);
});
