import { google } from "@ai-sdk/google";
import { embedMany, embed } from "ai";

const BATCH_SIZE = 20;
const EMBEDDING_MODEL = "gemini-embedding-001";

// Provider options that truncate the 3072-dim output to 768 dims via MRL
const EMBEDDING_PROVIDER_OPTIONS = {
  google: {
    outputDimensionality: 768,
  },
};

export async function embedChunks(chunks: string[]): Promise<number[][]> {
  const allEmbeddings: number[][] = [];

  for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
    const batch = chunks.slice(i, i + BATCH_SIZE);
    const embeddings = await embedBatchWithRetry(batch);
    allEmbeddings.push(...embeddings);
  }

  return allEmbeddings;
}

/**
 * Embed a single string (e.g. a user query) into a 768-dim vector.
 */
export async function embedSingle(text: string): Promise<number[]> {
  try {
    const { embedding } = await embed({
      model: google.textEmbeddingModel(EMBEDDING_MODEL),
      value: text,
      providerOptions: EMBEDDING_PROVIDER_OPTIONS,
    });
    return embedding;
  } catch (err: unknown) {
    if (isRateLimit(err)) {
      await sleep(3000);
      const { embedding } = await embed({
        model: google.textEmbeddingModel(EMBEDDING_MODEL),
        value: text,
        providerOptions: EMBEDDING_PROVIDER_OPTIONS,
      });
      return embedding;
    }
    throw err;
  }
}

async function embedBatchWithRetry(batch: string[]): Promise<number[][]> {
  try {
    const { embeddings } = await embedMany({
      model: google.textEmbeddingModel(EMBEDDING_MODEL),
      values: batch,
      providerOptions: EMBEDDING_PROVIDER_OPTIONS,
    });
    return embeddings;
  } catch (err: unknown) {
    if (isRateLimit(err)) {
      await sleep(3000);
      const { embeddings } = await embedMany({
        model: google.textEmbeddingModel(EMBEDDING_MODEL),
        values: batch,
        providerOptions: EMBEDDING_PROVIDER_OPTIONS,
      });
      return embeddings;
    }
    throw err;
  }
}

function isRateLimit(err: unknown): boolean {
  return (
    err instanceof Error &&
    (err.message.includes("429") || err.message.toLowerCase().includes("quota"))
  );
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
