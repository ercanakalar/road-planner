import { Injectable } from "@nestjs/common";
import { createTransport, Transporter } from "nodemailer";
import SMTPTransport from "nodemailer/lib/smtp-transport";

@Injectable()
export class EmailService {
    private transporter: Transporter<SMTPTransport.SentMessageInfo>;

    constructor() {
        this.transporter = createTransport({
            service: "Outlook365",

            host: "smtp.office365.com",
            port: 587,
            auth: {
                user: process.env.MAIL_USERNAME,
                pass: process.env.MAIL_PASSWORD,
            },
            tls: {
                ciphers: "SSLv3",
                rejectUnauthorized: false,
            },
        });
    }

    sendEmail(subject: string, html: string, to: string, cc?: string[]) {
        return this.transporter.sendMail({
            subject,
            html,
            to,
            cc,
            from: process.env.MAIL_USERNAME,
        });
    }
}
