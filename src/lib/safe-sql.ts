import { createClient } from "@supabase/supabase-js";

const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function runSelectQuery(query: string) {
  const normalized = query.trim().toUpperCase();

  // Must start with SELECT
  if (!normalized.startsWith("SELECT")) {
    return { error: "Only SELECT queries are allowed. Use SELECT at the beginning of the statement." };
  }

  // Hard-block destructive queries
  if (
    normalized.includes("DELETE ") ||
    normalized.includes(" DROP ") ||
    normalized.includes(" TRUNCATE ") ||
    normalized.includes(" ALTER ") ||
    normalized.includes("INSERT ") ||
    normalized.includes("UPDATE ") ||
    normalized.includes("CREATE ")
  ) {
    return { error: "Write or destructive operations are not allowed." };
  }

  // Execute RPC safely
  const { data, error } = await db.rpc("execute_safe_query", {
    query_text: query,
  });

  if (error) {
    return { error: error.message };
  }

  return { data };
}
