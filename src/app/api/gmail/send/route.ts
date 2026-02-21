import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { GmailSendError, sendGmailEmail } from "@/lib/gmail/sendEmails";

type SendPayload = {
  to?: string;
  subject?: string;
  body?: string;
  threadId?: string;
  inReplyTo?: string;
  references?: string;
  isHtml?: boolean;
};

export async function POST(req: NextRequest) {
  try {
    let body: SendPayload = {};
    try {
      body = await req.json();
    } catch {
      body = {};
    }

    const to = body.to?.trim();
    const subject = body.subject?.trim();
    const content = body.body?.trim();

    if (!to || !subject || !content) {
      return NextResponse.json(
        {
          error: "Validation failed",
          message: "to, subject, and body are required.",
        },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();

    const providerToken = session?.provider_token;
    if (!providerToken) {
      return NextResponse.json(
        {
          error: "Gmail not connected",
          reconnectRequired: true,
        },
        { status: 401 }
      );
    }

    const sent = await sendGmailEmail({
      providerToken,
      to,
      subject,
      body: content,
      threadId: body.threadId,
      inReplyTo: body.inReplyTo,
      references: body.references,
      isHtml: body.isHtml,
    });

    return NextResponse.json({
      success: true,
      id: sent.id,
      threadId: sent.threadId,
    });
  } catch (err: unknown) {
    if (err instanceof GmailSendError) {
      return NextResponse.json(
        {
          error: err.message,
          status: err.status,
          response: err.response,
          reconnectRequired: err.status === 401 || err.status === 403,
        },
        { status: err.status }
      );
    }

    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json(
      {
        error: "Internal server error",
        message,
      },
      { status: 500 }
    );
  }
}