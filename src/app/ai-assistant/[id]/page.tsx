'use client'
import{ memo, useMemo } from "react";
import type { UIMessage } from "ai";
import { AppSidebar } from "../components/app-sidebar"
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar'
import { useParams } from "next/navigation"


import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useEffect, useState } from "react";
import {
  PromptInput,
  PromptInputAction,
  PromptInputActions,
  PromptInputTextarea,
} from "@/components/ui/prompt-input"
import {
  Reasoning,
  ReasoningContent,
  ReasoningTrigger,
} from "@/components/ui/reasoning"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tool } from "@/components/ui/tool";
import { SqlCodeBlock } from "@/components/ui/sql-code";
import { ChatContainerContent,ChatContainerRoot,ChatContainerScrollAnchor } from "@/components/ui/chat-container";
import { Message,MessageContent,MessageAction,MessageActions } from "@/components/ui/message";
import { ArrowUp, CheckCheck, Copy, Home, Loader2, RotateCwIcon, Square ,Trash2} from "lucide-react";
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
export const ChatMessage = memo(function ChatMessage({
  message,
  isLast,
  status,
  copiedId,
  setCopiedId,
}: any) {
  const isAssistant = message.role === "assistant";

  const blocksByPart = useMemo(() => {
    return message.parts.map((p: any) =>
      p.type === "text" ? parseBlocks(p.text) : null
    );
  }, [message.parts]);

  return (
    <Message
      className={cn(
        isAssistant ? "justify-start flex-col group" : "justify-end flex-col group"
      )}
    >
      <div
        className={cn(
          "space-y-3 break-words min-w-0",
          isAssistant
            ? "max-w-full"
            : "max-w-[80%] sm:max-w-[50%] ml-auto w-fit min-w-[50px]"
        )}
      >
        {message.parts.map((part: any, i: number) => {
          if (part.type === "text") {
            const blocks = blocksByPart[i];
            return (
              <div key={i} className="space-y-3">
                {blocks.map((b: any, idx: number) => {
                  if (b.type === "understanding")
                    return (
                      <ReasoningSection
                        key={idx}
                        title="Understanding"
                        text={b.text}
                        isStreaming={status === "streaming"}
                      />
                    );

                  if (b.type === "plan")
                    return (
                      <ReasoningSection
                        key={idx}
                        title="SQL Plan"
                        text={b.text}
                        isStreaming={status === "streaming"}
                      />
                    );

                  if (b.type === "sql")
                    return <SqlCodeBlock key={idx} code={b.text} />;

                  return (
                    <MessageContent
                      key={idx}
                      className={
                        isAssistant
                          ? "bg-background prose prose-neutral max-w-none"
                          : "bg-foreground/70 text-background prose prose-neutral max-w-none"
                      }
                    >
                      <Markdown content={b.text} />
                    </MessageContent>
                  );
                })}
              </div>
            );
          }

          if (part.type === "tool-sql") {
            return (
              <div key={i} className="space-y-3">
                <Tool toolPart={part} />
                {part.state === "output-available" && (
                  <DataTable
                    columns={part.output.columns}
                    rows={part.output.rows}
                  />
                )}
              </div>
            );
          }

          return null;
        })}
      </div>

      <MessageActions className="opacity-0 self-end group-hover:opacity-100 transition">
        <MessageAction tooltip="Copy to clipboard">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-full"
            onClick={() => {
              navigator.clipboard.writeText(
                message.parts
                  .filter((p: any) => p.type === "text")
                  .map((p: any) => p.text)
                  .join("")
              );
              setCopiedId(message.id);
              setTimeout(() => setCopiedId(""), 2000);
            }}
          >
            {message.id === copiedId ? (
              <CheckCheck className="text-green-500 size-4" />
            ) : (
              <Copy className="size-4" />
            )}
          </Button>
        </MessageAction>
      </MessageActions>
    </Message>
  );
});


type Block =
  | { type: "understanding"; text: string }
  | { type: "plan"; text: string }
  | { type: "sql"; text: string }
  | { type: "other"; text: string };

