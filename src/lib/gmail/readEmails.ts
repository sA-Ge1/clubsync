type GmailHeader = {
  name: string;
  value: string;
};

type GmailMessagePart = {
  mimeType?: string;
  body?: {
    data?: string;
  };
  parts?: GmailMessagePart[];
  headers?: GmailHeader[];
};

type GmailMessageListResponse = {
  messages?: Array<{ id: string; threadId?: string }>;
  resultSizeEstimate?: number;
};

type GmailLabelResponse = {
  id: string;
  name: string;
  messagesTotal?: number;
  messagesUnread?: number;
  threadsTotal?: number;
  threadsUnread?: number;
};

type GmailMessageResponse = {
  id: string;
  threadId?: string;
  snippet?: string;
  internalDate?: string;
  labelIds?: string[];
  payload?: GmailMessagePart;
};

export type GmailEmailSummary = {
  id: string;
  threadId: string;
  subject: string;
  from: string;
  date: string;
  snippet: string;
};

export type GmailEmailDetails = GmailEmailSummary & {
  to: string;
  cc: string;
  bodyRaw: string;
  contentType: 'text/html' | 'text/plain';
  labels: string[];
};

export class GmailReadError extends Error {
  status: number;
  response: string;

  constructor(message: string, status: number, response: string) {
    super(message);
    this.name = "GmailReadError";
    this.status = status;
    this.response = response;
  }
}

function getHeaderValue(headers: GmailHeader[] | undefined, name: string): string {
  if (!headers?.length) {
    return "";
  }

  const header = headers.find((h) => h.name.toLowerCase() === name.toLowerCase());
  return header?.value ?? "";
}

function decodeBase64Url(data: string): string {
  const normalized = data.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), "=");
  return Buffer.from(padded, "base64").toString("utf-8");
}

function normalizeBodyText(input: string): string {
  // Single optimized pass: normalize line endings + decode entities + clean whitespace
  return input
    // Normalize line endings (handles \r\n, \r, literal \\r\\n)
    .replace(/\\r\\n|\\n|\r\n|\r/g, "\n")
    // Decode quoted-printable soft wraps
    .replace(/=(\r\n|\n)/g, "")
    // Decode HTML entities (single combined pass)
    .replace(/&nbsp;|&#160;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;|&#x27;/gi, "'")
    .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(Number(dec)))
    .replace(/&#x([\da-fA-F]+);/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    // Decode remaining quoted-printable hex
    .replace(/=([A-Fa-f0-9]{2})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    // Clean up: trim trailing spaces, collapse excess blank lines
    .split("\n")
    .map((line) => line.trim())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function htmlToText(html: string): string {
  // Single pass: strip tags + normalize
  const text = html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|li|tr|h[1-6]|blockquote)>/gi, "\n")
    .replace(/<[^>]+>/g, " ");

  return normalizeBodyText(text);
}

function extractBody(payload: GmailMessagePart | undefined): { raw: string; type: 'text/html' | 'text/plain' } {
  if (!payload) {
    return { raw: "", type: "text/plain" };
  }

  const queue: GmailMessagePart[] = [payload];
  let htmlCandidate = "";
  let plainCandidate = "";

  while (queue.length) {
    const part = queue.shift();
    if (!part) {
      continue;
    }

    const data = part.body?.data;
    if (data) {
      const decoded = decodeBase64Url(data);

      if (part.mimeType === "text/plain" && !plainCandidate) {
        plainCandidate = decoded;
      }

      if (part.mimeType === "text/html" && !htmlCandidate) {
        htmlCandidate = decoded;
      }
    }

    if (part.parts?.length) {
      queue.push(...part.parts);
    }
  }

  // Prefer HTML over plain text
  if (htmlCandidate) {
    return { raw: htmlCandidate, type: "text/html" };
  }

  if (plainCandidate) {
    return { raw: plainCandidate, type: "text/plain" };
  }

  return { raw: "", type: "text/plain" };
}

function mapSummary(msg: GmailMessageResponse): GmailEmailSummary {
  const headers = msg.payload?.headers;

  return {
    id: msg.id,
    threadId: msg.threadId ?? "",
    subject: getHeaderValue(headers, "Subject"),
    from: getHeaderValue(headers, "From"),
    date: getHeaderValue(headers, "Date"),
    snippet: msg.snippet ?? "",
  };
}

async function fetchGmailMessage(options: {
  providerToken: string;
  messageId: string;
  format: "full" | "metadata";
}): Promise<GmailMessageResponse> {
  const metadataHeaders = ["Subject", "From", "Date", "To", "Cc"];
  const metadataParams = metadataHeaders
    .map((header) => `metadataHeaders=${encodeURIComponent(header)}`)
    .join("&");

  const url =
    options.format === "metadata"
      ? `https://gmail.googleapis.com/gmail/v1/users/me/messages/${options.messageId}?format=metadata&${metadataParams}`
      : `https://gmail.googleapis.com/gmail/v1/users/me/messages/${options.messageId}?format=full`;

  const msgRes = await fetch(url, {
    headers: {
      Authorization: `Bearer ${options.providerToken}`,
    },
    cache: "no-store",
  });

  const msgText = await msgRes.text();
  if (!msgRes.ok) {
    throw new GmailReadError("Gmail message fetch failed", msgRes.status, msgText);
  }

  return JSON.parse(msgText) as GmailMessageResponse;
}

async function fetchGmailMessageList(options: {
  providerToken: string;
  limit: number;
  query?: string;
}): Promise<GmailMessageListResponse> {
  const params = new URLSearchParams({
    maxResults: String(options.limit),
  });

  if (options.query) {
    params.set("q", options.query);
  }

  const listRes = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages?${params.toString()}`,
    {
      headers: {
        Authorization: `Bearer ${options.providerToken}`,
      },
      cache: "no-store",
    }
  );

  const listText = await listRes.text();

  if (!listRes.ok) {
    throw new GmailReadError("Gmail list failed", listRes.status, listText);
  }

  return JSON.parse(listText) as GmailMessageListResponse;
}

async function fetchGmailLabel(options: {
  providerToken: string;
  labelId: string;
}): Promise<GmailLabelResponse> {
  const res = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/labels/${encodeURIComponent(options.labelId)}`,
    {
      headers: {
        Authorization: `Bearer ${options.providerToken}`,
      },
      cache: "no-store",
    }
  );

  const text = await res.text();
  if (!res.ok) {
    throw new GmailReadError("Gmail label fetch failed", res.status, text);
  }

  return JSON.parse(text) as GmailLabelResponse;
}

