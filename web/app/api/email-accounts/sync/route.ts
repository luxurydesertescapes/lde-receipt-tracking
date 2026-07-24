import { NextResponse } from "next/server";
import { currentAdmin } from "@/lib/admin";
import { syncAllEmailAccounts } from "@/lib/email-ingest";

/**
 * Triggers a sync pass across every connected inbox. Two callers, one
 * handler: the "Search Now" button (admin session) and the hourly Vercel
 * Cron job (see vercel.json), authenticated instead via CRON_SECRET since
 * a cron invocation has no admin session.
 */
export async function POST(request: Request) {
  const admin = await currentAdmin();
  if (!admin) {
    const cronSecret = process.env.CRON_SECRET;
    const authHeader = request.headers.get("authorization");
    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  const results = await syncAllEmailAccounts();
  return NextResponse.json({ results });
}
