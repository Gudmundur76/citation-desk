/**
 * SMTP mailer using Stalwart at mail.iventure.studio.
 * Replaces the Manus Forge notification service for transactional emails.
 */
import nodemailer from "nodemailer";
import { ENV } from "./env";

let _transporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter {
  if (!_transporter) {
    _transporter = nodemailer.createTransport({
      host: ENV.smtpHost,
      port: ENV.smtpPort,
      secure: false, // STARTTLS on 587
      auth: {
        user: ENV.smtpUser,
        pass: ENV.smtpPass,
      },
      tls: {
        rejectUnauthorized: ENV.isProduction,
      },
    });
  }
  return _transporter;
}

export async function sendEmail(opts: {
  to: string;
  subject: string;
  text: string;
  html?: string;
}): Promise<void> {
  const transporter = getTransporter();
  await transporter.sendMail({
    from: ENV.smtpFrom,
    to: opts.to,
    subject: opts.subject,
    text: opts.text,
    html: opts.html ?? opts.text.replace(/\n/g, "<br>"),
  });
}
