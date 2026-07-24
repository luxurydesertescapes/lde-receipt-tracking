import crypto from "node:crypto";

const SIGNING_SECRET = process.env.SLACK_SIGNING_SECRET;
const BOT_TOKEN = process.env.SLACK_BOT_TOKEN;

/**
 * Verifies Slack's request signature (https://api.slack.com/authentication/verifying-requests-from-slack).
 * Must run against the *raw* request body — do not JSON.parse before calling this.
 */
export function verifySlackSignature(params: {
  rawBody: string;
  timestamp: string | null;
  signature: string | null;
}): boolean {
  if (!SIGNING_SECRET) return false;
  const { rawBody, timestamp, signature } = params;
  if (!timestamp || !signature) return false;

  // Reject requests older than 5 minutes (replay-attack protection).
  const age = Math.abs(Date.now() / 1000 - Number(timestamp));
  if (!Number.isFinite(age) || age > 60 * 5) return false;

  const base = `v0:${timestamp}:${rawBody}`;
  const expected =
    "v0=" + crypto.createHmac("sha256", SIGNING_SECRET).update(base).digest("hex");

  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export const slackConfigured = Boolean(SIGNING_SECRET && BOT_TOKEN);

/** Channel IDs to ingest from — the receipt/supply/other/CEO channels. */
export const monitoredChannels = new Set(
  (process.env.SLACK_MONITORED_CHANNELS ?? "")
    .split(",")
    .map((c) => c.trim())
    .filter(Boolean)
);

interface SlackFile {
  id: string;
  name: string;
  mimetype: string;
  url_private: string;
  filetype: string;
}

export async function downloadSlackFile(file: SlackFile): Promise<Buffer> {
  const res = await fetch(file.url_private, {
    headers: { Authorization: `Bearer ${BOT_TOKEN}` },
  });
  if (!res.ok) {
    throw new Error(`Failed to download Slack file ${file.id}: ${res.status}`);
  }
  return Buffer.from(await res.arrayBuffer());
}

/** Best-effort Slack user id -> email lookup; falls back to the id itself
 * (e.g. if the bot lacks the users:read.email scope). */
export async function lookupSlackUserEmail(userId: string): Promise<string> {
  if (!BOT_TOKEN) return userId;
  try {
    const res = await fetch(`https://slack.com/api/users.info?user=${userId}`, {
      headers: { Authorization: `Bearer ${BOT_TOKEN}` },
    });
    const body = await res.json();
    return body?.user?.profile?.email ?? userId;
  } catch {
    return userId;
  }
}

/**
 * Channels to backfill-search for receipts: SLACK_MONITORED_CHANNELS if set,
 * otherwise every public channel the bot is a member of (requires the
 * `channels:read` bot scope — if that scope is missing, this quietly
 * returns an empty list rather than throwing, same as every other
 * not-yet-configured integration in this app; see SETUP.md).
 */
export async function listChannelsToSearch(): Promise<string[]> {
  if (monitoredChannels.size > 0) return [...monitoredChannels];
  if (!BOT_TOKEN) return [];

  const ids: string[] = [];
  let cursor: string | undefined;
  do {
    const url = new URL("https://slack.com/api/conversations.list");
    url.searchParams.set("types", "public_channel");
    url.searchParams.set("exclude_archived", "true");
    url.searchParams.set("limit", "200");
    if (cursor) url.searchParams.set("cursor", cursor);

    const res = await fetch(url, { headers: { Authorization: `Bearer ${BOT_TOKEN}` } });
    const body = await res.json();
    if (!body.ok) {
      console.log(`[slack] conversations.list unavailable (${body.error}) — set SLACK_MONITORED_CHANNELS to search specific channels instead.`);
      return [];
    }
    for (const c of body.channels ?? []) {
      if (c.is_member && c.id) ids.push(c.id);
    }
    cursor = body.response_metadata?.next_cursor || undefined;
  } while (cursor);

  return ids;
}

export interface SlackHistoryFile {
  id: string;
  name: string;
  mimetype: string;
  url_private: string;
  filetype: string;
}

export interface SlackHistoryMessage {
  ts: string;
  user?: string;
  text?: string;
  files: SlackHistoryFile[];
}

/** Fetches every message with an image/PDF attachment in `channel` since `oldest` (Slack epoch-seconds string), paginating through conversations.history. */
export async function fetchChannelHistory(channel: string, oldest: string): Promise<SlackHistoryMessage[]> {
  if (!BOT_TOKEN) return [];
  const messages: SlackHistoryMessage[] = [];
  let cursor: string | undefined;

  do {
    const url = new URL("https://slack.com/api/conversations.history");
    url.searchParams.set("channel", channel);
    url.searchParams.set("oldest", oldest);
    url.searchParams.set("limit", "200");
    if (cursor) url.searchParams.set("cursor", cursor);

    const res = await fetch(url, { headers: { Authorization: `Bearer ${BOT_TOKEN}` } });
    const body = await res.json();
    if (!body.ok) throw new Error(`conversations.history failed for ${channel}: ${body.error}`);

    for (const m of body.messages ?? []) {
      const files = (m.files ?? []).filter(
        (f: SlackHistoryFile) => f.mimetype?.startsWith("image/") || f.mimetype === "application/pdf"
      );
      if (files.length > 0) {
        messages.push({ ts: m.ts, user: m.user, text: m.text, files });
      }
    }
    cursor = body.response_metadata?.next_cursor || undefined;
  } while (cursor);

  return messages;
}

/** Posts a threaded confirmation/error reply so the team gets feedback
 * without leaving Slack (e.g. "logged to Wanderlust" or "couldn't tell
 * which property — logged to Company Overhead for review"). */
export async function postSlackReply(params: {
  channel: string;
  threadTs: string;
  text: string;
}): Promise<void> {
  if (!BOT_TOKEN) return;
  await fetch("https://slack.com/api/chat.postMessage", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${BOT_TOKEN}`,
      "Content-Type": "application/json; charset=utf-8",
    },
    body: JSON.stringify({
      channel: params.channel,
      thread_ts: params.threadTs,
      text: params.text,
    }),
  });
}
