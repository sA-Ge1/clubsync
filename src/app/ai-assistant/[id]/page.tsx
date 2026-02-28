"use client";
import { memo, useMemo, useRef, useState, useEffect } from "react";
import type { UIMessage } from "ai";
import { AppSidebar } from "../components/app-sidebar";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { useParams } from "next/navigation";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import {
  PromptInput,
  PromptInputAction,
  PromptInputActions,
  PromptInputTextarea,
} from "@/components/ui/prompt-input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tool } from "@/components/ui/tool";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  ChatContainerContent,
  ChatContainerRoot,
  ChatContainerScrollAnchor,
} from "@/components/ui/chat-container";
import {
  Message,
  MessageContent,
  MessageAction,
  MessageActions,
} from "@/components/ui/message";
import {
  ArrowUp,
  Bug,
  ChartNoAxesColumn,
  CheckCheck,
  Copy,
  Database,
  Download,
  Eye,
  FileText,
  Globe,
  Home,
  Loader2,
  Mail,
  Network,
  RefreshCcw,
  RefreshCw,
  SendHorizontal,
  Square,
  Volume2,
  VolumeOff,
  Wrench,
} from "lucide-react";
import { useUserInfo } from "@/hooks/useUserInfo";
import { cn } from "@/lib/utils";
import { useKeyVault } from "@/components/ui/useKeyVault";
import { KeyManagerDialog } from "@/components/ui/KeyManager";
import { AIMode, ModeToggle } from "@/components/ui/ModeToggle";
import { parseModelValue } from "@/components/ui/models";
import { ModelCombobox } from "@/components/ui/ModelSelect";
import { PromptSuggestion } from "@/components/ui/prompt-suggestion";
import { Markdown } from "@/components/Markdown";
import { MorphingText } from "@/components/ui/morphing-text";
import { useRouter } from "next/navigation";
import { ScrollButton } from "@/components/ui/scroll-button";
import { SystemMessage } from "@/components/ui/system-message";
import { marked } from "marked";
import removeMarkdown from "remove-markdown";
import { supabase } from "@/lib/supabaseClient";
import {
  ChainOfThought,
  ChainOfThoughtContent,
  ChainOfThoughtItem,
  ChainOfThoughtStep,
  ChainOfThoughtTrigger,
} from "@/components/ui/chain-of-thought";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type EmailSendState = {
  status: "sending" | "sent" | "error" | "cancelled";
  message?: string;
};

type EmailSendPayload = {
  to: string;
  subject: string;
  body: string;
  threadId?: string;
  inReplyTo?: string;
  references?: string;
  isHtml?: boolean;
};

type EmailDraft = {
  to?: string;
  subject?: string;
  body?: string;
  threadId?: string;
  inReplyTo?: string;
  references?: string;
  isHtml?: boolean;
};

function EmailSendConfirmationCard({
  toolPart,
  sendState,
  onConfirm,
  onCancel,
  isLatestMessage = true,
}: {
  toolPart: any;
  sendState?: EmailSendState;
  onConfirm: (toolCallId: string, payload: EmailSendPayload) => void;
  onCancel: (toolCallId: string) => void;
  isLatestMessage?: boolean;
}) {
  const output = toolPart?.output as
    | {
        mode?: string;
        action?: "new" | "reply";
        draft?: EmailDraft;
      }
    | undefined;

  const toolCallId = toolPart?.toolCallId as string | undefined;
  const draft = output?.draft;

  const [to, setTo] = useState(draft?.to ?? "");
  const [subject, setSubject] = useState(draft?.subject ?? "");
  const [body, setBody] = useState(draft?.body ?? "");
  const [isHtml, setIsHtml] = useState(draft?.isHtml ?? false);

  useEffect(() => {
    setTo(draft?.to ?? "");
    setSubject(draft?.subject ?? "");
    setBody(draft?.body ?? "");
    setIsHtml(draft?.isHtml ?? false);
  }, [toolCallId, draft?.to, draft?.subject, draft?.body, draft?.isHtml]);

  if (
    toolPart?.state !== "output-available" ||
    output?.mode !== "confirmation_required" ||
    !draft ||
    !toolCallId
  ) {
    return null;
  }

  const isSending = sendState?.status === "sending";
  const isSent = sendState?.status === "sent";
  const isCancelled = sendState?.status === "cancelled";
  const isLocked = isSent || isCancelled || !isLatestMessage;
  const canConfirm =
    Boolean(to.trim()) &&
    Boolean(subject.trim()) &&
    Boolean(body.trim()) &&
    !isSending &&
    !isLocked;

  return (
    <div className="rounded-xl my-10 border-b bg-card p-4 space-y-3">
      <div>
        <h4 className="text-md font-semibold mb-1">Confirm Email</h4>
        <p className="text-sm text-muted-foreground">
          {output.action === "reply" ? "Reply draft" : "New email draft"} ready. Review and edit before sending.
        </p>
      </div>

      <div className="space-y-1 flex items-center justify-start gap-2">
        <Label htmlFor={`email-to-${toolCallId}`}>To:</Label>
        <Input
          id={`email-to-${toolCallId}`}
          value={to}
          className="w-auto text-blue-500"
          disabled={isLocked || isSending}
          onChange={(e) => setTo(e.target.value)}
          placeholder="recipient@example.com"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor={`email-subject-${toolCallId}`}>Subject:</Label>
        <Input
          id={`email-subject-${toolCallId}`}
          value={subject}
          className="w-auto"
          disabled={isLocked || isSending}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="Email subject"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor={`email-body-${toolCallId}`}>Message:</Label>
        <Textarea
          id={`email-body-${toolCallId}`}
          value={body}
          disabled={isLocked || isSending}
          onChange={(e) => setBody(e.target.value)}
          className="min-h-28"
          placeholder="Write your email body"
        />
      </div>

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id={`email-html-${toolCallId}`}
          checked={isHtml}
          disabled={isLocked || isSending}
          onChange={(e) => setIsHtml(e.target.checked)}
          className="rounded"
        />
        <Label htmlFor={`email-html-${toolCallId}`} className="text-xs cursor-pointer">
          Format as HTML
        </Label>
      </div>

      <div className="flex items-center gap-2">
        <Button
          size="sm"
          onClick={() =>
            onConfirm(toolCallId, {
              to: to.trim(),
              subject: subject.trim(),
              body: body.trim(),
              threadId: draft.threadId,
              inReplyTo: draft.inReplyTo,
              references: draft.references,
              isHtml,
            })
          }
          disabled={!canConfirm}
        >
          {isSending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Sending...
            </>
          ) : isSent ? (
            "Sent"
          ) : !isLatestMessage ? (
            "Expired"
          ) : (
            "Confirm & Send"
          )}
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => onCancel(toolCallId)}
          disabled={isSending || isSent || isCancelled || !isLatestMessage}
        >
          {isCancelled ? "Cancelled" : !isLatestMessage ? "Expired" : "Cancel"}
        </Button>
      </div>

      {sendState?.message && (
        <p
          className={cn(
            "text-xs",
            sendState.status === "error" ? "text-destructive" : "text-muted-foreground"
          )}
        >
          {sendState.message}
        </p>
      )}
    </div>
  );
}

