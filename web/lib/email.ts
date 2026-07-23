import nodemailer from "nodemailer";
import { prisma } from "./prisma";

const host = process.env.SMTP_HOST || "smtp.gmail.com";
const port = Number(process.env.SMTP_PORT || 465);
const user = process.env.SMTP_USER;
const pass = process.env.SMTP_PASS;
const from = process.env.EMAIL_FROM || user;

export const emailConfigured = Boolean(user && pass);

const transporter = emailConfigured
  ? nodemailer.createTransport({ host, port, secure: port === 465, auth: { user, pass } })
  : null;

/**
 * Sends a plain-text email. No-ops (logging instead of throwing) when
 * SMTP_USER/SMTP_PASS aren't configured yet, so the rest of the app works
 * before that credential is provisioned — see SETUP.md. Mirrors
 * lib/notion.ts's graceful-degradation pattern.
 */
export async function sendMail(params: { to: string; subject: string; text: string }): Promise<void> {
  if (!transporter) {
    console.log(`[email] skipped "${params.subject}" to ${params.to} — SMTP_USER/SMTP_PASS not configured`);
    return;
  }
  await transporter.sendMail({ from, to: params.to, subject: params.subject, text: params.text });
}

/**
 * This app has no self-service password reset — logins are admin-assigned
 * (see scripts/create-user.ts and app/team/page.tsx). So "forgot password"
 * just notifies every admin that someone needs a reset, rather than
 * emailing a reset link to the requester.
 */
export async function notifyAdminsOfPasswordResetRequest(requesterEmail: string): Promise<void> {
  const admins = await prisma.user.findMany({ where: { isAdmin: true }, select: { email: true } });
  if (admins.length === 0) {
    console.log(`[email] password reset requested by ${requesterEmail} — no admins to notify`);
    return;
  }

  await Promise.all(
    admins.map((admin) =>
      sendMail({
        to: admin.email,
        subject: "LDE app: password reset requested",
        text: `${requesterEmail} asked for a password reset on the LDE team app.\n\nSign in and reset it from the Team page (/team).`,
      })
    )
  );
}