async function fetchGmailLabels(options: {
  providerToken: string;
}): Promise<GmailLabelResponse[]> {
  const res = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/labels`,
    {
      headers: {
        Authorization: `Bearer ${options.providerToken}`,
      },
      cache: "no-store",
    }
  );

  const text = await res.text();
  if (!res.ok) {
    throw new GmailReadError("Gmail labels fetch failed", res.status, text);
  }

  const data = JSON.parse(text) as { labels?: GmailLabelResponse[] };
  return data.labels ?? [];
}

export async function readRecentEmails(options: {
  providerToken: string;
  limit?: number;
}): Promise<GmailEmailSummary[]> {
  const maxResults = Math.min(Math.max(options.limit ?? 5, 1), 50);

  const listData = await fetchGmailMessageList({
    providerToken: options.providerToken,
    limit: maxResults,
  });

  if (!listData.messages?.length) {
    return [];
  }

  const emails: GmailEmailSummary[] = [];

  for (const message of listData.messages) {
    try {
      const msg = await fetchGmailMessage({
        providerToken: options.providerToken,
        messageId: message.id,
        format: "metadata",
      });

      emails.push(mapSummary(msg));
    } catch {
      continue;
    }
  }

  return emails;
}

export async function getUnreadEmailCount(options: {
  providerToken: string;
}): Promise<{ unreadCount: number; inboxUnreadCount: number; totalUnreadCount: number }> {
  const [inboxLabel, unreadLabel] = await Promise.all([
    fetchGmailLabel({ providerToken: options.providerToken, labelId: "INBOX" }),
    fetchGmailLabel({ providerToken: options.providerToken, labelId: "UNREAD" }),
  ]);

  const inboxUnreadCount = inboxLabel.messagesUnread ?? 0;
  const totalUnreadCount = unreadLabel.messagesTotal ?? unreadLabel.messagesUnread ?? 0;

  return {
    unreadCount: inboxUnreadCount,
    inboxUnreadCount,
    totalUnreadCount,
  };
}

export async function readEmailById(options: {
  providerToken: string;
  emailId: string;
}): Promise<GmailEmailDetails> {
  const msg = await fetchGmailMessage({
    providerToken: options.providerToken,
    messageId: options.emailId,
    format: "full",
  });

  const summary = mapSummary(msg);
  const headers = msg.payload?.headers;
  const bodyExtracted = extractBody(msg.payload);

  return {
    ...summary,
    to: getHeaderValue(headers, "To"),
    cc: getHeaderValue(headers, "Cc"),
    bodyRaw: bodyExtracted.raw,
    contentType: bodyExtracted.type,
    labels: msg.labelIds ?? [],
  };
}

export async function listEmailsByLabel(options: {
  providerToken: string;
  labelId?: string;
  limit?: number;
}): Promise<GmailEmailSummary[]> {
  const maxResults = Math.min(Math.max(options.limit ?? 5, 1), 50);
  const query = options.labelId ? `in:${options.labelId}` : undefined;

  const listData = await fetchGmailMessageList({
    providerToken: options.providerToken,
    limit: maxResults,
    query,
  });

  if (!listData.messages?.length) {
    return [];
  }

  const emails: GmailEmailSummary[] = [];

  for (const message of listData.messages) {
    try {
      const msg = await fetchGmailMessage({
        providerToken: options.providerToken,
        messageId: message.id,
        format: "metadata",
      });

      emails.push(mapSummary(msg));
    } catch {
      continue;
    }
  }

  return emails;
}

export async function searchEmails(options: {
  providerToken: string;
  query: string;
  limit?: number;
}): Promise<GmailEmailSummary[]> {
  const maxResults = Math.min(Math.max(options.limit ?? 5, 1), 50);

  const listData = await fetchGmailMessageList({
    providerToken: options.providerToken,
    limit: maxResults,
    query: options.query,
  });

  if (!listData.messages?.length) {
    return [];
  }

  const emails: GmailEmailSummary[] = [];

  for (const message of listData.messages) {
    try {
      const msg = await fetchGmailMessage({
        providerToken: options.providerToken,
        messageId: message.id,
        format: "metadata",
      });

      emails.push(mapSummary(msg));
    } catch {
      continue;
    }
  }

  return emails;
}

export async function getAvailableLabels(options: {
  providerToken: string;
}): Promise<Array<{ id: string; name: string; messagesUnread?: number }>> {
  const labels = await fetchGmailLabels({
    providerToken: options.providerToken,
  });

  return labels.map((label) => ({
    id: label.id,
    name: label.name,
    messagesUnread: label.messagesUnread,
  }));
}

