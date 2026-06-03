import { google } from "@ai-sdk/google";
import { streamText, convertToModelMessages, UIMessage } from "ai";
import { auth } from "@/auth";

export const maxDuration = 60;

export async function POST(req: Request) {
  const session = await auth();

  if (!session?.user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { messages }: { messages: UIMessage[] } = await req.json();

  // TODO: Wire up actual RAG pipeline here
  // For now, use direct Gemini streaming via Vercel AI SDK
  const modelMessages = await convertToModelMessages(messages);

  const result = streamText({
    model: google("gemini-2.0-flash"),
    system: `You are Brain Dump, an AI-powered knowledge base assistant. 
You help users understand and query their uploaded documents, PDFs, YouTube transcripts, and web content.
Be helpful, concise, and cite sources when available.
If the user hasn't uploaded any documents yet, guide them to use the dashboard to upload content first.`,
    messages: modelMessages,
  });

  return result.toUIMessageStreamResponse();
}
