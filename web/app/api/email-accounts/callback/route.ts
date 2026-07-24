import { NextResponse } from "next/server";
import { currentAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { exchangeCodeForAccount } from "@/lib/gmail";

export async function GET(request: Request) {
  const admin = await currentAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const oauthError = url.searchParams.get("error");
  const redirectTo = new URL("/email-accounts", url.origin);

  if (oauthError) {
    redirectTo.searchParams.set("error", oauthError);
    return NextResponse.redirect(redirectTo);
  }
  if (!code) {
    redirectTo.searchParams.set("error", "missing_code");
    return NextResponse.redirect(redirectTo);
  }

  try {
    const redirectUri = `${url.origin}/api/email-accounts/callback`;
    const { email, refreshToken } = await exchangeCodeForAccount(code, redirectUri);
    await prisma.emailAccount.upsert({
      where: { email },
      update: { refreshToken, connectedBy: admin.email, lastSyncError: null },
      create: { email, refreshToken, connectedBy: admin.email },
    });
    redirectTo.searchParams.set("connected", email);
  } catch (err) {
    redirectTo.searchParams.set("error", err instanceof Error ? err.message : "unknown_error");
  }
  return NextResponse.redirect(redirectTo);
}
