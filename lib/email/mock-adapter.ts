import { EmailAdapter, SendEmailOptions } from "./index";

export class MockEmailAdapter implements EmailAdapter {
  async send(options: SendEmailOptions): Promise<void> {
    console.log(`[MOCK EMAIL] To: ${options.to} | Subject: ${options.subject}`);
  }
}
