'use client'

import { AppSidebar } from "./components/app-sidebar"
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar'


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
import { ChatContainerContent,ChatContainerRoot } from "@/components/ui/chat-container";
import { Message,MessageContent,MessageAction,MessageActions } from "@/components/ui/message";
import { ArrowUp, CheckCheck, Copy, Database, Loader2, RotateCwIcon, Square ,Trash2} from "lucide-react";
import { useUserInfo } from "@/hooks/useUserInfo";
import { cn } from "@/lib/utils";
import { useKeyVault } from "@/components/ui/useKeyVault";
import { KeyManagerDialog } from "@/components/ui/KeyManager";
import { AIMode, ModeToggle } from "@/components/ui/ModeToggle";
import { MODEL_GROUPS, parseModelValue } from "@/components/ui/models";
import { ModelCombobox } from "@/components/ui/ModelSelect";
import ShinyText from "@/components/ShinyText";
import { PromptSuggestion } from "@/components/ui/prompt-suggestion";
import { Markdown } from "@/components/Markdown";
import { toast } from "sonner";
import { MorphingText } from "@/components/ui/morphing-text";
import { useRouter } from "next/navigation";
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





interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

export default function Page() {
    const {user,loading}=useUserInfo();
    const [mode, setMode] = useState<AIMode>("gateway");
    const [copiedId, setCopiedId] = useState<string | null>(null);
    const [chatId, setChatId] = useState(() => crypto.randomUUID());
  
    const [selectedModel, setSelectedModel] = useState(
      MODEL_GROUPS.openai.models[0].value
    );
    const { keys } = useKeyVault();
    const router = useRouter();
    useEffect(() => {
      if (loading) return;
  
      if (!user) {
        toast.error("Please login first");
        router.push("/login");
        return;
      }
  
      if (user.role !== "faculty"&& user.role !== "admin"&&user.role!=="club") {
        toast.error("Only students can access the user dashboard");
        router.push("/");
        return;
      }})
    function getMessageText(message: any): string {
      if (!message?.parts) return "";
    
      return message.parts
        .filter((p: any) => p.type === "text")
        .map((p: any) => p.text)
        .join("");
    }
    
    const { messages, sendMessage, status,error,stop,setMessages } = useChat({
      id: chatId,
      transport: new DefaultChatTransport({
        api: "/api/ai/chat",
      }),
      onFinish: ({ }) => {
      },
      onError: error => {
        console.error(error);
      },
    });
  
    const [input, setInput] = useState("");
  
    
    function send() {
      if (!input.trim()) return;
    
      const { provider } = parseModelValue(selectedModel);
      const userApiKey = keys[provider];
      if (mode=="user-key"&&!userApiKey) {
        toast.error("Missing api key!");
        return;
      }
    
      sendMessage(
        { text: input },
        {
          body: {
            mode,
            modelId: selectedModel,
            userApiKey,
          },
        }
      );
    
      setInput("");
    }
    if(!user||loading){
        return (
          <div className="flex items-center justify-center min-h-screen">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        );
      
    }


  return (
    <SidebarProvider >
      <AppSidebar />
      <SidebarInset >
        <header className="flex h-14 shrink-0 items-center justify-between px-4 border-b bg-background/60 backdrop-blur">
          <div className="flex items-center w-full justify-between gap-2 px-4">
            <div className="flex items-center">
            <SidebarTrigger className="-ml-1" />
            <Separator
              orientation="vertical"
              className="mr-2 data-[orientation=vertical]:h-4"
            />
            <h1 className="text-sm font-medium tracking-wide text-muted-foreground">
                 ClubSync Assistant
            </h1>

            </div>
            <div className="flex items-center gap-3">
            
            <KeyManagerDialog />
            <Button
              variant="outline"
              onClick={() => {
                stop();          // stop any streaming
                setChatId(crypto.randomUUID());
              }}
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
          </div>
        </header>

        <div className="flex flex-1 flex-col w-full gap-0  items-center overflow-hidden">
          {/* Messages Container */}
          <div className="h-full w-full max-w-6xl flex flex-col  bg-background">

  
        {/* MESSAGES — ONLY SCROLL AREA */}
        <div className="flex-1 min-h-0 overflow-hidden">

          <ChatContainerRoot className="h-full min-h-0">
          <div className="pointer-events-none absolute top-0 h-10 w-full bg-gradient-to-b from-background to-transparent z-10" />
          <div className="pointer-events-none absolute bottom-0 h-10 w-full bg-gradient-to-t from-background to-transparent z-10" />

            <ChatContainerContent
              className="
                h-full min-h-0 overflow-y-auto
                px-6 py-6 space-y-6
                overflow-x-hidden
              "
            >
                      
            {messages.map((m) => {
              const lastMessageId = messages[messages.length - 1]?.id;

              const isAssistant = m.role === "assistant";
              
              return (
                <Message
                  key={m.id}
                  className={isAssistant? "justify-start flex-col group" : "justify-end flex-col group "}
                >

                  
                  <div
                    className={cn(
                      "space-y-3 break-words min-w-0",
                      isAssistant
                        ? "w-full"
                        : "max-w-[80%] sm:max-w-[50%] ml-auto w-fit min-w-[50px]"
                    )}
                  >
                                      

                    {isAssistant &&
                      m.id === lastMessageId &&
                      (status === "submitted" || status === "streaming") && (
                        <ShinyText speed={1} className="text-foreground" text="✨ Processing" />
                    )}

                  
                  


                    {m.parts.map((part, i) => {
                      
                      if (part.type === "text") {

                        const isErrorText =
                          part.text.startsWith("⚠️") ||
                          part.text.startsWith("❌") ||
                          part.text.startsWith("🔑");
                      
                        if (isErrorText) {
                          return (
                            <div
                              key={i}
                              className="bg-red-950 border border-red-700 text-red-300 px-4 py-3 rounded-md text-sm"
                            >
                              {part.text}
                            </div>
                          );
                        }
                      
                        const blocks = parseBlocks(part.text);
                      
  
                        return (
                          <div key={i} className="space-y-3">
                            {blocks.map((b, idx) => {
                              if (b.type === "understanding") {
                                return (
                                  <ReasoningSection
                                    key={idx}
                                    title="Understanding"
                                    text={b.text}
                                    isStreaming={status === "streaming"}
                                  />
                                );
                              }
  
                              if (b.type === "plan") {
                                return (
                                  <ReasoningSection
                                    key={idx}
                                    title="SQL Plan"
                                    text={b.text}
                                    isStreaming={status === "streaming"}
                                  />
                                );
                              }
  
                              if (b.type === "sql") {
                                return (
                                  <div key={idx} onClick={()=>{console.log(m.parts)}} className="w-full ml-5 mt-5 mb-5"><SqlCodeBlock key={idx} code={b.text} /></div>
                                  
                                );
                              }
  
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
                          <div key={i} className="space-y-3" >
                            <Tool toolPart={part as any} />
  
                            {part.state === "output-available" && (
                              <DataTable
                                columns={(part.output as any).columns}
                                rows={(part.output as any).rows}
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
                      onClick={() =>
                      {

                        navigator.clipboard.writeText(getMessageText(m))
                        setCopiedId(m.id)
                        setTimeout(() => {
                          setCopiedId("");
                        }, 2000);
                      }
                    }
                    >
                      {m.id==copiedId ?<CheckCheck className=" text-green-500 size-4"/>:<Copy className="size-4" />}
                    </Button>
                  </MessageAction>
                  </MessageActions>
                </Message>
                
              );
              
            })}
            {status === "error" &&(
            <div className="rounded-xl flex items-center gap-2 justify-start w-[90vw] sm:w-[50vw]">
              <p className="p-3 rounded-xl border text-red-500">{error?.message||"An unexpected error occured!"}</p>
              <Button  variant={"outline"} className="w-11 h-11" onClick={()=>{send();console.log(messages)}}><RotateCwIcon/></Button>
            </div>
          )}

           
            </ChatContainerContent>
            
          </ChatContainerRoot>
       
        </div>
        {messages.length === 0 && (
            <div className="h-full w-full flex items-center justify-center">
              <div className="max-w-2xl w-full text-center space-y-2 px-6">
                
                {/* Icon */}
                <div className="flex justify-center">
                  <div className="size-16 rounded-2xl bg-foreground/5 flex items-center justify-center shadow-sm">
                    <Database className="size-8 sm:size-42 text-green-500 animate-pulse" />
                  </div>
                </div>

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

          {/* Input Area */}
          
            
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
