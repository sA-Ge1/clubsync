import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { openai } from "@ai-sdk/openai";
import { generateText } from "ai";
export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
  const body = await req.json();

  const { chat_id, user_parts, assistant_parts,is_first_turn } = body;

  const { error } = await supabase.from("messages").insert([
    {
      id: randomUUID(),
      chat_id,
      role: "user",
      parts: user_parts,
    },
    {
      id: randomUUID(),
      chat_id,
      role: "assistant",
      parts: assistant_parts,
    },
  ]);

  if (error) {
    console.error("SUPABASE INSERT ERROR:", error);
    return NextResponse.json({ error }, { status: 500 });
  }
  if (is_first_turn) {
    const userText = user_parts.map((p: any) => p.text).join(" ");
    const { text } = await generateText({
      model: openai("gpt-4o-mini"),
      temperature: 0.2,
      prompt: `
        Create a concise 3–5 word chat title from the user request below.
        
        Rules:
        - No quotes
        - No punctuation at the end
        - Title case
        - Plain words only
        
        User request:
        ${userText}
        `.trim(),
        });
    

    await supabase
      .from("chats")
      .update({ title: text.trim() })
      .eq("id", chat_id);
  }

  return NextResponse.json({ ok: true });
}
