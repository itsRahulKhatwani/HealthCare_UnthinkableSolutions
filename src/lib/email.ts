import nodemailer from "nodemailer";
import { logger } from "./logger";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: parseInt(process.env.SMTP_PORT || "587"),
  secure: process.env.SMTP_PORT === "465",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
});

export async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}) {
  try {
    const info = await transporter.sendMail({
      from: `Healthcare App <${process.env.EMAIL_FROM}>`,
      to,
      subject,
      html,
    });
    return { success: true, data: info };
  } catch (error: any) {
    logger.error("Failed to send email via Nodemailer", { error: error.message, to, subject });
    throw error;
  }
}
