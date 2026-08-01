import {
  Injectable,
  InternalServerErrorException,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createTransport, Transporter } from 'nodemailer';
import SMTPTransport from 'nodemailer/lib/smtp-transport';

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
  private transporter!: Transporter<SMTPTransport.SentMessageInfo>;

  constructor(
    private readonly config: ConfigService<EnvironmentVariables, true>,
  ) {}

  onModuleInit(): void {
    this.transporter = createTransport({
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
      throw new InternalServerErrorException('Failed to send email');
    }
  }

  async verifyConnection(): Promise<void> {
    try {
      await this.transporter.verify();
      this.logger.log('Mail transporter connection verified');
    } catch (error) {
      this.logger.error('Mail transporter verification failed', error);
      throw new InternalServerErrorException('Mail service unavailable');
    }
  }
}
