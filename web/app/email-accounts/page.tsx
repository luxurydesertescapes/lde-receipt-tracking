import { redirect } from "next/navigation";
import { currentAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { slackConfigured } from "@/lib/slack";
import SyncNowButton from "./SyncNowButton";
import DisconnectButton from "./DisconnectButton";
import SlackSyncButton from "./SlackSyncButton";

const GMAIL_CONFIGURED = Boolean(
  process.env.GOOGLE_GMAIL_CLIENT_ID && process.env.GOOGLE_GMAIL_CLIENT_SECRET
);

export default async function EmailAccountsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const admin = await currentAdmin();
  if (!admin) redirect("/");

  const params = await searchParams;
  const connected = typeof params.connected === "string" ? params.connected : undefined;
  const error = typeof params.error === "string" ? params.error : undefined;

  const accounts = await prisma.emailAccount.findMany({ orderBy: { createdAt: "asc" } });
  const slackSyncState = await prisma.slackSyncState.findUnique({ where: { id: "singleton" } });

  return (
    <main className="mx-auto max-w-3xl p-6">
      <h1 className="mb-1 text-2xl font-semibold">Auto-Ingestion</h1>
      <p className="mb-6 text-sm text-neutral-500">
        Automatically-filed receipts land here awaiting property assignment on the{" "}
        <a href="/review" className="underline">Review</a> page.
      </p>

      <h2 className="mb-1 text-lg font-medium">Email Accounts</h2>
      <p className="mb-4 text-sm text-neutral-500">
        Connected inboxes are scanned hourly for vendor order confirmations and invoices
        (Amazon, Instacart, Costco, Home Depot, and anything with &quot;invoice&quot;/&quot;receipt&quot; in the
        subject).
      </p>

      {connected && (
        <p className="mb-4 rounded bg-emerald-50 px-3 py-2 text-sm text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">
          Connected {connected}.
        </p>
      )}
      {error && (
        <p className="mb-4 rounded bg-red-50 px-3 py-2 text-sm text-red-800 dark:bg-red-950 dark:text-red-200">
          Couldn&apos;t connect: {error}
        </p>
      )}

      {!GMAIL_CONFIGURED ? (
        <p className="mb-6 rounded border border-dashed border-neutral-300 p-4 text-sm text-neutral-500 dark:border-neutral-700">
          Email ingestion isn&apos;t configured yet — GOOGLE_GMAIL_CLIENT_ID/GOOGLE_GMAIL_CLIENT_SECRET
          need to be set. See SETUP.md.
        </p>
      ) : (
        <div className="mb-6 flex items-center gap-4">
          {/* Real navigation to an API route that 302s to Google — not a Next.js page. */}
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
          <a
            href="/api/email-accounts/connect"
            className="rounded bg-brand-gold px-3 py-1.5 text-sm font-medium text-brand-gold-contrast transition-colors hover:bg-brand-gold-hover"
          >
            + Connect an Inbox
          </a>
          {accounts.length > 0 && <SyncNowButton />}
        </div>
      )}

      <table className="w-full text-left text-sm">
        <thead className="border-b border-neutral-200 text-neutral-500 dark:border-neutral-800">
          <tr>
            <th className="py-2">Inbox</th>
            <th className="py-2">Connected By</th>
            <th className="py-2">Last Synced</th>
            <th className="py-2"></th>
          </tr>
        </thead>
        <tbody>
          {accounts.map((a) => (
            <tr key={a.id} className="border-b border-neutral-100 dark:border-neutral-900">
              <td className="py-2">{a.email}</td>
              <td className="py-2">{a.connectedBy}</td>
              <td className="py-2">
                {a.lastSyncedAt ? a.lastSyncedAt.toISOString().slice(0, 16).replace("T", " ") : "Never"}
                {a.lastSyncError && (
                  <span className="ml-2 text-red-600" title={a.lastSyncError}>
                    (last sync failed)
                  </span>
                )}
              </td>
              <td className="py-2 text-right">
                <DisconnectButton id={a.id} />
              </td>
            </tr>
          ))}
          {accounts.length === 0 && (
            <tr>
              <td colSpan={4} className="py-6 text-center text-neutral-500">
                No inboxes connected yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>

      <h2 className="mt-8 mb-1 text-lg font-medium">Slack Message History</h2>
      <p className="mb-4 text-sm text-neutral-500">
        The team&apos;s receipt/supply/other channels are ingested live as messages come in.
        This backfill-searches channel history for anything the live listener missed —
        messages posted before the bot was added, or during any downtime.
      </p>
      {!slackConfigured ? (
        <p className="rounded border border-dashed border-neutral-300 p-4 text-sm text-neutral-500 dark:border-neutral-700">
          Slack isn&apos;t configured yet — SLACK_SIGNING_SECRET/SLACK_BOT_TOKEN need to be set.
          See SETUP.md.
        </p>
      ) : (
        <div className="flex items-center gap-4">
          <SlackSyncButton />
        </div>
      )}
      <p className="mt-2 text-xs text-neutral-500">
        Last searched:{" "}
        {slackSyncState?.lastSyncedAt
          ? slackSyncState.lastSyncedAt.toISOString().slice(0, 16).replace("T", " ")
          : "Never"}
        {slackSyncState?.lastSyncError && (
          <span className="ml-2 text-red-600" title={slackSyncState.lastSyncError}>
            (last search hit an error)
          </span>
        )}
      </p>
    </main>
  );
}
