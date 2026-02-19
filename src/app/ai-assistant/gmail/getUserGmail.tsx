type GmailEmail = {
  id: string;
  subject: string;
  from: string;
  date: string;
  body: string;
};

function htmlToText(html: string): string {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  return (doc.body.textContent || "").replace(/\n\s*\n/g, "\n").trim();
}

export async function getUserEmails(provider_token: string): Promise<GmailEmail[]> {

  // 1. Get list of messages
  const listRes = await fetch(
    "https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=5",
    {
      headers: {
        Authorization: `Bearer ${provider_token}`,
      },
    }
  );

  const listData = await listRes.json();

  if (!listData.messages) return [];

  const emails: GmailEmail[] = [];

  for (const m of listData.messages) {

    // 2. Fetch full email
    const msgRes = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages/${m.id}`,
      {
        headers: {
          Authorization: `Bearer ${provider_token}`,
        },
      }
    );

    const msg = await msgRes.json();

    type GmailHeader = { name: string; value: string };

    const headers = msg.payload.headers as GmailHeader[];

    const getHeader = (name: string) =>
      headers.find(h => h.name === name)?.value || "";

    // 3. Decode body
    const rawBody = msg.payload.body?.data;

    const decodedBody = rawBody
      ? decodeURIComponent(
          escape(
            atob(
              rawBody
                .replace(/-/g, "+")
                .replace(/_/g, "/")
            )
          )
        )
      : "";

    emails.push({
      id: msg.id,
      subject: getHeader("Subject"),
      from: getHeader("From"),
      date: getHeader("Date"),
      body: htmlToText(decodedBody),
    });
  }

  return emails;
}
