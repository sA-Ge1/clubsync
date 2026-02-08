import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";

export async function requireAdmin() {
  const supabase = await createClient();

  // 1. Check auth header set by middleware
  const requestHeaders = await headers();
  const userId = requestHeaders.get("x-user-id");
  if (!userId) {
    return { error: NextResponse.json({ message: "Unauthorized" }, { status: 401 }) };
  }

  // 2. Check role from public.auth using USER client (RLS applies)
  const { data: roleRow, error: roleError } = await supabase
    .from("auth")
    .select("role")
    .eq("id", userId)
    .single();

  if (roleError || !roleRow) {
    return { error: NextResponse.json({ message: "Forbidden" }, { status: 403 }) };
  }

  if (roleRow.role !== "admin") {
    return { error: NextResponse.json({ message: "Admin only" }, { status: 403 }) };
  }

  return { userId };
}
