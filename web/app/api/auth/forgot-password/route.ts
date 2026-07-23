import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { notifyAdminsOfPasswordResetRequest } from "@/lib/email";

const ForgotPasswordSchema = z.object({
  email: z.string().email(),
});

// Deliberately unauthenticated — this is how someone who's locked out asks
// for help. Always returns the same generic message regardless of whether
// the email matches an account, so this can't be used to enumerate logins.
export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const parsed = ForgotPasswordSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  }

  const email = parsed.data.email.trim().toLowerCase();
  const user = await prisma.user.findUnique({ where: { email } });
  if (user) {
    await notifyAdminsOfPasswordResetRequest(email);
  }

  return NextResponse.json({
    message: "If that email has an account, an admin has been notified and will reset it for you.",
  });
}
