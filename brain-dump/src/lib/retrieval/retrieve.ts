/**
 * lib/retrieval/retrieve.ts
 *
 * Basic RAG retrieval orchestrator (Phase 1 — no HyDE / multi-query yet).
 *
 * Steps:
 *  1. Embed user query → 768-dim vector
 *  2. Query Upstash Vector in user's namespace → top-5 chunks
 *  3. Relevance gate → if top score < 0.5, skip RAG context
 *  4. Format context from retrieved chunks
 *  5. Return { context, usedRAG, sourceIds }
 *
 * Streaming and history persistence are handled by the /api/chat route
 * so this function stays pure and testable.
 */

import { embedSingle } from "@/lib/ingestion/embedder";
import { queryVector, type QueryMatch } from "@/lib/vector/client";

const RELEVANCE_THRESHOLD = 0.5;
const TOP_K = 5;

export interface RetrievalResult {
  /** Formatted context string to inject into the LLM system prompt */
  context: string;
  /** Whether RAG context was actually used (false = general knowledge fallback) */
  usedRAG: boolean;
  /** MongoDB Source IDs of the chunks that were used */
  sourceIds: string[];
  /** Raw chunk matches for debugging / citation UI */
  chunks: QueryMatch[];
}

/**
 * Run the basic RAG retrieval pipeline for a user query.
 *
 * @param userId   - MongoDB user ID (used as Upstash namespace)
 * @param query    - Raw user question
 */
export async function retrieve(
  userId: string,
  query: string,
): Promise<RetrievalResult> {
  // Step 1 — Embed query
  const queryVector = await embedSingle(query);

  // Step 2 — Semantic search
  const matches = await queryVectorStore(userId, queryVector);

  // Step 3 — Relevance gate
  const topScore = matches[0]?.score ?? 0;
  if (topScore < RELEVANCE_THRESHOLD || matches.length === 0) {
    return {
      context: "",
      usedRAG: false,
      sourceIds: [],
      chunks: [],
    };
  }

  // Step 4 — Format context
  const context = formatContext(matches);
  const sourceIds = [...new Set(matches.map((m) => m.payload.sourceId))];

  return {
    context,
    usedRAG: true,
    sourceIds,
    chunks: matches,
  };
}

async function queryVectorStore(
  userId: string,
  vector: number[],
): Promise<QueryMatch[]> {
  return queryVector(userId, vector, TOP_K);
}

function formatContext(matches: QueryMatch[]): string {
  const lines = matches.map((m, i) => {
    const { chunkText, title, type } = m.payload;
    return `[Source ${i + 1}] "${title}" (${type})\n${chunkText}`;
  });
  return lines.join("\n\n---\n\n");
}
