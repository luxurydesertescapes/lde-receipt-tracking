import { google } from "googleapis";

const SCOPES = [
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/userinfo.email",
  "openid",
];

// Senders/subjects worth pulling in automatically. Kept intentionally
// narrow (vendor order confirmations + generic invoice/receipt language)
// rather than "everything with an attachment" — a hallway inbox has a lot
// of PDF attachments that aren't expenses.
const VENDOR_QUERY =
  '(from:amazon.com OR from:instacart.com OR from:costco.com OR from:homedepot.com ' +
  'OR subject:invoice OR subject:receipt OR subject:"order confirmation" OR subject:"your order")';

function oauthClient(redirectUri: string) {
  const clientId = process.env.GOOGLE_GMAIL_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_GMAIL_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error(
      "GOOGLE_GMAIL_CLIENT_ID/GOOGLE_GMAIL_CLIENT_SECRET are not set. See SETUP.md."
    );
  }
  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
}

/**
 * Where to send an inbox owner to grant read-only Gmail access. `redirectUri`
 * is derived from the connecting request's own origin (see the /connect
 * route) rather than an env var, so it always matches whatever host the
 * admin is actually using — it must exactly match one of the redirect URIs
 * registered on the Google Cloud OAuth client (see SETUP.md).
 */
export function getAuthUrl(redirectUri: string, state: string): string {
  const client = oauthClient(redirectUri);
  return client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent", // forces a refresh_token even on a re-consent
    scope: SCOPES,
    state,
  });
}

/**
 * Exchanges the OAuth callback `code` for tokens, and returns the actual
 * authenticated email (from Google's own userinfo, not a client-supplied
 * value) plus the refresh token to persist.
 */
export async function exchangeCodeForAccount(
  code: string,
  redirectUri: string
): Promise<{ email: string; refreshToken: string }> {
  const client = oauthClient(redirectUri);
  const { tokens } = await client.getToken(code);
  if (!tokens.refresh_token) {
    throw new Error(
      "Google did not return a refresh token. This can happen on a re-connect without " +
        "revoking prior access first — remove the app from https://myaccount.google.com/permissions and try again."
    );
  }
  client.setCredentials(tokens);
  const oauth2 = google.oauth2({ version: "v2", auth: client });
  const info = await oauth2.userinfo.get();
  if (!info.data.email) throw new Error("Google did not return an email address for this account.");
  return { email: info.data.email, refreshToken: tokens.refresh_token };
}

function clientForRefreshToken(refreshToken: string) {
  // redirect_uri isn't used by the refresh_token grant, only by the initial
  // code exchange, so an empty string is fine here.
  const client = oauthClient("");
  client.setCredentials({ refresh_token: refreshToken });
  return client;
}

export interface EmailAttachment {
  filename: string;
  mimeType: string;
  data: Buffer;
}

export interface EmailMatch {
  messageId: string;
  subject: string;
  from: string;
  date: Date;
  bodyText: string;
  attachments: EmailAttachment[];
}

interface GmailPart {
  mimeType?: string | null;
  filename?: string | null;
  body?: { data?: string | null; attachmentId?: string | null } | null;
  parts?: GmailPart[] | null;
}

function decodeBase64Url(data: string): Buffer {
  return Buffer.from(data, "base64url");
}

function findParts(part: GmailPart, predicate: (p: GmailPart) => boolean, out: GmailPart[] = []): GmailPart[] {
  if (predicate(part)) out.push(part);
  for (const child of part.parts ?? []) findParts(child, predicate, out);
  return out;
}

/**
 * Searches one connected inbox for vendor receipts/invoices since `after`,
 * skipping anything whose Gmail message id is already in `seenMessageIds`
 * (already-ingested). Returns full message content (body text + any
 * attachments, fetched eagerly since the caller needs the bytes either way).
 */
export async function searchVendorEmails(
  refreshToken: string,
  after: Date,
  seenMessageIds: Set<string>
): Promise<EmailMatch[]> {
  const auth = clientForRefreshToken(refreshToken);
  const gmail = google.gmail({ version: "v1", auth });

  const afterStr = `${after.getFullYear()}/${String(after.getMonth() + 1).padStart(2, "0")}/${String(after.getDate()).padStart(2, "0")}`;
  const list = await gmail.users.messages.list({
    userId: "me",
    q: `${VENDOR_QUERY} after:${afterStr}`,
    maxResults: 50,
  });

  const matches: EmailMatch[] = [];
  for (const ref of list.data.messages ?? []) {
    if (!ref.id || seenMessageIds.has(ref.id)) continue;

    const msg = await gmail.users.messages.get({ userId: "me", id: ref.id, format: "full" });
    const payload = msg.data.payload as GmailPart | undefined;
    if (!payload) continue;

    const headers = msg.data.payload?.headers ?? [];
    const subject = headers.find((h) => h.name?.toLowerCase() === "subject")?.value ?? "(no subject)";
    const from = headers.find((h) => h.name?.toLowerCase() === "from")?.value ?? "(unknown sender)";
    const date = msg.data.internalDate ? new Date(Number(msg.data.internalDate)) : new Date();

    const textParts = findParts(payload, (p) => p.mimeType === "text/plain" && Boolean(p.body?.data));
    const bodyText = textParts.map((p) => decodeBase64Url(p.body!.data!).toString("utf-8")).join("\n");

    const attachmentParts = findParts(
      payload,
      (p) => Boolean(p.filename) && Boolean(p.body?.attachmentId)
    );
    const attachments: EmailAttachment[] = [];
    for (const p of attachmentParts) {
      const att = await gmail.users.messages.attachments.get({
        userId: "me",
        messageId: ref.id,
        id: p.body!.attachmentId!,
      });
      if (!att.data.data) continue;
      attachments.push({
        filename: p.filename!,
        mimeType: p.mimeType ?? "application/octet-stream",
        data: decodeBase64Url(att.data.data),
      });
    }

    matches.push({ messageId: ref.id, subject, from, date, bodyText, attachments });
  }

  return matches;
}
