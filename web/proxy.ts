import { auth } from "@/auth";
import { NextResponse } from "next/server";

// Gates every page/API route except auth endpoints and the login page
// behind a signed-in, allowlisted session. Named `proxy` (not `middleware`)
// per this Next.js version's renamed file convention.
export default auth((req) => {
  const isAuthRoute = req.nextUrl.pathname.startsWith("/api/auth");
  // Covers /login itself and /login/forgot-password (no session exists yet
  // when either of these is being used, by definition).
  const isLoginPage = req.nextUrl.pathname.startsWith("/login");
  // Slack calls this server-to-server with no browser session — it proves
  // itself via its own request signature (see lib/slack.ts), not a cookie.
  const isSlackWebhook = req.nextUrl.pathname === "/api/slack/events";
  // Vercel Cron calls these server-to-server with no browser session —
  // each proves itself via CRON_SECRET (or an admin session) inside the
  // route handler itself; see app/api/email-accounts/sync and
  // app/api/slack/sync.
  const isCronSyncRoute =
    req.nextUrl.pathname === "/api/email-accounts/sync" ||
    req.nextUrl.pathname === "/api/slack/sync";
  if (!req.auth && !isAuthRoute && !isLoginPage && !isSlackWebhook && !isCronSyncRoute) {
    const loginUrl = new URL("/login", req.nextUrl.origin);
    return NextResponse.redirect(loginUrl);
  }
});

export const config = {
  // Excludes framework internals, the favicon/app icon, and /public/brand
  // (logo assets used on the unauthenticated login page itself).
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.png|brand/).*)"],
};
