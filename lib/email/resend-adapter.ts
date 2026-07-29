import "server-only";

import { Resend } from "resend";
import { EmailAdapter, SendEmailOptions } from "./index";

export class ResendEmailAdapter implements EmailAdapter {
  private resend: Resend;
  private fromAddress: string;

  constructor(apiKey: string, fromAddress: string) {
    this.resend = new Resend(apiKey);
    this.fromAddress = fromAddress;
  }

  async send(options: SendEmailOptions): Promise<void> {
    try {
      const { error } = await this.resend.emails.send({
        from: this.fromAddress,
        to: options.to,
        subject: options.subject,
        react: options.react,
      });

      if (error) {
        console.error("email_delivery:provider_rejected");
        throw new Error("Failed to send email.");
      }
    } catch {
      console.error("email_delivery:send_failed");
      throw new Error("Email delivery failed.");
    }
  }
}
