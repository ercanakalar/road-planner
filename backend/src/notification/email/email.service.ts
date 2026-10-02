import {
  Injectable,
  InternalServerErrorException,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createTransport, Transporter } from 'nodemailer';
import SMTPPool from 'nodemailer/lib/smtp-pool';

import { EnvironmentVariables } from 'src/config/env.validation';

interface EmailPayload {
  to: string;
  subject: string;
  html: string;
  text?: string;
  cc?: string[];
}

@Injectable()
export class EmailService implements OnModuleInit {
  private readonly logger = new Logger(EmailService.name);
  private transporter!: Transporter<SMTPPool.SentMessageInfo>;

  constructor(
    private readonly config: ConfigService<EnvironmentVariables, true>,
  ) {}

  onModuleInit(): void {
    // Pooled, so announcing a route to many followers queues the messages on
    // a few connections instead of opening one per recipient at once — which
    // a mail provider treats as abuse.
    this.transporter = createTransport({
      pool: true,
      maxConnections: 3,
      host: this.config.get('MAIL_HOST', { infer: true }),
      port: this.config.get('MAIL_PORT', { infer: true }),
      auth: {
        user: this.config.get('MAIL_USERNAME', { infer: true }),
        pass: this.config.get('MAIL_PASSWORD', { infer: true }),
      },
      tls: {
        rejectUnauthorized: this.config.get('MAIL_TLS_REJECT_UNAUTHORIZED', {
          infer: true,
        }),
      },
    });
  }

  async sendEmail(payload: EmailPayload): Promise<boolean> {
    try {
      await this.transporter.sendMail({
        ...payload,
        from: this.config.get('MAIL_FROM', { infer: true }),
      });
      return true;
    } catch (error) {
      this.logger.error(`Failed to send email to ${payload.to}`, error);
      throw new InternalServerErrorException('error.emailSendFailed');
    }
  }

  async verifyConnection(): Promise<void> {
    try {
      await this.transporter.verify();
      this.logger.log('Mail transporter connection verified');
    } catch (error) {
      this.logger.error('Mail transporter verification failed', error);
      throw new InternalServerErrorException('error.mailUnavailable');
    }
  }
}
