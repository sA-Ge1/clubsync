import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }


  const { data } = await supabase
    .from("chats")
    .select("id, title, updated_at")
    .eq("user_id", user?.id)
    .order("updated_at", { ascending: false });

  return NextResponse.json(data ?? []);
}
