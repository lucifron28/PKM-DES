import "server-only";

import nodemailer, { type SendMailOptions } from "nodemailer";
import type { EmailAdapter, SendEmailOptions } from "./index";

type MailTransport = {
  sendMail(message: SendMailOptions): Promise<unknown>;
};

export type GmailSmtpConfiguration = {
  fromAddress: string;
  user: string;
  appPassword: string;
};

export class GmailSmtpEmailAdapter implements EmailAdapter {
  private readonly transport: MailTransport;
  private readonly fromAddress: string;

  constructor(configuration: GmailSmtpConfiguration, transport?: MailTransport) {
    this.fromAddress = configuration.fromAddress;
    this.transport = transport ?? nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: {
        user: configuration.user,
        pass: configuration.appPassword
      }
    });
  }

  async send(options: SendEmailOptions): Promise<void> {
    try {
      await this.transport.sendMail({
        from: this.fromAddress,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text
      });
    } catch {
      console.error("email_delivery:gmail_smtp_failed");
      throw new Error("Email delivery failed.");
    }
  }
}
