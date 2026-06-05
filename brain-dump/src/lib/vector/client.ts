/**
 * lib/vector/client.ts
 *
 * Thin wrapper around @upstash/vector.
 *
 * Namespace strategy: one namespace per userId — complete user isolation.
 * Vector ID format:   {sourceId}-{chunkIndex}
 * Payload:            { chunkText, sourceId, title, type, chunkIndex }
 *
 * Index config (Upstash console):
 *   Dimensions: 768  |  Metric: Cosine
 */

import { Index } from "@upstash/vector";

if (
  !process.env.UPSTASH_VECTOR_REST_URL ||
  !process.env.UPSTASH_VECTOR_REST_TOKEN
) {
  throw new Error("Upstash Vector env variables are not set");
}

export interface ChunkPayload {
  chunkText: string;
  sourceId: string;
  title: string;
  type: string;
  chunkIndex: number;
}

export interface ChunkToUpsert {
  id: string;
  vector: number[];
  payload: ChunkPayload;
}

export interface QueryMatch {
  id: string;
  score: number;
  payload: ChunkPayload;
}

// Use untyped Index to avoid the Dict constraint clash.
// We cast our typed ChunkPayload at read time instead.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const vectorIndex = new Index<any>({
  url: process.env.UPSTASH_VECTOR_REST_URL.replace(/^"|"$/g, ""),
  token: process.env.UPSTASH_VECTOR_REST_TOKEN.replace(/^"|"$/g, ""),
});

/**
 * Upsert a batch of chunks into the user's namespace.
 */
export async function upsertChunks(
  userId: string,
  chunks: ChunkToUpsert[],
): Promise<void> {
  const ns = vectorIndex.namespace(userId);
  await ns.upsert(
    chunks.map((c) => ({
      id: c.id,
      vector: c.vector,
      metadata: c.payload,
    })),
  );
}

/**
 * Semantic search within the user's namespace.
 * Returns top-k matches sorted by score descending.
 */
export async function queryVector(
  userId: string,
  vector: number[],
  topK = 5,
): Promise<QueryMatch[]> {
  const ns = vectorIndex.namespace(userId);
  const results = await ns.query({
    vector,
    topK,
    includeMetadata: true,
  });

  return (results as Array<{ id: string | number; score: number; metadata?: unknown }>)
    .filter((r) => r.metadata !== undefined)
    .map((r) => ({
      id: String(r.id),
      score: r.score,
      payload: r.metadata as ChunkPayload,
    }));
}

/**
 * Delete all vector chunks belonging to a specific source.
 * Uses Upstash metadata filter on sourceId field.
 */
export async function deleteBySourceId(
  userId: string,
  sourceId: string,
): Promise<void> {
  const ns = vectorIndex.namespace(userId);

  let hasMore = true;
  let iterations = 0;

  while (hasMore && iterations < 50) {
    iterations++;
    // Query with zero-vector + metadata filter to fetch matching IDs
    const results = await ns.query({
      vector: new Array(768).fill(0),
      topK: 1000,
      includeMetadata: false,
      filter: `sourceId = '${sourceId}'`,
    });

    const ids = (results as Array<{ id: string | number }>).map((r) =>
      String(r.id),
    );

    if (ids.length > 0) {
      await ns.delete(ids);
    }

    if (ids.length < 1000) {
      hasMore = false;
    } else {
      // Delay to allow Upstash indexes to reflect the deletion
      await new Promise((r) => setTimeout(r, 500));
    }
  }
}
