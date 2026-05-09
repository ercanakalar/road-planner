import { Injectable } from '@nestjs/common';
import { createTransport, Transporter } from 'nodemailer';
import SMTPTransport from 'nodemailer/lib/smtp-transport';

@Injectable()
export class EmailService {
  private transporter: Transporter<SMTPTransport.SentMessageInfo>;

  constructor() {
    this.transporter = createTransport({
      host: 'sandbox.smtp.mailtrap.io',
      port: 2525,
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

  sendEmail(emailData: {
    subject: string;
    html: string;
    to: string;
    cc?: string[];
  }) {
    return this.transporter.sendMail({
      ...emailData,
      from: process.env.MAIL_FROM,
    });
  }
}
