import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);
export async function sendEmail(to: string, subject: string, html: string) {
  try {
    const { error } = await resend.emails.send({
      from: process.env.EMAIL_FROM!,
      to,
      subject,
      html,
    });
    
    if (error) {
      console.error("Resend API error:", error);
      throw new Error(error.message);
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to send email.";
    console.error("Error sending email:", error);
    throw new Error(message);
  }
}
