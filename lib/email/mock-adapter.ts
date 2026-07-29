import "server-only";

import { EmailAdapter, SendEmailOptions } from "./index";
import { maskRecipientEmail } from "./recipient-mask";

export class MockEmailAdapter implements EmailAdapter {
  async send(options: SendEmailOptions): Promise<void> {
    console.log(`[MOCK EMAIL] To: ${maskRecipientEmail(options.to)} | Subject: ${options.subject}`);
  }
}
