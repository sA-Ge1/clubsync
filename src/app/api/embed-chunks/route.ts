import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { InferenceClient } from "@huggingface/inference";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const hf = new InferenceClient(process.env.HF_TOKEN);

export async function POST() {
  // 1. Fetch chunks that don't have embeddings
  const { data: chunks, error } = await supabase
    .from("knowledge_chunks")
    .select("id, content")
    .is("embedding", null);

  if (error) return NextResponse.json({ error });

  let embedded = 0;

  // 2. Generate embeddings using BAAI
  for (const chunk of chunks) {
    const vector = await hf.featureExtraction({
      model: "BAAI/bge-base-en-v1.5",
      inputs: chunk.content,
      provider: "hf-inference", // free-tier eligible model
    });

    // 3. Store embedding vector in Supabase
    await supabase
      .from("knowledge_chunks")
      .update({ embedding: vector })
      .eq("id", chunk.id);
    //console.log(chunk.id, vector.length);


    embedded++;
  }

  return NextResponse.json({
    status: "completed",
    embedded,
  });
}
