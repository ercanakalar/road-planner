import {
  Injectable,
  InternalServerErrorException,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import { createTransport, Transporter } from 'nodemailer';
import SMTPTransport from 'nodemailer/lib/smtp-transport';

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
  private transporter: Transporter<SMTPTransport.SentMessageInfo>;

  onModuleInit() {
    this.transporter = createTransport({
      host: process.env.MAIL_HOST ?? 'sandbox.smtp.mailtrap.io',
      port: Number(process.env.MAIL_PORT) || 2525,
      auth: {
        user: process.env.MAIL_USERNAME,
        pass: process.env.MAIL_PASSWORD,
      },
      tls: {
        ciphers: 'SSLv3',
        rejectUnauthorized: false,
      },
    });
  }

  async sendEmail(payload: EmailPayload): Promise<boolean> {
    try {
      await this.transporter.sendMail({
        ...payload,
        from: process.env.MAIL_FROM,
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
