/**
 * POST /api/chat
 *
 * RAG-powered chat endpoint.
 *
 * Flow:
 *  1. Auth check
 *  2. Run RAG retrieval (embed query → search vector → relevance gate)
 *  3. Build system prompt with or without RAG context
 *  4. Stream response via Vercel AI SDK (compatible with useChat() client)
 *  5. Persist conversation to MongoDB ChatHistory (via onFinish callback)
 */

import { google } from "@ai-sdk/google";
import { streamText, convertToModelMessages, type UIMessage } from "ai";
import { auth } from "@/auth";
import { retrieve } from "@/lib/retrieval/retrieve";
import { connectDB } from "@/lib/mongodb";
import { ChatHistory } from "@/models/ChatHistory";

export const maxDuration = 60;

const BASE_SYSTEM_PROMPT = `You are Brain Dump, an AI-powered personal knowledge base assistant.
You help users understand and query their uploaded documents, PDFs, YouTube transcripts, and web content.
Be helpful, accurate, and concise. When answering from provided context, reference the source material naturally.
If you don't know something, say so — don't hallucinate.`;

export async function POST(req: Request) {
  // ── Auth ────────────────────────────────────────────────────
  const session = await auth();
  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }
  const userId = session.user.id;

  const { messages }: { messages: UIMessage[] } = await req.json();

  // ── Get the latest user message for RAG retrieval ────────────
  const lastUserMessage = [...messages]
    .reverse()
    .find((m) => m.role === "user");

  const userQuery = lastUserMessage?.parts
    ?.filter((p): p is { type: "text"; text: string } => p.type === "text")
    .map((p) => p.text)
    .join("") ?? "";

  // ── RAG Retrieval ────────────────────────────────────────────
  let ragResult = { context: "", usedRAG: false, sourceIds: [] as string[] };

  if (userQuery && process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    try {
      ragResult = await retrieve(userId, userQuery);
    } catch (err) {
      console.error("[chat] RAG retrieval failed, falling back to general knowledge:", err);
    }
  }

  // ── Build system prompt ──────────────────────────────────────
  const systemPrompt = ragResult.usedRAG
    ? `${BASE_SYSTEM_PROMPT}

## Retrieved Context
The following passages were retrieved from the user's knowledge base. Use them to answer the question accurately.

${ragResult.context}

Answer based on the context above. If the context doesn't fully answer the question, supplement with your general knowledge and say so.`
    : `${BASE_SYSTEM_PROMPT}

The user hasn't uploaded documents relevant to this query (or hasn't uploaded any yet). Answer from your general knowledge. Encourage them to upload documents to the dashboard if they want knowledge-base-specific answers.`;

  // ── Convert messages for model ───────────────────────────────
  const modelMessages = await convertToModelMessages(messages);

  // ── Stream ───────────────────────────────────────────────────
  const result = streamText({
    model: google("gemini-2.5-flash"),
    system: systemPrompt,
    messages: modelMessages,
    onFinish: async ({ text }) => {
      // Persist to MongoDB ChatHistory (fire-and-forget, non-blocking)
      persistChatHistory(userId, userQuery, text, ragResult.usedRAG, ragResult.sourceIds).catch(
        (err) => console.error("[chat] ChatHistory persist failed:", err),
      );
    },
  });

  return result.toUIMessageStreamResponse();
}

// ── Persist conversation turn to MongoDB ─────────────────────
async function persistChatHistory(
  userId: string,
  userMessage: string,
  assistantMessage: string,
  usedRAG: boolean,
  sources: string[],
) {
  if (!userMessage) return;

  await connectDB();

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

  await ChatHistory.findOneAndUpdate(
    { userId },
    { $push: { messages: { $each: newMessages } } },
    { upsert: true, new: true },
  );
}
