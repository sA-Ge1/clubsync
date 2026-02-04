export function decodeAIError(error: any): {
    status: number;
    message: string;
  } {
    const raw = String(error?.message || error || "").toLowerCase();
    if (raw.includes("gatewayauthenticationerror") || raw.includes("ai gateway")) {
        return {
          status: 401,
          message: "AI provider is not configured correctly.",
        };
      }      
    // ---- Auth / API key ----
    if (raw.includes("api key") || raw.includes("unauthorized")) {
      return { status: 401, message: "Invalid or missing API key." };
    }
  
    // ---- Rate limits ----
    if (raw.includes("rate limit") || raw.includes("too many requests")) {
      return { status: 429, message: "Too many requests. Please wait a moment." };
    }
  
    // ---- Context / token overflow ----
    if (
      raw.includes("context length") ||
      raw.includes("max tokens") ||
      raw.includes("too long")
    ) {
      return {
        status: 400,
        message: "Conversation is too long. Please start a new chat.",
      };
    }
  
    // ---- Model not found / wrong id ----
    if (raw.includes("model") && raw.includes("not found")) {
      return {
        status: 400,
        message: "Selected model is unavailable.",
      };
    }
  
    // ---- Tool errors ----
    if (raw.includes("tool") || raw.includes("sql")) {
      return {
        status: 400,
        message: "Failed while querying the database.",
      };
    }
  
    // ---- Network / provider outages ----
    if (
      raw.includes("fetch failed") ||
      raw.includes("network") ||
      raw.includes("timeout")
    ) {
      return {
        status: 503,
        message: "AI service is temporarily unavailable.",
      };
    }
  
    // ---- JSON / validation / malformed messages ----
    if (raw.includes("json") || raw.includes("validation")) {
      return {
        status: 400,
        message: "Invalid message format.",
      };
    }
  
    // ---- Fallback ----
    return {
      status: 500,
      message: "Something went wrong. Please try again.",
    };
  }
  