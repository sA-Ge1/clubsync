import { NextResponse } from "next/server";
import { getRelevantChunks } from "@/lib/rag";

export async function GET() {
  const query = "can a student approve funds?";
  const chunks = await getRelevantChunks(query);

  return NextResponse.json({ chunks });
}
