type GmailHeader = {
  name: string;
  value: string;
};

type GmailMessageResponse = {
  id: string;
  threadId?: string;
  payload?: {
    headers?: GmailHeader[];
  };
};

export class GmailSendError extends Error {
  status: number;
  response: string;

  constructor(message: string, status: number, response: string) {
    super(message);
    this.name = "GmailSendError";
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

export function parseEmailAddress(raw: string): string {
  const trimmed = raw.trim();
  const bracketMatch = trimmed.match(/<([^>]+)>/);
  if (bracketMatch?.[1]) {
    return bracketMatch[1].trim();
  }
  return trimmed;
}

function encodeBase64Url(input: string): string {
  return Buffer.from(input, "utf-8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function normalizeSubject(subject: string): string {
  const trimmed = subject.trim();
  if (!trimmed) {
    return "(no subject)";
  }
  return trimmed;
}

export async function getReplyContext(options: {
  providerToken: string;
  replyToEmailId: string;
}): Promise<{
  threadId: string;
  to: string;
  originalSubject: string;
  inReplyTo: string;
  references: string;
}> {
  const metadataHeaders = ["From", "Subject", "Message-ID", "References"]
    .map((header) => `metadataHeaders=${encodeURIComponent(header)}`)
    .join("&");

  const url = `https://gmail.googleapis.com/gmail/v1/users/me/messages/${encodeURIComponent(options.replyToEmailId)}?format=metadata&${metadataHeaders}`;

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${options.providerToken}`,
    },
    cache: "no-store",
  });

  const text = await response.text();
  if (!response.ok) {
    throw new GmailSendError("Failed to fetch original email for reply", response.status, text);
  }

  const msg = JSON.parse(text) as GmailMessageResponse;
  const headers = msg.payload?.headers;
  const fromRaw = getHeaderValue(headers, "From");
  const subject = getHeaderValue(headers, "Subject");
  const messageId = getHeaderValue(headers, "Message-ID");
  const references = getHeaderValue(headers, "References");

  if (!msg.threadId || !fromRaw || !messageId) {
    throw new GmailSendError(
      "Original email is missing required reply metadata",
      422,
      "threadId/from/message-id not available"
    );
  }

  return {
    threadId: msg.threadId,
    to: parseEmailAddress(fromRaw),
    originalSubject: subject,
    inReplyTo: messageId,
    references: references ? `${references} ${messageId}`.trim() : messageId,
  };
}

export async function sendGmailEmail(options: {
  providerToken: string;
  to: string;
  subject: string;
  body: string;
  threadId?: string;
  inReplyTo?: string;
  references?: string;
  isHtml?: boolean;
}): Promise<{ id: string; threadId?: string }> {
  const contentType = options.isHtml ? "text/html" : "text/plain";
  const headers = [
    `To: ${options.to}`,
    `Content-Type: ${contentType}; charset=UTF-8`,
    "MIME-Version: 1.0",
    `Subject: ${normalizeSubject(options.subject)}`,
  ];

  if (options.inReplyTo) {
    headers.push(`In-Reply-To: ${options.inReplyTo}`);
  }

  if (options.references) {
    headers.push(`References: ${options.references}`);
  }

  const mimeMessage = `${headers.join("\r\n")}\r\n\r\n${options.body}`;
  const raw = encodeBase64Url(mimeMessage);

  const payload: Record<string, string> = { raw };
  if (options.threadId) {
    payload.threadId = options.threadId;
  }

  const response = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${options.providerToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
    cache: "no-store",
  });

  const text = await response.text();
  if (!response.ok) {
    throw new GmailSendError("Failed to send Gmail message", response.status, text);
  }

  const data = JSON.parse(text) as { id: string; threadId?: string };
  return {
    id: data.id,
    threadId: data.threadId,
  };
}