function EmailDetailView({ email }: { email: any }) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [iframeHeight, setIframeHeight] = useState(200);

  const handleIframeLoad = () => {
    if (iframeRef.current?.contentDocument) {
      setTimeout(() => {
        const doc = iframeRef.current?.contentDocument;
        if (doc) {
          const height = doc.documentElement.scrollHeight || doc.body.scrollHeight;
          setIframeHeight(Math.max(height, 200));
        }
      }, 100);
    }
  };

  useEffect(() => {
    if (iframeRef.current?.contentDocument) {
      handleIframeLoad();
      
      // Add ResizeObserver for dynamic height adjustments
      const resizeObserver = new ResizeObserver(() => {
        const doc = iframeRef.current?.contentDocument;
        if (doc) {
          const height = doc.documentElement.scrollHeight || doc.body.scrollHeight;
          setIframeHeight(height);
        }
      });
      
      resizeObserver.observe(iframeRef.current.contentDocument.body);
      
      return () => resizeObserver.disconnect();
    }
  }, [email.id]);

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });
    } catch {
      return dateStr;
    }
  };

  const normalizeBodyText = (input: string): string => {
    return input
      .replace(/\\r\\n|\\n|\r\n|\r/g, "\n")
      .replace(/=(\r\n|\n)/g, "")
      .replace(/&nbsp;|&#160;/gi, " ")
      .replace(/&amp;/gi, "&")
      .replace(/&lt;/gi, "<")
      .replace(/&gt;/gi, ">")
      .replace(/&quot;/gi, '"')
      .replace(/&#39;|&apos;|&#x27;/gi, "'")
      .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(Number(dec)))
      .replace(/&#x([\da-fA-F]+);/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
      .replace(/=([A-Fa-f0-9]{2})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
      .split("\n")
      .map((line) => line.trim())
      .join("\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  };

  const getDisplayBody = () => {
    if (!email.bodyRaw) return null;

    if (email.contentType === 'text/html') {
      return email.bodyRaw;
    }

    return null;
  };
const buildIframeDoc = (rawHtml: string) => {
  const hasFullDocument = /<\s*!doctype\s+html/i.test(rawHtml) || /<\s*html[\s>]/i.test(rawHtml);

  if (hasFullDocument) {
    return rawHtml;
  }

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8" />
        <style>
          html, body {
            margin: 2px;
            padding: 2px;
            background: #f3f4f6;
            color: #111827;
            font-family: system-ui, -apple-system, sans-serif;
          }

          /* Keep wide email content inside viewport */
          body * {
            max-width: 100%;
          }

          /* Fix common email issues */
          img {
            max-width: 100%;
            height: auto;
          }

          table {
            max-width: 100%;
          }
        </style>
      </head>
      <body>
        ${rawHtml}
      </body>
    </html>
  `;
};
const renderBody = () => {
  const htmlBody = getDisplayBody();
  

  if (htmlBody) {
    return (
      <iframe
        key={email.id}
        ref={iframeRef}
        srcDoc={buildIframeDoc(htmlBody)}
        onLoad={handleIframeLoad}
        sandbox="allow-same-origin"
        className="w-full border-0"
        style={{ height: iframeHeight, minHeight: 200 }}
      />
    );
  }

  return (
    <div className="whitespace-pre-wrap text-foreground">
      {email.bodyRaw
        ? normalizeBodyText(email.bodyRaw)
        : "(Empty message)"}
    </div>
  );
};



return (
  <div className="min-h-screen w-full bg-background px-3 sm:px-6 py-6 sm:py-10 flex justify-start">
    <div className="w-full max-w-3xl rounded-2xl border bg-card shadow-sm overflow-hidden">

      {/* Header */}
      <div className="p-4 sm:p-6 border-b">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">

          {/* Left Section */}
          <div className="flex gap-3 sm:gap-4 min-w-0">
            <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-full bg-muted flex items-center justify-center text-sm font-semibold shrink-0">
              {email.from?.[0]?.toUpperCase()}
            </div>

            <div className="space-y-1 min-w-0">
              <h2 className="text-base sm:text-lg font-semibold leading-tight break-words">
                {email.subject || "No subject"}
              </h2>

              <div className="text-xs sm:text-sm text-muted-foreground break-words">
                <span className="font-medium text-foreground">
                  {email.from}
                </span>
                {email.to && <> → {email.to}</>}
              </div>

              {email.cc && (
                <div className="text-xs text-muted-foreground break-words">
                  CC: {email.cc}
                </div>
              )}
            </div>
          </div>

          {/* Date */}
          <div className="text-xs text-muted-foreground whitespace-nowrap sm:text-right">
            {formatDate(email.date)}
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="px-4 sm:px-6 py-5 sm:py-2">
        {renderBody()}
      </div>

    </div>
  </div>
);


}

export const ChatMessage = memo(function ChatMessage({
  message,
  status,
  copiedId,
  setCopiedId,
  onRegenerate,
  isLastAssistant,
  speakingId,
  onReadAloud,
  onReconnectGmail,
  emailSendStates,
  onConfirmEmailSend,
  onCancelEmailSend,
  devMode
}: any) {
  const isAssistant = message.role === "assistant";
  const toolParts = (Array.isArray(message?.parts) ? message.parts : []).filter(
    (part: any) => typeof part?.type === "string" && part.type.startsWith("tool-")
  );
  const firstToolPartIndex = (Array.isArray(message?.parts) ? message.parts : []).findIndex(
    (part: any) => typeof part?.type === "string" && part.type.startsWith("tool-")
  );

  async function handleCopyMessage() {
    const plainText = getMessageText(message);
    const htmlText = await Promise.resolve(marked.parse(plainText));

    try {
      await navigator.clipboard.write([
        new ClipboardItem({
          "text/plain": new Blob([plainText], { type: "text/plain" }),
          "text/html": new Blob([htmlText], { type: "text/html" }),
        }),
      ]);
    } catch (err) {
      await navigator.clipboard.writeText(plainText);
    }

    setCopiedId(message.id);
    setTimeout(() => setCopiedId(""), 2000);
  }

  return (
    <Message
      className={cn(
        "gap-1",
        isAssistant
          ? "justify-start flex-col group"
          : "justify-end flex-col group",
      )}
    >
      <div
        className={cn(
          "break-words min-w-0",
          isAssistant
            ? "max-w-full"
            : "max-w-[80%] sm:max-w-[50%] ml-auto w-fit min-w-[40px]",
        )}
      >
        {message.parts.map((part: any, i: number) => {
          if (part.type === "text") {
            return (
              <TextPart
                key={i}
                text={part.text}
                isAssistant={isAssistant}
                isStreaming={status === "streaming"}
              />
            );
          }

          if (part.type === "tool-sql") {
            if (!devMode) {
              if (i !== firstToolPartIndex) return null;
              return (
                <div key={i} className="space-y-3">
                  <ToolExecutionSummary toolParts={toolParts} />
                </div>
              );
            }
            return (
              <div key={i} className="space-y-3">
                <Tool toolPart={part} />
              </div>
            );
          }

          if (part.type === "tool-report") {
            if (!devMode) {
              const hasReport = part.state === "output-available" && part.output?.success;
              
              if (i === firstToolPartIndex) {
                return (
                  <div key={i} className="space-y-3">
                    <ToolExecutionSummary toolParts={toolParts} />
                    {hasReport && <ReportDownload output={part.output} />}
                  </div>
                );
              }
              
              // Render only the report download if this is a later tool with a report
              if (hasReport) {
                return (
                  <div key={i} className="space-y-3">
                    <ReportDownload output={part.output} />
                  </div>
                );
              }
              
              return null;
            }
            return (
              <div key={i} className="space-y-3">
                <Tool toolPart={part} />
                {part.state === "output-available" && part.output.success && (
                  <ReportDownload output={part.output} />
                )}
              </div>
            );
          }

          if (part.type === "tool-read_gmail") {
            const output = part?.output as any;
            const isDetailView = output?.mode === "detail" && output?.email;

            if (!devMode) {
              if (i === firstToolPartIndex) {
                return (
                  <div key={i} className="space-y-3">
                    <ToolExecutionSummary toolParts={toolParts} />
                    {isDetailView && (
                      <EmailDetailView 
                        email={output.email}
                      />
                    )}
                  </div>
                );
              }
              
              // Render only the email detail if this is a later tool with detail view
              if (isDetailView) {
                return (
                  <div key={i} className="space-y-3">
                    <EmailDetailView 
                      email={output.email}
                    />
                  </div>
                );
              }
              
              return null;
            }
            
            if (isDetailView) {
              return (
                <EmailDetailView 
                  key={i}
                  email={output.email}
                />
              );
            }
            
            return (
              <div key={i} className="space-y-3">
                <Tool toolPart={part} />
              </div>
            );
          }

          if (part.type === "tool-send_gmail") {
            const output = part?.output as any;
            const needsConfirmation = 
              part.state === "output-available" && 
              output?.mode === "confirmation_required" &&
              output?.draft &&
              part.toolCallId;

            if (!devMode) {
              if (i === firstToolPartIndex) {
                return (
                  <div key={i} className="space-y-3">
                    <ToolExecutionSummary toolParts={toolParts} />
                    {needsConfirmation && (
                      <EmailSendConfirmationCard
                        toolPart={part}
                        sendState={part.toolCallId ? emailSendStates?.[part.toolCallId] : undefined}
                        onConfirm={onConfirmEmailSend}
                        onCancel={onCancelEmailSend}
                        isLatestMessage={isLastAssistant}
                      />
                    )}
                  </div>
                );
              }
              
              // Render only the email confirmation card if this is a later tool that needs confirmation
              if (needsConfirmation) {
                return (
                  <div key={i} className="space-y-3">
                    <EmailSendConfirmationCard
                      toolPart={part}
                      sendState={part.toolCallId ? emailSendStates?.[part.toolCallId] : undefined}
                      onConfirm={onConfirmEmailSend}
                      onCancel={onCancelEmailSend}
                      isLatestMessage={isLastAssistant}
                    />
                  </div>
                );
              }
              
              return null;
            }
            return (
              <div key={i} className="space-y-3">
                <Tool toolPart={part} />
                {needsConfirmation && (
                  <EmailSendConfirmationCard
                    toolPart={part}
                    sendState={part.toolCallId ? emailSendStates?.[part.toolCallId] : undefined}
                    onConfirm={onConfirmEmailSend}
                    onCancel={onCancelEmailSend}
                    isLatestMessage={isLastAssistant}
                  />
                )}
              </div>
            );
          }

          if (typeof part.type === "string" && part.type.startsWith("tool-")) {
            if (!devMode) {
              if (i !== firstToolPartIndex) return null;
              return (
                <div key={i} className="space-y-3">
                  <ToolExecutionSummary toolParts={toolParts} />
                </div>
              );
            }
            return (
              <div key={i} className="space-y-3">
                <Tool toolPart={part} />
              </div>
            );
          }

          return null;
        })}
      </div>
      
      <MessageActions
        className={cn(
          "opacity-0",
          isAssistant
            ? "opacity-100 self-start"
            : "self-end group-hover:opacity-100 transition",
        )}
      >
        
        <MessageAction tooltip="Copy to clipboard">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-full"
            onClick={handleCopyMessage}
          >
            {message.id === copiedId ? (
              <CheckCheck className="text-green-500 size-4" />
            ) : (
              <Copy className="size-4" />
            )}
          </Button>
        </MessageAction>
        {isAssistant && (
          <MessageAction tooltip={speakingId === message.id ? "Stop reading" : "Read aloud"}>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-full"
              onClick={() => onReadAloud(message)}
            >
              {speakingId === message.id ? (
                <VolumeOff className="size-4" />
              ) : (
                <Volume2 className="size-4" />
              )}
            </Button>
          </MessageAction>
        )}
        {isAssistant && isLastAssistant && (
          <MessageAction tooltip="Regenerate response">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-full"
              onClick={() => onRegenerate(message.id)}
              disabled={status === "streaming" || status === "submitted"}
            >
              <RefreshCcw className="size-4" />
            </Button>
          </MessageAction>
        )}
      </MessageActions>
      {message.parts.map((part: any, i: number) => {
        if (part.type === "tool-read_gmail" || part.type === "tool-send_gmail") {
            const reconnectRequired =
              part.state === "output-available" &&
              Boolean(part.output?.reconnectRequired);

            return (
              <div key={i} className="space-y-3 mt-5">
                {reconnectRequired && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onReconnectGmail}
                    className="rounded-lg"
                  >
                    Connect Gmail
                  </Button>
                )}
              </div>
            );
          }
      })}
    </Message>
  );
  
});

function getToolSummary(toolType: string) {
  const normalizedType = toolType.replace(/^tool-/, "");

  const summaryMap: Record<string, { title: string; description: string }> = {
    web_search: {
      title: "Performing web search",
      description: "Retrieving information from online websites.",
    },
    read_gmail: {
      title: "Reading Gmail",
      description: "Fetching and organizing email messages.",
    },
    send_gmail: {
      title: "Preparing Gmail send",
      description: "Drafting or sending an email through Gmail.",
    },
    sql: {
      title: "Running database query",
      description: "Accessing structured records from the database.",
    },
    report: {
      title: "Generating report",
      description: "Compiling results into a report output.",
    },
    schema_info: {
      title: "Inspecting schema",
      description: "Reviewing table and relationship metadata.",
    },
  };

  const fallback = normalizedType.replace(/_/g, " ");

  return (
    summaryMap[normalizedType] ?? {
      title: `Calling ${fallback}`,
      description: "Executing tool action and processing results.",
    }
  );
}

function getToolVisual(toolType: string) {
  const normalizedType = toolType.replace(/^tool-/, "");

  const visualMap: Record<
    string,
    {
      Icon: any;
      iconClassName: string;
      containerClassName: string;
    }
  > = {
    web_search: {
      Icon: Globe,
      iconClassName: "text-blue-500",
      containerClassName: "bg-blue-500/15",
    },
    read_gmail: {
      Icon: Mail,
      iconClassName: "text-violet-500",
      containerClassName: "bg-violet-500/15",
    },
    send_gmail: {
      Icon: SendHorizontal,
      iconClassName: "text-emerald-500",
      containerClassName: "bg-emerald-500/15",
    },
    sql: {
      Icon: Database,
      iconClassName: "text-amber-500",
      containerClassName: "bg-amber-500/15",
    },
    report: {
      Icon: FileText,
      iconClassName: "text-rose-500",
      containerClassName: "bg-rose-500/15",
    },
    schema_info: {
      Icon: Network,
      iconClassName: "text-cyan-500",
      containerClassName: "bg-cyan-500/15",
    },
  };

  return (
    visualMap[normalizedType] ?? {
      Icon: Wrench,
      iconClassName: "text-muted-foreground",
      containerClassName: "bg-muted",
    }
  );
}

function ToolExecutionSummary({ toolParts }: { toolParts: any[] }) {
  const parts = Array.isArray(toolParts) ? toolParts : [];

  if (parts.length === 0) {
    return null;
  }

  const stateLabelMap: Record<string, string> = {
    "input-streaming": "Running",
    "input-available": "Running",
    "output-available": "Completed",
    "output-error": "Failed",
  };

  return (
    <div className="rounded-xl bg-card space-y-2 p-2">
      <ChainOfThought>
        <ChainOfThoughtStep defaultOpen={true}>
          <ChainOfThoughtTrigger className="text-md ">
            Execution Trace
          </ChainOfThoughtTrigger>
          <ChainOfThoughtContent>
            {parts.map((toolPart, index) => {
              const toolType =
                typeof toolPart?.type === "string" ? toolPart.type : "tool-unknown";
              const state = toolPart?.state ?? "pending";
              const { title, description } = getToolSummary(toolType);
              const { Icon, iconClassName, containerClassName } = getToolVisual(toolType);
              const stateLabel = stateLabelMap[state] ?? "Pending";
              const isRunning = stateLabel === "Running";
              const isFailed = stateLabel === "Failed";
              const isLast = index === parts.length - 1;
              const showConnector = parts.length === 1 ? true : !isLast;

              return (
                <div key={`${toolPart?.toolCallId ?? toolType}-${index}`} className="grid grid-cols-[min-content_minmax(0,1fr)] gap-x-3">
                  <div className="flex flex-col items-center">
                    <span
                      className={cn(
                        "relative inline-flex size-5 items-center justify-center rounded-md",
                        isFailed ? "bg-red-500/15" : "bg-background"
                      )}
                    >
                      <Icon
                        className={cn(
                          "size-3.5",
                          isFailed ? "text-red-500" : iconClassName,
                          isRunning && "animate-pulse"
                        )}
                      />
                    </span>
                    <span
                      className={cn(
                        "mt-1 w-px bg-primary/20 min-h-4",
                        showConnector ? "flex-1" : "opacity-0"
                      )}
                    />
                  </div>
                  <div className="rounded-lg space-y-1 mb-2">
                    <div className="min-h-5 flex items-center text-sm leading-5 font-medium text-foreground">
                      {title}{isRunning&&<Loader2 className="ml-2 size-4 animate-spin text-muted-foreground" />}
                    </div>
                    <ChainOfThoughtItem className="pl-7">{description}</ChainOfThoughtItem>
                    <ChainOfThoughtItem className="pl-7">Status: {stateLabel}</ChainOfThoughtItem>
                  </div>
                </div>
              );
            })}
          </ChainOfThoughtContent>
        </ChainOfThoughtStep>
      </ChainOfThought>
    </div>
  );
}

function getMessageText(message: any): string {
  if (!message?.parts) return "";

  return message.parts
    .filter((p: any) => p.type === "text")
    .map((p: any) => p.text)
    .join("");
}
const TextPart = memo(function TextPart({
  text,
  isAssistant,
  isStreaming,
}: {
  text: string;
  isAssistant: boolean;
  isStreaming: boolean;
}) {
  return (
    <MessageContent
      className={
        isAssistant
          ? "bg-background prose prose-neutral max-w-none"
          : "bg-foreground/70 p-2 px-5 rounded-2xl my-0 text-background prose prose-neutral max-w-none"
      }
    >
      {isAssistant ? <Markdown content={text} /> : text}
    </MessageContent>
  );
});

function ReportDownload({ output }: { output: any }) {
  const downloadPDF = () => {
    if (!output.pdf_data) return;

    // Convert base64 to blob
    const byteCharacters = atob(output.pdf_data);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: "application/pdf" });

    // Create download link
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = output.file_name || "report.pdf";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const viewPDF = () => {
    if (!output.pdf_data) return;

    const byteCharacters = atob(output.pdf_data);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: "application/pdf" });

    const url = URL.createObjectURL(blob);
    window.open(url, "_blank");
  };

  return (
    <div className="rounded-xl border bg-card p-4 space-y-3">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <h4 className="font-semibold text-sm">Report Generated</h4>
          <p className="text-xs text-muted-foreground">
            {output.club_name} • {output.time_period} • {output.fund_count}{" "}
            transactions
          </p>
        </div>
        <FileText className="h-5 w-5 text-muted-foreground" />
      </div>

      <div className="grid grid-cols-4 gap-2 text-xs">
        <div className="space-y-1">
          <p className="text-muted-foreground">Income</p>
          <p className="font-semibold">
            ₹{output.total_income?.toLocaleString("en-IN")}
          </p>
        </div>
        <div className="space-y-1">
          <p className="text-muted-foreground">Expenditure</p>
          <p className="font-semibold">
            ₹{output.total_expenditure?.toLocaleString("en-IN")}
          </p>
        </div>
        <div className="space-y-1">
          <p className="text-muted-foreground">Net Balance</p>
          <p className="font-semibold">
            ₹{output.net_balance?.toLocaleString("en-IN")}
          </p>
        </div>
        <div className="space-y-1">
          <p className="text-muted-foreground">Members</p>
          <p className="font-semibold">{output.member_count}</p>
        </div>
      </div>

      <div className="flex gap-2">
        <Button
          size="sm"
          onClick={downloadPDF}
          disabled={!output.pdf_data}
          className="flex-1"
        >
          <Download className="mr-2 h-4 w-4" />
          {!output.pdf_data ? "PDF expired" : "Download PDF"}
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={viewPDF}
          disabled={!output.pdf_data}
          className="flex-1"
        >
          <Eye className="mr-2 h-4 w-4" />
          {!output.pdf_data ? "PDF expired" : "View PDF"}
        </Button>
      </div>
    </div>
  );
}

function removeToolResults(messages: UIMessage[]) {
  return messages.map((msg) => ({
    ...msg,
    parts: (Array.isArray(msg.parts) ? msg.parts : []).filter(
      (part: any) => {
        if (typeof part.type !== "string") return true;

        const isTool = part.type.startsWith("tool-");
        const isAllowed =
          part.type === "tool-read_gmail" ||
          part.type === "tool-web_search"||
          part.type === "tool-schema_info";

        return !(isTool && !isAllowed);
      }
    ),
  }));
}


async function loadChatFromDB(chatId: string) {
  const res = await fetch(`/api/chats/${chatId}/messages`, {
    credentials: "include",
  });
  if (!res.ok) return [];

  const dbMessages = await res.json();

  // Transform DB rows -> useChat message format
  return dbMessages.map((m: any) => ({
    id: m.id,
    role: m.role,
    parts: m.parts,
  }));
}

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}
async function saveTurnToDB(
  user: any,
  assistant: any,
  chatId: string,
  isFirstTurn: boolean,
  isRegenerate: boolean = false,
) {
  await fetch("/api/messages", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      user_parts: user?.parts ?? null,
      assistant_parts: assistant.parts,
      is_first_turn: isFirstTurn,
      is_regenerate: isRegenerate,
    }),
  });
}

export default function Page() {
  const params = useParams();
  const chatId = params.id as string;

  const router = useRouter();
  const { user, loading } = useUserInfo();
  const { keys } = useKeyVault();

  const [mode, setMode] = useState<AIMode>("server-key");
  const [selectedModel, setSelectedModel] = useState("openai/gpt-4o-mini");
  const [chatList, setChatList] = useState<any[]>([]);
  const [input, setInput] = useState("");
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [usageDialogOpen, setUsageDialogOpen] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const [emailSendStates, setEmailSendStates] = useState<Record<string, EmailSendState>>({});
  const [devMode, setDevMode] = useState(false);
  /* ---------------- AUTH GUARD ---------------- */

  useEffect(() => {
    if (loading) return;

    if (!user) {
      router.push("/login");
      return;
    }

    if (
      user.role !== "faculty" &&
      user.role !== "admin" &&
      user.role !== "club"
    ) {
      router.push("/");
    }
  }, [user, loading, router]);

  /* ---------------- CHAT HOOK ---------------- */

  const {
    messages,
    sendMessage,
    status,
    error,
    stop,
    setMessages,
    regenerate,
  } = useChat({
    id: chatId === "new" ? undefined : chatId,
    transport: new DefaultChatTransport({
      api: "/api/ai/chat",
      prepareSendMessagesRequest({ messages, id, body, trigger, messageId }) {
        return {
          body: {
            ...body,
            id,
            messages: removeToolResults(messages),
            trigger,
            messageId,
          },
        };
      },
    }),
    onFinish: async ({ messages, finishReason }) => {
      // Only save if chat succeeded and we have valid messages
      if (chatId === "new" || !finishReason) return;

      const isRegenerate = isRegenerating;
      const assistant = messages[messages.length - 1];
      if (!assistant || !assistant.id || assistant.role !== "assistant") return;

      if (isRegenerate) {
        try {
          setIsRegenerating(false);
          await saveTurnToDB(null, assistant, chatId, false, true);
        } catch (error) {
          setIsRegenerating(false);
          console.error("Failed to save regenerated assistant to DB:", error);
        }
        return;
      }

      const user = messages
        .slice(0, -1)
        .reverse()
        .find((m) => m.role === "user");

      if (!user || !user.id) return;

      try {
        await saveTurnToDB(
          user,
          assistant,
          chatId,
          messages.length === 2,
          false,
        );

        if (messages.length === 2) {
          loadChats();
        }
      } catch (error) {
        console.error("Failed to save turn to DB:", error);
      }
    },
    onError: async (error) => {
      console.log("Chat error:", error);
    },
  });


  const lastAssistantId = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i -= 1) {
      if (messages[i]?.role === "assistant") {
        return messages[i].id;
      }
    }
    return null;
  }, [messages]);

  const usageRecords = useMemo(() => {
    return messages
      .map((message: any, index: number) => {
        const usage = message?.metadata?.usage;
        if (!usage) return null;

        const noCacheTokens =
          usage?.inputTokenDetails?.noCacheTokens !== undefined
            ? usage.inputTokenDetails.noCacheTokens
            : usage.inputTokens - (usage.cachedInputTokens ?? 0);

        const cachedTokens =
          usage?.cachedInputTokens ??
          usage?.inputTokenDetails?.cacheReadTokens ??
          0;

        return {
          index: index + 1,
          id: message.id,
          role: message.role,
          usage: {
            // BILLABLE
            inputTokens: noCacheTokens,

            // FREE
            cachedInputTokens: cachedTokens,

            // BILLABLE
            outputTokens: usage?.outputTokens ?? 0,

            // COMPUTE TOTAL (includes cache)
            totalTokens: usage?.totalTokens ?? 0,
          },
        };
      })
      .filter(Boolean) as {
      index: number;
      id: string;
      role: string;
      usage: {
        inputTokens: number;
        cachedInputTokens: number;
        outputTokens: number;
        totalTokens: number;
      };
    }[];
  }, [messages]);

  const usageTotals = useMemo(() => {
    return usageRecords.reduce(
      (acc, record) => {
        acc.inputTokens += record.usage.inputTokens;
        acc.cachedInputTokens += record.usage.cachedInputTokens;
        acc.outputTokens += record.usage.outputTokens;
        acc.totalTokens += record.usage.totalTokens;
        return acc;
      },
      {
        inputTokens: 0,
        cachedInputTokens: 0,
        outputTokens: 0,
        totalTokens: 0,
      },
    );
  }, [usageRecords]);

  /* ---------------- LOAD CHAT META + HISTORY ---------------- */
async function init() {
    try {
      setIsLoadingHistory(true);

      // Load chat meta
      const res = await fetch(`/api/chats/${chatId}`);
      const chat = await res.json();

      setSelectedModel(chat.model_id);
      setMode(chat.mode);

      // Load history
      const first = sessionStorage.getItem("firstMessage");

      if (first) {
        send(first, chat.model_id, chat.mode);
        sessionStorage.removeItem("firstMessage");
      } else {
        const history: UIMessage[] = await loadChatFromDB(chatId);
        setMessages(history);
      }

    } finally {
      setIsLoadingHistory(false);
    }
  }
const lastLoadedChatIdRef = useRef<string | null>(null);

useEffect(() => {
  // Wait until chat system ready
  if (status !== "ready") return;

  // Ignore new chat placeholder
  if (chatId === "new") return;

  // If this chat was already loaded, skip
  if (lastLoadedChatIdRef.current === chatId) return;

  // Mark this chat as loaded
  lastLoadedChatIdRef.current = chatId;
  init();

}, [chatId, status]);



  /* ---------------- LOAD SIDEBAR CHATS ---------------- */
  async function loadChats() {
    const res = await fetch("/api/chats/list", {
      credentials: "include",
    });
    const data = await res.json();
    setChatList(data);
  }
  useEffect(() => {
    loadChats();
  }, [chatId]);

  /* ---------------- SEND FUNCTION ---------------- */

  async function send(message?: string,modelIdOvr?: string,modeOvr?: AIMode) {
    if (!input.trim() && !message) return;
    const text = message || input;
    setInput("");
    console.log("Model override:", modelIdOvr, "Mode override:", modeOvr);
    console.log("Selected model:", selectedModel, "Mode:", mode);
    // NEW CHAT → server handles first exchange
    if (chatId === "new") {
      const res = await fetch("/api/chats", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          modelId: selectedModel,
          mode,
        }),
      });

      const data = await res.json();

      // store first message temporarily
      sessionStorage.setItem("firstMessage", text);

      router.replace(`/ai-assistant/${data.id}`);
      return;
    }

    const { provider } = parseModelValue(selectedModel);
    const userApiKey = keys[provider];

    sendMessage(
      { text },
      {
        body: {
          mode: modeOvr || mode,
          modelId: modelIdOvr || selectedModel,
          userApiKey,
          chatId,
        },
      },
    );
  }

  function handleRegenerate(messageId: string) {
    const { provider } = parseModelValue(selectedModel);
    const userApiKey = keys[provider];
    setIsRegenerating(true);

    regenerate({
      messageId,
      body: {
        mode,
        modelId: selectedModel,
        userApiKey,
        chatId,
      },
    });
  }

  function handleReadAloud(message: any) {
    const plainText = removeMarkdown(getMessageText(message));

    // If already speaking this message, stop
    if (speakingId === message.id) {
      window.speechSynthesis.cancel();
      setSpeakingId(null);
      return;
    }

    // Cancel any other speech
    window.speechSynthesis.cancel();
    setSpeakingId(message.id);

    const utterance = new SpeechSynthesisUtterance(plainText);
    utterance.onend = () => setSpeakingId(null);
    utterance.onerror = () => setSpeakingId(null);

    window.speechSynthesis.speak(utterance);
  }

  /* ---------------- UTIL ---------------- */

  function getMessageText(message: any): string {
    if (!message?.parts) return "";

    return message.parts
      .filter((p: any) => p.type === "text")
      .map((p: any) => p.text)
      .join("");
  }

  function openChat(id: string) {
    router.push(`/ai-assistant/${id}`);
  }

  async function handleReconnectGmail() {
    
    const chatId = params.id;
    
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?source=gmail-reconnect&chatId=${chatId}`,
        scopes: [
          "https://www.googleapis.com/auth/gmail.readonly",
          "https://www.googleapis.com/auth/gmail.send",
          "https://www.googleapis.com/auth/gmail.modify",
        ].join(" "),
        queryParams: {
          access_type: "offline",
          prompt: "consent",
        },
      },
    });

    if (error) {
      console.error("Failed to reconnect Gmail:", error.message);
    }
  }

  async function handleConfirmEmailSend(toolCallId: string, payload: EmailSendPayload) {
    setEmailSendStates((prev) => ({
      ...prev,
      [toolCallId]: {
        status: "sending",
      },
    }));

    try {
      const res = await fetch("/api/gmail/send", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data?.message || data?.error || "Failed to send email.");
      }

      setEmailSendStates((prev) => ({
        ...prev,
        [toolCallId]: {
          status: "sent",
          message: "Email sent successfully.",
        },
      }));
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to send email.";
      setEmailSendStates((prev) => ({
        ...prev,
        [toolCallId]: {
          status: "error",
          message,
        },
      }));
    }
  }

  function handleCancelEmailSend(toolCallId: string) {
    setEmailSendStates((prev) => ({
      ...prev,
      [toolCallId]: {
        status: "cancelled",
        message: "Send cancelled.",
      },
    }));
  }
  if (!user || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  /* ---------------- RETURN STARTS BELOW ---------------- */

  return (
    <SidebarProvider defaultOpen={true}>
      <AppSidebar
        chats={chatList}
        activeChatId={chatId}
        onOpenChat={openChat}
        refreshChats={loadChats}
      />

      <SidebarInset className="h-screen overflow-hidden">
        <header className="flex h-14 shrink-0 items-center justify-between px-4 border-b bg-background/80 backdrop-blur">
          <div className="flex items-center w-full justify-between gap-2">
            <div className="flex items-center">
              <SidebarTrigger className="-ml-1" />
              <Separator
                orientation="vertical"
                className="mr-2 data-[orientation=vertical]:h-4"
              />
              <h1
                className="text-sm font-medium tracking-wide text-muted-foreground"
                onClick={()=>console.log(messages)}
              >
                ClubSync Assistant
              </h1>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                onClick={() => router.push("/")}
                className="gap-2 rounded-lg  text-foreground hover:text-foreground"
              >
                <Home />
              </Button>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant={devMode ? "default" : "outline"}
                      size="icon"
                      onClick={() => setDevMode((prev) => !prev)}
                      className="rounded-lg"
                      aria-pressed={devMode}
                      aria-label={`Dev mode ${devMode ? "on" : "off"}`}
                    >
                      <Bug className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    {devMode
                      ? "Dev mode: shows full tool components."
                      : "Dev mode off"}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <Dialog open={usageDialogOpen} onOpenChange={setUsageDialogOpen}>
                <DialogTrigger asChild>
                  <Button
                    variant="outline"
                    className="gap-2 rounded-lg text-foreground hover:text-foreground"
                    aria-label="View chat usage"
                  >
                    <ChartNoAxesColumn className="h-4 w-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col overflow-hidden">
                  <DialogHeader className="shrink-0">
                    <DialogTitle>Chat Usage</DialogTitle>
                    <DialogDescription>
                      Token usage for this conversation is stored temporarily in
                      memory.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid grid-cols-4 gap-3 shrink-0">
                    <div className="rounded-lg border px-3 py-2">
                      <p className="text-xs text-muted-foreground">Prompt</p>
                      <p className="text-lg font-semibold">
                        {usageTotals.inputTokens}
                      </p>
                    </div>
                    <div className="rounded-lg border px-3 py-2">
                      <p className="text-xs text-muted-foreground">Cache</p>
                      <p className="text-lg font-semibold">
                        {usageTotals.cachedInputTokens}
                      </p>
                    </div>
                    <div className="rounded-lg border px-3 py-2">
                      <p className="text-xs text-muted-foreground">Reply</p>
                      <p className="text-lg font-semibold">
                        {usageTotals.outputTokens}
                      </p>
                    </div>
                    <div className="rounded-lg border px-3 py-2">
                      <p className="text-xs text-muted-foreground">Total</p>
                      <p className="text-lg font-semibold">
                        {usageTotals.totalTokens}
                      </p>
                    </div>
                  </div>
                  {usageRecords.length === 0 ? (
                    <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                      No usage data yet. Send a message to populate usage stats.
                    </div>
                  ) : (
                    <div className="flex-1 min-h-0 overflow-y-auto border rounded-lg">
                      <Table className="w-full">
                        <TableHeader className="sticky top-0 bg-background z-10">
                          <TableRow>
                            <TableHead className="w-16">Turn</TableHead>
                            <TableHead className="w-24">Role</TableHead>
                            <TableHead className="text-right">Prompt</TableHead>
                            <TableHead className="text-right">Cached</TableHead>
                            <TableHead className="text-right">Reply</TableHead>
                            <TableHead className="text-right">Total</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {usageRecords.map((record) => (
                            <TableRow key={record.id}>
                              <TableCell>{record.index - 1}</TableCell>
                              <TableCell className="capitalize">
                                {record.role}
                              </TableCell>
                              <TableCell className="text-right">
                                {record.usage.inputTokens ?? 0}
                              </TableCell>
                              <TableCell className="text-right">
                                {record.usage.cachedInputTokens ?? 0}
                              </TableCell>
                              <TableCell className="text-right">
                                {record.usage.outputTokens ?? 0}
                              </TableCell>
                              <TableCell className="text-right">
                                {record.usage.totalTokens ?? 0}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </DialogContent>
              </Dialog>
              <KeyManagerDialog />
            </div>
          </div>
        </header>

        <div className="flex flex-1 min-h-0 flex-col w-full min-w-0 items-center overflow-hidden">
          {/* Messages Container */}
          <div className="h-full w-full max-w-6xl min-w-0 flex flex-col bg-background">
            {/* MESSAGES — ONLY SCROLL AREA */}
            <div className="flex-1 min-h-0 overflow-hidden">
              <ChatContainerRoot
                className="relative h-full w-full items-center"
                key={chatId}
              >
                <ChatContainerContent className="px-1 py-2 space-y-2 mt-10">
                  {isLoadingHistory ? (
                    <div className="flex flex-col gap-8 p-8 w-full">
                      {/* User */}
                      <div className="flex justify-end w-full">
                        <div
                          className="bg-muted rounded-3xl animate-pulse"
                          style={{
                            height: "10vh",
                            width: "55%",
                            minHeight: "120px",
                          }}
                        />
                      </div>

                      {/* Assistant */}
                      <div className="flex justify-start w-full">
                        <div
                          className="bg-muted rounded-3xl animate-pulse"
                          style={{
                            height: "30vh",
                            width: "75%",
                            minHeight: "120px",
                          }}
                        />
                      </div>
                    </div>
                  ) : (
                    messages.map((m) => (
                      <ChatMessage
                        key={m.id}
                        message={m}
                        isLast={m.id === messages[messages.length - 1]?.id}
                        status={status}
                        copiedId={copiedId}
                        setCopiedId={setCopiedId}
                        onRegenerate={handleRegenerate}
                        isLastAssistant={m.id === lastAssistantId}
                        speakingId={speakingId}
                        onReadAloud={handleReadAloud}
                        onReconnectGmail={handleReconnectGmail}
                        emailSendStates={emailSendStates}
                        onConfirmEmailSend={handleConfirmEmailSend}
                        onCancelEmailSend={handleCancelEmailSend}
                        devMode={devMode}
                      />
                    ))
                  )}
                  {error && (
                    <SystemMessage
                      variant="error"
                      isIconHidden={false}
                      className="relative w-auto self-start"
                      cta={{
                        label: (
                          <RefreshCw className="w-4 h-4 text-foreground" />
                        ),
                        variant: "ghost",
                        onClick: () => {
                          if (status === "error") {
                            const lastUser = [...messages]
                              .reverse()
                              .find((m) => m.role === "user");
                            setMessages(messages.slice(0, messages.length - 1));
                            send(lastUser ? getMessageText(lastUser) : "");
                          }
                        },
                      }}
                    >
                      {typeof error.message === "string"
                        ? error.message
                        : "An error occurred. Please try again."}
                    </SystemMessage>
                  )}
                  <ChatContainerScrollAnchor />
                </ChatContainerContent>
                {/* 🔥 Scroll button lives inside root, not outside */}
                <div className="absolute bottom-6 right-6 z-10">
                  <ScrollButton />
                </div>
              </ChatContainerRoot>
            </div>
            {(chatId === "new" ||
              (messages.length == 0 && !isLoadingHistory)) && (
              <div className="h-full w-full flex items-center justify-center">
                <div className="max-w-2xl w-full text-center space-y-2 px-6">
                  {/* Title */}
                  <div className="space-y-2">
                    <h2 className="text-3xl font-semibold tracking-tight tracking-wider">
                      <MorphingText
                        className="text-foreground p-5"
                        texts={["ClubSync", "Assistant"]}
                      />
                    </h2>
                    <p className="text-muted-foreground text-sm">
                      Understand • Query • Analyze
                    </p>
                  </div>

                  {/* Suggestions */}
                  <div className="flex flex-wrap justify-center gap-3 pt-4">
                    <PromptSuggestion
                      className="bg-blue-500/10 text-blue-400 border border-blue-500/20 hover:bg-blue-500/20"
                      onClick={() =>
                        setInput(
                          "Provide a clear explanation of the database schema, including all tables and their relationships.",
                        )
                      }
                    >
                      Understand Schema
                    </PromptSuggestion>

                    <PromptSuggestion
                      className="bg-amber-500/10 text-amber-400 border border-amber-500/20 hover:bg-amber-500/20"
                      onClick={() =>
                        setInput(
                          "Show all inventory items that are currently borrowed, including who borrowed them and the borrow dates.",
                        )
                      }
                    >
                      Track Inventory
                    </PromptSuggestion>

                    <PromptSuggestion
                      className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20"
                      onClick={() =>
                        setInput(
                          "Display complete details of all clubs along with the faculty members responsible for them.",
                        )
                      }
                    >
                      View Club Info
                    </PromptSuggestion>

                    <PromptSuggestion
                      className="bg-purple-500/10 text-purple-400 border border-purple-500/20 hover:bg-purple-500/20"
                      onClick={() =>
                        setInput(
                          "Provide a detailed breakdown of all income records associated with the Astra Robotics club.",
                        )
                      }
                    >
                      Analyze Income
                    </PromptSuggestion>
                  </div>
                </div>
              </div>
            )}

            {/* PROMPT — fixed */}
            <div className="shrink-0 p-4">
              <PromptInput
                value={input}
                onValueChange={setInput}
                isLoading={status === "streaming" || status === "submitted"}
                onSubmit={() => send()}
                className="max-w-6xl mx-auto w-full"
              >
                <div className="flex w-full flex-col gap-4">
                  <div className="flex w-full">
                    <PromptInputTextarea
                      placeholder="Ask me anything..."
                      className="rounded-xl"
                    />
                    <PromptInputActions className="justify-end pt-2">
                      <PromptInputAction
                        tooltip={
                          status === "streaming" || status === "submitted"
                            ? "Stop generation"
                            : "Send message"
                        }
                      >
                        <Button
                          variant="default"
                          size="icon"
                          className="h-8 w-8 rounded-full"
                          onClick={() => {
                            if (
                              status === "streaming" ||
                              status === "submitted"
                            ) {
                              stop();
                            } else {
                              send();
                            }
                          }}
                        >
                          {status === "streaming" || status === "submitted" ? (
                            <Square className="size-5 fill-current" />
                          ) : (
                            <ArrowUp className="size-5" />
                          )}
                        </Button>
                      </PromptInputAction>
                    </PromptInputActions>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <ModelCombobox
                      value={selectedModel}
                      onChange={setSelectedModel}
                    />
                    <ModeToggle value={mode} onChange={setMode} />
                  </div>
                </div>
              </PromptInput>
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