function parseBlocks(text: string): Block[] {
  const blocks: Block[] = [];

  const regex =
    /(\[Understanding\]|\[SQL Plan\]|\[SQL Query Start\]|\[SQL Query End\]|\[End\])/g;

  const parts = text.split(regex).filter(Boolean);

  let current: Block["type"] = "other";

  for (const part of parts) {
    if (part === "[Understanding]") {
      current = "understanding";
      continue;
    }

    if (part === "[SQL Plan]") {
      current = "plan";
      continue;
    }

    if (part === "[SQL Query Start]") {
      current = "sql";
      continue;
    }

    if (part === "[SQL Query End]") {
      current = "other";
      continue;
    }
    if(part==="[End]"){
      current = "other";
      continue;
    }

    blocks.push({ type: current, text: part.trim() });
  }

  return blocks;
}



function ReasoningSection({
  title,
  text,
  isStreaming,
}: {
  title: string;
  text: string;
  isStreaming: boolean;
}) {
  return (
    <div className="rounded-xl border bg-muted/30 px-4 py-3">

    <Reasoning isStreaming={(true||isStreaming)} >
      <ReasoningTrigger className="mb-2">{title}</ReasoningTrigger>
      <ReasoningContent
          markdown
          className="ml-2 border-l-2 border-l-slate-200 px-2 pb-1 dark:border-l-slate-700"
        >
        {text}
      </ReasoningContent>
    </Reasoning>
    </div>
  );
}



