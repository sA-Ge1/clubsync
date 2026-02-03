import {
  streamText,
  convertToModelMessages,
} from "ai";
import { resolveModel } from "@/lib/ai/model-resolver";
import { SYSTEM_PROMPT } from "@/lib/systemPrompt";
import { sqlTool } from "@/lib/tools/sqlTool";

export async function POST(req: Request) {
  try{
  const { messages, mode, modelId, userApiKey } = await req.json();

  const model = resolveModel({ mode, model: modelId, userApiKey });
  const modelMessages = await convertToModelMessages(messages);
  
    const result = streamText({
      model,
      system: SYSTEM_PROMPT,
      messages: modelMessages,
      tools: { sql: sqlTool},
      toolChoice: "auto",
      onStepFinish(step) {
        // Step contains what just happened
        if (step.toolCalls?.length) {
          for (const call of step.toolCalls) {
            console.log("🛠 Tool called:", call.toolName);
          }
        }
    
        if (step.toolResults?.length) {
          for (const result of step.toolResults) {
            console.log("✅ Tool result from:", result.toolName);
          }
        }
      },
      onError(error) {
        console.error("LLM ERROR CAUGHT:", error);
      },
    });
    return result.toUIMessageStreamResponse();
  }catch (err: any) {
    return new Response(err.message, {
      status: 500,
      headers: { "Content-Type": "text/plain" },
    });
  }
}
