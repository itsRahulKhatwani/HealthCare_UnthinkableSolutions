import { Resend } from "resend";
import { logger } from "./logger";

const resend = new Resend(process.env.RESEND_API_KEY || "placeholder");

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
    const data = await resend.emails.send({
      from: "Healthcare App <onboarding@resend.dev>",
      to,
      subject,
      html,
    });
    return { success: true, data };
  } catch (error: any) {
    logger.error("Failed to send email via Resend", { error: error.message, to, subject });
    throw error;
  }
}
