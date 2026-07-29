import "server-only";

import { getEmailEnv } from "./env";
import { ResendEmailAdapter } from "./resend-adapter";
import { MockEmailAdapter } from "./mock-adapter";
import type { ReactNode } from "react";

export interface SendEmailOptions {
  to: string;
  subject: string;
  react: ReactNode;
}

export interface EmailAdapter {
  send(options: SendEmailOptions): Promise<void>;
}

export function getEmailAdapter(): EmailAdapter {
  const env = getEmailEnv();
  
  if (env.enabled && env.apiKey && env.fromAddress) {
    return new ResendEmailAdapter(env.apiKey, env.fromAddress);
  }
  
  return new MockEmailAdapter();
}

export * from "./templates";

export * from "./env";
