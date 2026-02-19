import { z } from "zod";
import { createClient } from "../supabase/server";
import {
  GmailReadError,
  readEmailById,
  readRecentEmails,
  searchEmails,
} from "../gmail/readEmails";

export const gmailReadTool = {

  description:
    "Gmail read-only interface. List recent emails, select the relevant email object from emails[] using user clues, pass that exact email.id to detail for full content, or search emails with a query.",

  inputSchema: z.object({
    intent: z.enum(["list", "detail", "search"]).optional(),
    limit: z.number().min(1).max(50).optional(),
    emailId: z.string().optional(),
    searchQuery: z.string().optional(),
  }),

  execute: async (
    {
      intent,
      limit,
      emailId,
      searchQuery,
    }: {
      intent?: "list" | "detail" | "search";
      limit?: number;
      emailId?: string;
      searchQuery?: string;
    }
  ) => {
     const supabase = await createClient();

    // Get session
    const {
      data: { session }
    } = await supabase.auth.getSession();
    const provider_token = session?.provider_token;

    if (!provider_token) {
      return {
        mode: "auth_error",
        reconnectRequired: true,
        message: "Gmail is not connected for this account. Sign in with Google to connect Gmail.",
      };
    }

    const normalizedEmailId = emailId?.trim();

    // Handle search intent
    try {
      if (intent === "search") {
        if (!searchQuery) {
          return {
            mode: "validation_error",
            message: "Search query is required for search intent.",
            help: {
              example: {
                intent: "search",
                searchQuery: "from:alice@example.com is:unread",
                limit: 10,
              },
            },
          };
        }

        const results = await searchEmails({
          providerToken: provider_token,
          query: searchQuery,
          limit,
        });

        return {
          mode: "search",
          query: searchQuery,
          count: results.length,
          emails: results,
        };
      }
    } catch (err) {
      if (err instanceof GmailReadError) {
        if (err.status === 401 || err.status === 403) {
          return {
            mode: "auth_error",
            reconnectRequired: true,
            message: "Gmail authorization expired or missing. Reconnect Google and try again.",
            status: err.status,
          };
        }

        throw new Error(
          `Failed to fetch Gmail (status ${err.status}): ${err.response || "Unknown error"}`
        );
      }
      throw err;
    }

    // Continue with list/detail logic
    const resolvedIntent = intent ?? (normalizedEmailId ? "detail" : undefined);

    try {
      if (resolvedIntent === "detail") {
        if (!normalizedEmailId) {
          return {
            mode: "validation_error",
            message:
              "emailId is required for detail mode. Use the exact value from emails[].id returned by list mode (do not use threadId or numeric index).",
            help: {
              example: {
                intent: "detail",
                emailId: "<email.id>",
              },
            },
          };
        }

        const email = await readEmailById({
          providerToken: provider_token,
          emailId: normalizedEmailId,
        });

        return {
          mode: "detail",
          email,
        };
      }

      const emails = await readRecentEmails({
        providerToken: provider_token,
        limit,
      });

      return {
        mode: "list",
        count: emails.length,
        emails,
      };
    } catch (err) {
      if (err instanceof GmailReadError) {
        if (err.status === 401 || err.status === 403) {
          return {
            mode: "auth_error",
            reconnectRequired: true,
            message: "Gmail authorization expired or missing. Reconnect Google and try again.",
            status: err.status,
          };
        }

        throw new Error(
          `Failed to fetch Gmail (status ${err.status}): ${err.response || "Unknown error"}`
        );
      }
      throw err;
    }
  }
};
