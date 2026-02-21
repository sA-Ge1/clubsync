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
import { gmailReadTool } from "@/lib/tools/gmailReadTool";
import { gmailSendTool } from "@/lib/tools/gmailSendTool";
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
        web_search: tavilyTool,
        schema_info: schemaInfoTool,
        read_gmail: gmailReadTool,
        send_gmail: gmailSendTool,
      },
      toolChoice: "auto",
      temperature: 0.2,
      // Stop after 10 steps OR immediately after successful report generation OR after detailed email fetch
      stopWhen: (context) => {
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
              // Stop after detailed email fetch (UI will render it)
              if (toolResult.toolName === 'read_gmail' && output?.mode === 'detail' && output?.email) {
                console.log("🛑 Stopping: detailed email fetched, UI will render");
                return true;
              }
              if (toolResult.toolName === 'send_gmail' && output?.mode === 'confirmation_required' && output?.draft) {
                console.log("🛑 Stopping: detailed email sent, UI will render");
                return true;
              }
            }
          }
        }
        // Also stop after 10 steps max
        return context.steps.length >= 10;
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
