import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";
import { getRelevantChunks } from "@/lib/rag";
import { runSelectQuery } from "@/lib/safe-sql";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY! });

const tools = [
  {
    type: "function",
    function: {
      name: "executeSQL",
      description: "Execute a safe SELECT query and return the result.",
      parameters: {
        type: "object",
        properties: { query: { type: "string" } },
        required: ["query"],
      },
    },
  },
];

function formatForLLM(rows: any[]): string {
  if (!rows?.length) return "No results found.";
  
  // Format as simple, readable text for the LLM
  const results = rows.map((row, index) => {
    const fields = Object.entries(row)
      .map(([key, value]) => `${key}: ${value}`)
      .join(', ');
    return `${index + 1}. ${fields}`;
  }).join('\n');
  
  return `Query returned ${rows.length} result(s):\n${results}`;
}

export async function POST(req: NextRequest) {
  try {
    const { message } = await req.json();
    if (!message) {
      return NextResponse.json({ error: "Message required" }, { status: 400 });
    }

    const chunks = await getRelevantChunks(message, 4);
    const context = chunks.join("\n\n---\n\n");

    const systemPrompt = `RULES:
        1. Decide whether SQL is required to answer. Refer context only if needed.
        2. If SQL IS required:
        - DO NOT answer normally.
        - CALL executeSQL with: {"query": "<SELECT statement>"}
        - Do NOT add ANY other text.
        3. If SQL is NOT required:
        Reply EXACTLY: SQL=FALSE
        <your answer>

        SQL WRITING GUIDELINES:
        - ALWAYS use table aliases in JOIN queries
        - ALWAYS alias columns when they come from different tables
        - NEVER return duplicate column names
        - Use descriptive aliases that match the user's question

        EXAMPLE:
        WRONG: SELECT name, name FROM clubs JOIN faculty ON clubs.faculty_id = faculty.faculty_id
        CORRECT: SELECT c.name AS club_name, f.name AS faculty_name FROM clubs c JOIN faculty f ON c.faculty_id = f.faculty_id
        Never include markdown in SQL tool calls.`;

    //console.log(`Query: ${message}\n\nContext:\n${context}`);

    // PASS 1 — Decide SQL or not
    const pass1 = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `${message}\n\nContext:\n${context}` }
      ],
      tools,
      tool_choice: "auto",
      temperature: 0.05,
    });

    //console.log("Pass1:", JSON.stringify(pass1, null, 2));

    const assistantMessage = pass1.choices[0]?.message;
    
    if (!assistantMessage) {
      throw new Error("No response from AI model");
    }

    // 🟢 SQL INVOCATION
    if (assistantMessage.tool_calls && assistantMessage.tool_calls.length > 0) {
      const call = assistantMessage.tool_calls[0];
      
      if (call.function?.name !== "executeSQL") {
        throw new Error(`Unexpected function call: ${call.function?.name}`);
      }

      const { query } = JSON.parse(call.function.arguments);
      
      if (typeof query !== "string") {
        throw new Error("Invalid query parameter");
      }

      //console.log("Generated SQL:", query);

      const raw = await runSelectQuery(query);
      //console.log("SQL Result:", JSON.stringify(raw, null, 2));

      // Format for LLM comprehension
      const llmFriendlyData = raw.error 
        ? `SQL ERROR: ${raw.error}`
        : formatForLLM(raw.data || []);

      // PASS 2 — Format the final answer using SQL results
      const pass2 = await groq.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        messages: [
            {
                role: "system",
                content: `You format SQL results into clear, readable React markdown.
              
              Rules:
              1. Use ONLY the given data; never invent fields.
              2. Group each record and separate with '---'.
              3. Bold field labels.
              4. Be concise. If no results or error, state it plainly.
              5. If there are no results or an error occurs, respond with a short plain message stating that fact—no formatting.
              
              SQL RESULTS:
              ${llmFriendlyData}
              
              User Query: "${message}"`
              },
          { role: "user", content: `Please format the results for: "${message}"` }
        ],
        temperature: 0.1,
      });

      //console.log("Pass2: ", JSON.stringify(pass2, null, 2));
      
      const finalResponse = pass2.choices[0]?.message?.content || "No response generated";
      
      return NextResponse.json({
        sqlUsed: true,
        sql: query,
        data: raw.data,
        message: finalResponse
      });
    }

    // 🔵 NO SQL NEEDED
    const responseText = assistantMessage.content || "No response generated";
    const isSqlFalse = responseText.startsWith("SQL=FALSE");
    const finalAnswer = isSqlFalse ? responseText.replace("SQL=FALSE", "").trim() : responseText;

    //console.log("Direct response:", finalAnswer);
    
    return NextResponse.json({
      sqlUsed: false,
      message: finalAnswer
    });

  } catch (error) {
    //console.error("API Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" }, 
      { status: 500 }
    );
  }
}