import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
export async function GET(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const supabase = await createClient();
  const userId = req.headers.get("x-user-id");
  if (!userId) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
  
  const { data, error } = await supabase
    .from("chats")
    .select("id, model_id, mode")
    .eq("id", id)
    .eq("user_id", userId)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function DELETE(
    req: Request,
    context: { params: Promise<{ id: string }> }
  ) {
    const { id } = await context.params;
    const supabase = await createClient();
    const userId = req.headers.get("x-user-id");
    if (!userId) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
    await supabase.from("chats").delete().eq("id", id).eq("user_id", userId);
  
    return NextResponse.json({ ok: true });
  }
  
  
  export async function PATCH(
    req: Request,
    context: { params: Promise<{ id: string }> }
  ) {
    const { id } = await context.params;
    const { title } = await req.json();
    
    const supabase = await createClient();
    const userId = req.headers.get("x-user-id");
    if (!userId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
    await supabase.from("chats").update({ title }).eq("id", id).eq("user_id", userId);
  
    return NextResponse.json({ ok: true });
  }