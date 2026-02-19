import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  GmailReadError,
  readEmailById,
  readRecentEmails,
  searchEmails,
} from "@/lib/gmail/readEmails";

export async function POST(req: NextRequest) {
  try {
    let body: {
      intent?: "list" | "detail" | "search";
      limit?: number;
      emailId?: string;
      searchQuery?: string;
    } = {};
    try {
      body = await req.json();
    } catch {
      body = {};
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

    // Handle search intent
    if (body.intent === "search") {
      if (!body.searchQuery) {
        return NextResponse.json(
          {
            mode: "validation_error",
            message: "Search query is required for search intent.",
          },
          { status: 400 }
        );
      }

      const results = await searchEmails({
        providerToken,
        query: body.searchQuery,
        limit: body.limit,
      });

      return NextResponse.json({
        mode: "search",
        query: body.searchQuery,
        count: results.length,
        emails: results,
      });
    }

    // Continue with existing logic
    const normalizedEmailId = body.emailId?.trim();
    const resolvedIntent = body.intent ?? (normalizedEmailId ? "detail" : undefined);

    if (resolvedIntent === "detail") {
      if (!normalizedEmailId) {
        return NextResponse.json(
          {
            mode: "validation_error",
            message:
              "emailId is required for detail mode. Use the exact value from emails[].id returned by list mode (do not use threadId or numeric index).",
            help: {
              example: {
                intent: "detail",
                emailId: "<email.id>",
              },
            },
          },
          { status: 400 }
        );
      }

      const email = await readEmailById({
        providerToken,
        emailId: normalizedEmailId,
      });

      return NextResponse.json({
        mode: "detail",
        email,
      });
    }

    const emails = await readRecentEmails({
      providerToken,
      limit: body.limit,
    });

    return NextResponse.json({
      mode: "list",
      count: emails.length,
      emails,
    });
  } catch (err: unknown) {
    if (err instanceof GmailReadError) {
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

