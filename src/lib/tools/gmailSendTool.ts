import { z } from "zod";
import { createClient } from "../supabase/server";
import { getReplyContext, GmailSendError } from "../gmail/sendEmails";

const optionalTrimmedString = () =>
  z.preprocess(
    (value) => {
      if (typeof value !== "string") {
        return value;
      }

      const trimmed = value.trim();
      return trimmed.length === 0 ? undefined : trimmed;
    },
    z.string().optional()
  );

export const gmailSendTool = {
  description:
    "Prepare an email draft for user confirmation before sending. Call with reply (email id) for replies, or to (recipient email) for new emails, plus subject and body. If reply is present it takes precedence. The tool fetches reply context and always returns a confirmation draft; it never sends directly.",

  inputSchema: z.object({
    reply: optionalTrimmedString(),
    to: z.preprocess(
      (value) => {
        if (typeof value !== "string") {
          return value;
        }

        const trimmed = value.trim();
        return trimmed.length === 0 ? undefined : trimmed;
      },
      z.string().email().optional()
    ),
    subject: z.string().min(1),
    body: z.string().min(1),
    isHtml: z.boolean().optional(),
  }),

  execute: async ({
    reply,
    to,
    subject,
    body,
    isHtml,
  }: {
    reply?: string;
    to?: string;
    subject: string;
    body: string;
    isHtml?: boolean;
  }) => {
    const supabase = await createClient();

    const {
      data: { session },
    } = await supabase.auth.getSession();

    const providerToken = session?.provider_token;
    if (!providerToken) {
      return {
        mode: "auth_error",
        reconnectRequired: true,
        message: "Gmail is not connected for this account. Sign in with Google to connect Gmail.",
      };
    }

    const trimmedSubject = subject.trim();
    const trimmedBody = body.trim();
    const trimmedTo = to?.trim();
    const trimmedReplyId = reply?.trim();

    if (!trimmedSubject || !trimmedBody) {
      return {
        mode: "validation_error",
        message: "Both subject and body are required.",
      };
    }

    if (!trimmedReplyId && !trimmedTo) {
      return {
        mode: "validation_error",
        message: "Provide a target: reply (email id) for reply, or to (recipient email) for new email.",
      };
    }

    try {
      if (trimmedReplyId) {
        const replyContext = await getReplyContext({
          providerToken,
          replyToEmailId: trimmedReplyId,
        });

        return {
          mode: "confirmation_required",
          action: "reply",
          draft: {
            to: replyContext.to,
            subject: trimmedSubject,
            body: trimmedBody,
            replyToEmailId: trimmedReplyId,
            threadId: replyContext.threadId,
            inReplyTo: replyContext.inReplyTo,
            references: replyContext.references,
            isHtml,
          },
          message:
            "Draft prepared for reply. Ask the user to review, edit, and confirm sending from the UI.",
        };
      }

      return {
        mode: "confirmation_required",
        action: "new",
        draft: {
          to: trimmedTo,
          subject: trimmedSubject,
          body: trimmedBody,
          isHtml,
        },
        message:
          "Draft prepared for new email. Ask the user to review, edit, and confirm sending from the UI.",
      };
    } catch (err) {
      if (err instanceof GmailSendError) {
        if (err.status === 401 || err.status === 403) {
          return {
            mode: "auth_error",
            reconnectRequired: true,
            message: "Gmail authorization expired or missing. Reconnect Google and try again.",
            status: err.status,
          };
        }

        throw new Error(
          `Failed to prepare Gmail draft (status ${err.status}): ${err.response || "Unknown error"}`
        );
      }

      throw err;
    }
  },
};