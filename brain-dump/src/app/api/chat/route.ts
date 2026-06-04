/**
 * POST /api/chat
 *
 * RAG-powered chat endpoint with multi-session support.
 *
 * Flow:
 *  1. Auth check
 *  2. Run RAG retrieval (embed query → vector search → relevance gate)
 *  3. Fetch source metadata for citation annotations
 *  4. Build system prompt with or without RAG context
 *  5. Create ChatSession if needed (returns X-Session-Id header)
 *  6. Stream response via createUIMessageStream
 *     - writes source data part before text
 *     - merges streamText output stream
 *  7. On finish: persist messages to MongoDB ChatSession
 */

import { google } from "@ai-sdk/google";
import {
  streamText,
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse,
  type UIMessage,
  type UIMessageStreamWriter,
} from "ai";
import { auth } from "@/auth";
import { retrieve } from "@/lib/retrieval/retrieve";
import { connectDB } from "@/lib/mongodb";
import { ChatSession } from "@/models/ChatSession";
import { Source } from "@/models/Source";
import mongoose from "mongoose";

export const maxDuration = 60;

const BASE_SYSTEM_PROMPT = `You are Brain Dump, an AI-powered personal knowledge base assistant.
You help users understand and query their uploaded documents, PDFs, YouTube transcripts, and web content.
Be helpful, accurate, and concise. Format your responses with markdown when appropriate — use headings, lists, and code blocks where they improve clarity.
When answering from provided context, reference the source material naturally.
If you don't know something, say so — don't hallucinate.`;

type SourceAnnotation = {
  id: string;
  title: string;
  type: string;
  url: string | null;
};

export async function POST(req: Request) {
  // ── Auth ────────────────────────────────────────────────────
  const session = await auth();
  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }
  const userId = session.user.id;

  const {
    messages,
    sessionId,
  }: { messages: UIMessage[]; sessionId?: string } = await req.json();

  // ── Get the latest user message for RAG retrieval ──────────
  const lastUserMessage = [...messages].reverse().find((m) => m.role === "user");
  const userQuery =
    lastUserMessage?.parts
      ?.filter((p): p is { type: "text"; text: string } => p.type === "text")
      .map((p) => p.text)
      .join("") ?? "";

  // ── RAG Retrieval ──────────────────────────────────────────
  let ragResult = { context: "", usedRAG: false, sourceIds: [] as string[] };
  if (userQuery && process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    try {
      ragResult = await retrieve(userId, userQuery);
    } catch (err) {
      console.error("[chat] RAG retrieval failed, falling back to general knowledge:", err);
    }
  }

  // ── Fetch source metadata for annotation ──────────────────
  let ragSources: SourceAnnotation[] = [];
  if (ragResult.usedRAG && ragResult.sourceIds.length > 0) {
    try {
      await connectDB();
      const validIds = ragResult.sourceIds.filter((id) =>
        mongoose.Types.ObjectId.isValid(id),
      );
      const sourceDocs = await Source.find(
        { _id: { $in: validIds }, userId },
        { title: 1, type: 1, url: 1 },
      ).lean();
      ragSources = sourceDocs.map((s) => ({
        id: s._id.toString(),
        title: s.title,
        type: s.type,
        url: s.url ?? null,
      }));
    } catch (err) {
      console.error("[chat] Source metadata fetch failed:", err);
    }
  }

  // ── Build system prompt ────────────────────────────────────
  const systemPrompt = ragResult.usedRAG
    ? `${BASE_SYSTEM_PROMPT}

## Retrieved Context
The following passages were retrieved from the user's knowledge base. Use them to answer the question accurately.

${ragResult.context}

Answer based on the context above. If the context doesn't fully answer the question, supplement with your general knowledge and say so.`
    : `${BASE_SYSTEM_PROMPT}

The user hasn't uploaded documents relevant to this query (or hasn't uploaded any yet). Answer from your general knowledge. Encourage them to upload documents to the dashboard if they want knowledge-base-specific answers.`;

  // ── Create session if new ──────────────────────────────────
  await connectDB();
  let resolvedSessionId = sessionId;
  if (!resolvedSessionId) {
    const autoTitle = userQuery.slice(0, 60) || "New Chat";
    const newSession = await ChatSession.create({
      userId,
      title: autoTitle,
      messages: [],
    });
    resolvedSessionId = newSession._id.toString();
  }

  // ── Build model messages ───────────────────────────────────
  const modelMessages = await convertToModelMessages(messages);

  // ── Stream ─────────────────────────────────────────────────
  const stream = createUIMessageStream({
    execute: async ({ writer }: { writer: UIMessageStreamWriter }) => {
      // Write source annotation as a data part (type: "data")
      if (ragSources.length > 0) {
        writer.write({
          type: "data-sources",
          id: "sources",
          data: { sources: ragSources },
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any);
      }

      // Stream the LLM response
      const result = streamText({
        model: google("gemini-2.5-flash"),
        system: systemPrompt,
        messages: modelMessages,
        onFinish: async ({ text }) => {
          persistMessages(
            resolvedSessionId!,
            userQuery,
            text,
            ragResult.usedRAG,
            ragResult.sourceIds,
          ).catch((err) =>
            console.error("[chat] Session persist failed:", err),
          );
        },
      });

      writer.merge(result.toUIMessageStream());
    },
  });

  return createUIMessageStreamResponse({
    stream,
    headers: {
      "X-Session-Id": resolvedSessionId ?? "",
      "Cache-Control": "no-cache, no-transform",
      "X-Accel-Buffering": "no",
    },
  });
}

// ── Persist conversation messages to ChatSession ────────────
async function persistMessages(
  sessionId: string,
  userMessage: string,
  assistantMessage: string,
  usedRAG: boolean,
  sources: string[],
) {
  if (!userMessage) return;

  const newMessages = [
    {
      role: "user" as const,
      content: userMessage,
      usedRAG: false,
      sources: [],
      createdAt: new Date(),
    },
    {
      role: "assistant" as const,
      content: assistantMessage,
      usedRAG,
      sources,
      createdAt: new Date(),
    },
  ];

  await ChatSession.findByIdAndUpdate(sessionId, {
    $push: { messages: { $each: newMessages } },
  });
}
