import {
  streamText,
  convertToModelMessages,
} from "ai";
import { resolveModel } from "@/lib/ai/model-resolver";
import { SYSTEM_PROMPT } from "@/lib/systemPrompt";
import { sqlTool } from "@/lib/tools/sqlTool";
import { errorDecoder } from "@/lib/ai/decodeError";

export async function POST(req: Request) {
  try{
    const userId = req.headers.get("x-user-id");
    if (!userId) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }), 
        {
          status: 401,
          headers: { "Content-Type": "application/json" },
        }
      );
    }
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
        //console.log(error)
        const decoded = errorDecoder(error);
        console.log("This is on stream error ",decoded);
      
      },   
      onFinish(data){
        console.log(data.usage);
      }   
    });
    return result.toUIMessageStreamResponse({
      messageMetadata({ part }) {
    if (part.type === "finish") {
      return {
        usage: part.totalUsage
      };
    }
  },
      onError(error) {
        const decoded = errorDecoder(error);
        return decoded  // ✅ becomes useChat onError
      } 
    });
    
  }catch (err: any) {
    // ONLY pre-stream errors reach here
    const decoded = errorDecoder(err);
    console.log("This is catch error ",decoded)
    return new Response(
      new ReadableStream({
        start(controller) {
          controller.enqueue(decoded);
          controller.close();
        },
      }),
      {
        headers: {
          "Content-Type": "text/event-stream",
        },
        status: 500,
      }
    );
  }
}