function DataTable({
  columns,
  rows,
}: {
  columns: string[];
  rows: Record<string, unknown>[];
}) {
  return (
      <Table className="w-full p-2 mt-4 border rounded-xl overflow-x-auto">
          <TableHeader>
            <TableRow>
              {columns.map((c) => (
                <TableHead key={c} className="whitespace-nowrap text-center align-middle">
                    {c.replace(/_/g, " ")
                      .replace(/\b\w/g, (ch) => ch.toUpperCase())
                    }
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>

          <TableBody>
            {rows.map((r, i) => (
              <TableRow key={i}>
                {columns.map((c) => (
                 <TableCell
                 key={c}
                 className="whitespace-normal break-words max-w-[250px] text-center align-middle"
               >
                 {String(r[c] ?? "")}
               </TableCell>
               
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
  );
}



async function loadChatFromDB(chatId: string) {
  const res = await fetch(`/api/chats/${chatId}/messages`,{credentials: "include",});
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
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}
async function saveTurnToDB(user: any, assistant: any, chatId: string,isFirstTurn: boolean) {
  await fetch("/api/messages", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      user_parts: user.parts,
      assistant_parts: assistant.parts,
      is_first_turn: isFirstTurn,
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
  const [copiedId, setCopiedId] = useState<string | null>(null);

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
  } = useChat({
    id: chatId === "new" ? undefined : chatId,
    transport: new DefaultChatTransport({
      api: "/api/ai/chat",
    }),
    onFinish: async ({ messages, finishReason }) => {
      console.log("finishReason")
      if (chatId === "new" || !finishReason) return;
    
      const assistant = messages[messages.length - 1];
      const user = messages
        .slice(0, -1)
        .reverse()
        .find((m) => m.role === "user");
    
      if (!user || !assistant) return;
    
      await saveTurnToDB(user, assistant, chatId,messages.length === 2);
    
      if (messages.length === 2) {

        loadChats();
      }
    },
    onError: async(error)=>{
      console.log(error)
    }
  });

  useEffect(() => {
    if (chatId === "new") return;
  
    const first = sessionStorage.getItem("firstMessage");
    if (!first) return;
  
    sessionStorage.removeItem("firstMessage");
  
    // set input so UI shows it
    setInput(first);
  }, [chatId]);

  
  

  /* ---------------- LOAD CHAT META + HISTORY ---------------- */

  useEffect(() => {
    if (chatId === "new") return;
  
    async function init() {
      // 1️⃣ Load chat meta
      const res = await fetch(`/api/chats/${chatId}`);
      const chat = await res.json();
  
      setSelectedModel(chat.model_id);
      setMode(chat.mode);
  
      // 2️⃣ Load history
      const history: UIMessage[] = await loadChatFromDB(chatId);
      setMessages(history);
    }
  
    init();
  }, [chatId]);
  

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

  async function send() {
    if (!input.trim()) return;
    const text = input;
    setInput("");

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
          mode,
          modelId: selectedModel,
          userApiKey,
          chatId,
        },
      }
    );
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
            <h1 className="text-sm font-medium tracking-wide text-muted-foreground" onClick={()=>console.log(error)}>
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
            <KeyManagerDialog />
          </div>
          </div>
        </header>

        <div className="flex flex-1 min-h-0 flex-col w-full min-w-0 items-center overflow-hidden">

          {/* Messages Container */}
          <div className="h-full w-full max-w-6xl min-w-0 flex flex-col bg-background">


  
        {/* MESSAGES — ONLY SCROLL AREA */}
        <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden">



        <ChatContainerRoot className="relative h-full w-full items-center" key={chatId} >

          <ChatContainerContent className="px-6 py-6 space-y-6">
            {messages.map((m) => (
              <>
              <ChatMessage
                key={m.id}
                message={m}
                isLast={m.id === messages[messages.length - 1]?.id}
                status={status}
                copiedId={copiedId}
                setCopiedId={setCopiedId}
              />
              </>
            ))}
              {error&&(
                <div className="rounded-xl flex items-center gap-2 justify-start max-w-full sm:max-w-[50%]"> <p className="p-3 rounded-xl border text-red-500">{error.message||"An unexpected error occured!"}</p> </div>
              )}
            

    {/* 🔥 THIS IS WHAT YOU WERE MISSING */}
    <ChatContainerScrollAnchor />

  </ChatContainerContent>
      {/* 🔥 Scroll button lives inside root, not outside */}
      <div className="w-screen absolute z-10 right-0 top-1">
    <ScrollButton />
  </div>

</ChatContainerRoot>

       
        </div>
        {messages.length === 0 && (
            <div className="h-full w-full flex items-center justify-center">
              <div className="max-w-2xl w-full text-center space-y-2 px-6">
              

                {/* Title */}
                <div className="space-y-2">
                  <h2 className="text-3xl font-semibold tracking-tight tracking-wider">
                  <MorphingText className="text-foreground p-5" texts={["ClubSync" ,"Assistant"]} />
                  </h2>
                  <p className="text-muted-foreground text-sm" >
                    Understand • Query • Analyze 
                  </p>
                </div>

                {/* Suggestions */}
                <div className="flex flex-wrap justify-center gap-3 pt-4">

                  <PromptSuggestion
                    className="bg-blue-500/10 text-blue-400 border border-blue-500/20 hover:bg-blue-500/20"
                    onClick={() =>
                      setInput(
                        "Provide a clear explanation of the database schema, including all tables and their relationships."
                      )
                    }
                  >
                    Understand Schema
                  </PromptSuggestion>

                  <PromptSuggestion
                    className="bg-amber-500/10 text-amber-400 border border-amber-500/20 hover:bg-amber-500/20"
                    onClick={() =>
                      setInput(
                        "Show all inventory items that are currently borrowed, including who borrowed them and the borrow dates."
                      )
                    }
                  >
                    Track Inventory
                  </PromptSuggestion>

                  <PromptSuggestion
                    className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20"
                    onClick={() =>
                      setInput(
                        "Display complete details of all clubs along with the faculty members responsible for them."
                      )
                    }
                  >
                    View Club Info
                  </PromptSuggestion>

                  <PromptSuggestion
                    className="bg-purple-500/10 text-purple-400 border border-purple-500/20 hover:bg-purple-500/20"
                    onClick={() =>
                      setInput(
                        "Provide a detailed breakdown of all income records associated with the Astra Robotics club."
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
            onSubmit={send}
            className="max-w-6xl mx-auto w-full"
          >
            <div className="flex w-full flex-col gap-4">
          <div className="flex w-full">
          <PromptInputTextarea placeholder="Ask me anything..." className="rounded-xl"/>
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
                onClick={()=>{
                  if(status==="streaming"||status==="submitted")
                  {
                    stop();
                  }
                  else{
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
          </div >
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
  )
}
