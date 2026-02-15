import {
  streamText,
  convertToModelMessages,
} from "ai";
import { resolveModel } from "@/lib/ai/model-resolver";
import { SYSTEM_PROMPT } from "@/lib/systemPrompt";
import { sqlTool } from "@/lib/tools/sqlTool";
import { reportTool } from "@/lib/tools/reportTool";
import { tavilyTool } from "@/lib/tools/tavilyTool";
import { schemaInfoTool } from "@/lib/tools/schemaInfoTool";
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
      tools: { 
        sql: sqlTool,
        report: reportTool,
        tavily: tavilyTool,
        schema_info: schemaInfoTool,
      },
      toolChoice: "auto",
      // Stop after 6 steps OR immediately after successful report generation
      stopWhen: (context) => {
        // Stop only if report tool succeeded (pdf_data is too large for model context)
        // If report failed (e.g., club not found), let the AI continue to respond
        for (const step of context.steps) {
          if (step.toolResults) {
            for (const toolResult of step.toolResults) {
              // Cast to any to access dynamic properties
              const tr = toolResult as any;
              const output = tr.output || tr.result || tr;
              if (toolResult.toolName === 'report' && output?.success === true) {
                console.log("🛑 Stopping: successful report generated");
                return true;
              }
            }
          }
        }
        // Also stop after 6 steps max
        return context.steps.length >= 6;
      },
      onStepFinish(step) {
        // Step contains what just happened
        if (step.toolCalls?.length) {
          for (const call of step.toolCalls) {
            console.log("🛠 Tool called:", call.toolName);
          }
        }
    
        if (step.toolResults?.length) {
          for (const res of step.toolResults) {
            console.log("✅ Tool result from:", res.toolName);
            // Debug: log structure for report tool
            if (res.toolName === 'report') {
              const r = res as any;
              console.log("📊 Report result structure:", JSON.stringify({
                hasOutput: !!r.output,
                outputSuccess: r.output?.success,
                directSuccess: r.success,
              }));
            }
          }
        }
      },
      onError(error) {
        const decoded = errorDecoder(error);
        console.log("This is on stream error: ",decoded);
      
      },  
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
