import { tool } from "ai";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function assertReadOnly(query: string) {
  const q = query.toLowerCase().trim();

  if (!q.startsWith("select")) {
    throw new Error("Only SELECT queries are allowed");
  }

  const forbidden = ["insert", "update", "delete", "drop", "alter", "truncate"];
  if (forbidden.some((kw) => q.includes(kw))) {
    throw new Error("Forbidden SQL detected");
  }
}

export const sqlTool = tool({
  description: `
    Executes a PostgreSQL SELECT query and returns the result as table data.
    
    This is the ONLY way to access the database.
    The query must strictly follow the provided schema and join rules.
    The output will be rendered as a table by the UI.
    `,

  inputSchema: z.object({
    query: z
      .string()
      .describe("Valid PostgreSQL SELECT query using provided schema"),
  }),

  execute: async ({ query }) => {
    assertReadOnly(query);
    const cleaned = query.replace(/;/g, "");
    // console.log(query);
    const { data, error } = await supabase.rpc("execute_sql", {
      sql: cleaned,
    });

    if (error) throw error;

    const rows = data ?? [];
    const columns = rows.length > 0 ? Object.keys(rows[0]) : [];

    // ✅ Return UI-ready table
    return {
      columns,
      rows,
    };
  },
});
