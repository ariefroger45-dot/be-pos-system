import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly transporter?: Transporter;
  private readonly from: string;

  constructor() {
    const host = process.env.SMTP_HOST;
    this.from = process.env.MAIL_FROM ?? 'POS System';

    if (host) {
      this.transporter = nodemailer.createTransport({
        host,
        port: Number(process.env.SMTP_PORT ?? 587),
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });
    }
  }

  isConfigured(): boolean {
    return Boolean(this.transporter);
  }

  async send(to: string, subject: string, html: string): Promise<void> {
    if (!this.transporter) {
      throw new ServiceUnavailableException('Email is not configured');
    }

    await this.transporter.sendMail({ from: this.from, to, subject, html });
  }

  async sendReceipt(
    to: string,
    subject: string,
    html: string,
  ): Promise<boolean> {
    if (!this.transporter) {
      this.logger.warn('Email not configured; receipt email skipped');
      return false;
    }
    await this.send(to, subject, html);
    return true;
  }
}
