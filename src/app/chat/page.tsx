"use client";

import { useState, useRef, useEffect } from "react";
import { useUserInfo } from "@/hooks/useUserInfo";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { 
  Loader2, 
  Send, 
  Database, 
  User, 
  CheckCircle2, 
  XCircle, 
  Sparkles, 
  CornerDownLeft,
  Trash2,
  Bot
} from "lucide-react";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import { useRouter } from "next/navigation";

interface Message {
  role: "user" | "assistant";
  content: string;
  actionPerformed?: boolean;
  actionResult?: {
    success: boolean;
    message: string;
    data?: any;
  };
  timestamp?: Date;
}

export default function ChatPage() {
  const { user, loading: userLoading } = useUserInfo();
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "Hey! State your requirments, and I'll fetch it from ClubSync.",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => {
    if (!userLoading && !user) {
      toast.error("Please login to use AI chat");
      router.push("/login");
    }
  }, [user, userLoading, router]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [input]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    if (!user) {
      toast.error("Please login to use AI chat");
      router.push("/login");
      return;
    }

    const userMessage: Message = {
      role: "user",
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);
    setIsTyping(true);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        toast.error("Session expired. Please login again");
        router.push("/login");
        return;
      }

      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          message: userMessage.content,
        }),
      });
      

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to get response");
      }

      const data = await response.json();

      // Simulate typing delay for better UX
      setTimeout(() => {
        setIsTyping(false);
        const assistantMessage: Message = {
          role: "assistant",
          content: data.message,
          actionPerformed: data.actionPerformed,
          actionResult: data.actionResult,
          timestamp: new Date(),
        };

        setMessages((prev) => [...prev, assistantMessage]);

        if (data.actionPerformed && data.actionResult) {
          if (data.actionResult.success) {
            toast.success(data.actionResult.message);
          } else {
            toast.error(data.actionResult.message);
          }
        }
      }, 1000);

    } catch (error: any) {
      console.error("Chat error:", error);
      setIsTyping(false);
      toast.error(error.message || "Failed to send message");
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `I'm sorry, I encountered an error. Please try again.`,
          timestamp: new Date(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const clearChat = () => {
    setMessages([
      {
        role: "assistant",
        content: "Hey! State your requirments, and I'll fetch it from ClubSync.",
        timestamp: new Date(),
      },
    ]);
    toast.success("Chat cleared");
  };

  const formatTimestamp = (date?: Date) => {
    if (!date) return "";
    return new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    }).format(date);
  };

  if (userLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted/30">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="w-12 h-12 rounded-full bg-gradient-to-r from-primary to-primary/60 flex items-center justify-center">
              <Bot className="h-6 w-6 text-primary-foreground" />
            </div>
            <div className="absolute -inset-1 rounded-full bg-primary/20 animate-pulse"></div>
          </div>
          <p className="text-muted-foreground animate-pulse">Summoning AI assistant</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 flex flex-col">
      {/* Header */}
      <div className="bg-background/80 backdrop-blur-md supports-[backdrop-filter]:bg-background/60 sticky top-0 z-10">
        <div className="max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-r from-primary to-primary/70 flex items-center justify-center shadow-lg">
                <Bot className="h-5 w-5 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                  AI Assistant
                </h1>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={clearChat}
                className="gap-2 hover:bg-destructive hover:text-destructive-foreground transition-colors"
              >
                <Trash2 className="h-4 w-4" />
                Clear Chat
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div
          ref={scrollAreaRef}
          className="flex-1 overflow-y-auto space-y-6 mb-6 scroll-smooth pb-4"
        >
          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex gap-4 ${
                message.role === "user" ? "justify-end" : "justify-start"
              } animate-in fade-in slide-in-from-bottom-4 duration-300`}
            >
              {message.role === "assistant" && (
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 border border-primary/20 flex items-center justify-center shadow-sm">
                    <Database className="h-5 w-5 text-primary" />
                  </div>
                </div>
              )}

              <div className={`flex flex-col gap-2 max-w-[85%] sm:max-w-[75%] ${message.role === "user" ? "items-end" : "items-start"}`}>
                <div className="flex items-center gap-2 mb-1 px-1">
                  {message.role === "user" && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <User className="h-3 w-3" />
                      <span>You</span>
                    </div>
                  )}
                  {message.timestamp && (
                    <span className="text-xs text-muted-foreground">
                      {formatTimestamp(message.timestamp)}
                    </span>
                  )}
                </div>

                {/* Message Bubble */}
                <div
                  className={`group relative overflow-hidden rounded-2xl p-4 shadow-sm backdrop-blur-sm transition-all duration-200 hover:shadow-md ${
                    message.role === "user"
                      ? "bg-gradient-to-br from-primary to-primary/90 text-primary-foreground"
                      : "bg-background border border-border/50"
                  }`}
                >
                  {/* Message Content */}
                  <div className={`prose prose-sm max-w-none ${
                    message.role === "user" ? "prose-invert" : "dark:prose-invert"
                  } prose-headings:mt-0 prose-headings:mb-2 prose-p:my-2 prose-ul:my-2 prose-ol:my-2 prose-code:text-sm prose-pre:bg-muted/50 prose-pre:border prose-pre:rounded-lg`}>
                    <ReactMarkdown>{message.content}</ReactMarkdown>
                  </div>

                  {/* Action Result */}
                  {message.actionPerformed && message.actionResult && (
                    <div className={`mt-4 pt-4 ${
                      message.role === "user" ? "border-primary-foreground/20" : "border-border/50"
                    } border-t`}>
                      <div className="flex items-start gap-3">
                        {message.actionResult.success ? (
                          <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                        ) : (
                          <XCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge
                              variant={message.actionResult.success ? "default" : "destructive"}
                              className="text-xs"
                            >
                              {message.actionResult.success ? "Success" : "Failed"}
                            </Badge>
                          </div>
                          <p className={`text-sm font-medium ${
                            message.role === "user" ? "text-primary-foreground/90" : "text-foreground"
                          }`}>
                            {message.actionResult.message}
                          </p>
                          {message.actionResult.data && (
                            <div className={`mt-3 p-3 rounded-lg border ${
                              message.role === "user" 
                                ? "bg-primary-foreground/10 border-primary-foreground/20" 
                                : "bg-muted/50 border-border/50"
                            }`}>
                              <pre className="text-xs overflow-x-auto">
                                {JSON.stringify(message.actionResult.data, null, 2)}
                              </pre>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {message.role === "user" && (
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-lg border-2 border-primary/20">
                    <User className="h-5 w-5 text-primary-foreground" />
                  </div>
                </div>
              )}
            </div>
          ))}

          {loading && isTyping && (
            <div className="flex gap-4 justify-start animate-in fade-in slide-in-from-bottom-4 duration-300">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 border border-primary/20 flex items-center justify-center shadow-sm">
                <Database className="h-5 w-5 text-primary" />
              </div>
              <div className="bg-background border border-border/50 rounded-2xl p-4 shadow-sm backdrop-blur-sm">
                <div className="flex items-center gap-3">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-muted-foreground/60 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-muted-foreground/60 rounded-full animate-bounce" style={{ animationDelay: "0.1s" }}></div>
                    <div className="w-2 h-2 bg-muted-foreground/60 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }}></div>
                  </div>
                  <span className="text-sm text-muted-foreground">AI is thinking...</span>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="sticky bottom-0 bg-background/95 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60 border-t pt-4 rounded-t-2xl">
          <div className="flex gap-3 items-end">
            <div className="flex-1 relative">
              <Textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask a question or request an action..."
                className="min-h-[60px] max-h-[120px] resize-none pr-12 text-base border-2 focus:border-primary/50 transition-all duration-200 rounded-2xl shadow-sm"
                disabled={loading}
                rows={1}
              />
              <div className="absolute bottom-3 right-3 flex items-center gap-1 text-xs text-muted-foreground bg-background/80 px-2 py-1 rounded-full">
                <CornerDownLeft className="h-3 w-3" />
                <span>Enter</span>
              </div>
            </div>
            <Button
              onClick={handleSend}
              disabled={loading || !input.trim()}
              size="lg"
              className="h-[60px] px-6 rounded-2xl shadow-lg bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary/80 transition-all duration-200 disabled:opacity-50 disabled:shadow-none"
            >
              {loading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <div className="flex items-center gap-2">
                  <Send className="h-4 w-4" />
                  <span className="hidden sm:inline">Send</span>
                </div>
              )}
            </Button>
          </div>
          <div className="mt-3 flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <Sparkles className="h-3 w-3" />
            <span>AI can help with questions related to clubs, inventory, members, transactions, and more</span>
          </div>
        </div>
      </div>
    </div>
  );
}