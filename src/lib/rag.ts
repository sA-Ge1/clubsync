import { InferenceClient } from "@huggingface/inference";
import { createClient } from "@supabase/supabase-js";

const hf = new InferenceClient(process.env.HF_TOKEN);
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function getRelevantChunks(query: string, limit = 2) {
  // 1. embed the query with the SAME model
  const embeddingResponse = await hf.featureExtraction({
    model: "BAAI/bge-base-en-v1.5",
    inputs: query,
    provider: "hf-inference",
  });

  const queryVector = embeddingResponse; // already an array of floats

  // 2. semantic search in Supabase
  const { data, error } = await supabase.rpc("match_chunks", {
    query_embedding: queryVector,
    match_count: limit,
  });

  if (error) throw error;

  return data.map((row: any) => row.content);
}
