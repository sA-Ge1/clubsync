// /app/api/chats/route.ts

import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { randomUUID } from "crypto";

export async function POST(req: Request) {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { modelId, mode } = await req.json();

  const chatId = randomUUID();

  const { error } = await supabase.from("chats").insert({
    id: chatId,
    user_id: user.id,
    model_id: modelId,
    mode,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ id: chatId });
}
