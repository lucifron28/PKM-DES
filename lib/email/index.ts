import "server-only";

import { getEmailEnv } from "./env";
import { GmailSmtpEmailAdapter } from "./gmail-smtp-adapter";
import { MockEmailAdapter } from "./mock-adapter";
export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text: string;
}

export interface EmailAdapter {
  send(options: SendEmailOptions): Promise<void>;
}

export function getEmailAdapter(): EmailAdapter {
  const env = getEmailEnv();
  
  if (env.enabled && env.gmailUser && env.gmailAppPassword && env.fromAddress) {
    return new GmailSmtpEmailAdapter({
      fromAddress: env.fromAddress,
      user: env.gmailUser,
      appPassword: env.gmailAppPassword
    });
  }
  
  return new MockEmailAdapter();
}

export * from "./templates";

export * from "./env";
