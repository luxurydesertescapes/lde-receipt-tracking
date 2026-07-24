import { NextResponse } from "next/server";
import { currentAdmin } from "@/lib/admin";
import { getAuthUrl } from "@/lib/gmail";

// Starts the OAuth flow for connecting one more inbox. Which Google account
// gets connected is decided by whichever account the admin logs into on
// Google's consent screen, not anything passed in this request — see
// exchangeCodeForAccount in lib/gmail.ts.
export async function GET(request: Request) {
  const admin = await currentAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const redirectUri = `${new URL(request.url).origin}/api/email-accounts/callback`;
    const url = getAuthUrl(redirectUri, admin.email);
    return NextResponse.redirect(url);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
