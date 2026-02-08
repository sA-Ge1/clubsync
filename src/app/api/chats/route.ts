// /app/api/chats/route.ts

import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { randomUUID } from "crypto";

export async function POST(req: Request) {
  const supabase = await createClient();
  const userId = req.headers.get("x-user-id");
  if (!userId) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { modelId, mode } = await req.json();

  const chatId = randomUUID();

  const { error } = await supabase.from("chats").insert({
    id: chatId,
    user_id: userId,
    model_id: modelId,
    mode,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ id: chatId });
}
