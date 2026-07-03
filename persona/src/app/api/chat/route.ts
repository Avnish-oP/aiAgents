import { NextRequest } from "next/server";
import {
  OPENROUTER_API_URL,
  DEFAULT_MODEL,
  MAX_CONTEXT_MESSAGES,
} from "@/lib/constants";
import { getSystemPrompt, getPersonaConfig } from "@/lib/personas";
import { ChatRequest, CotResponse } from "@/types";
import { COT_INSTRUCTION, TOOL_RESULT_INSTRUCTION } from "@/lib/tools";
import { searchVideos } from "@/lib/youtube";

/**
 * Helper to extract a partial JSON string value robustly from a growing buffer.
 */
function extractPartialJsonValue(buffer: string, key: string): string {
  const regex = new RegExp(`"${key}"\\s*:\\s*"`);
  const match = buffer.match(regex);
  if (!match) return "";

  const startIdx = match.index! + match[0].length;
  let endIdx = startIdx;
  let escaped = false;
  
  while (endIdx < buffer.length) {
    if (escaped) {
      escaped = false;
    } else if (buffer[endIdx] === '\\') {
      escaped = true;
    } else if (buffer[endIdx] === '"') {
      break;
    }
    endIdx++;
  }

  const rawValue = buffer.substring(startIdx, endIdx);
  try {
    return JSON.parse(`"${rawValue}"`);
  } catch {
    // Fallback if partial escape sequences prevent parsing
    return rawValue.replace(/\\n/g, '\n').replace(/\\"/g, '"').replace(/\\\\/g, '\\');
  }
}

/**
 * Parse the complete JSON buffer at the end of Phase 1.
 */
function parseCotResponse(text: string): CotResponse | null {
  try {
    return JSON.parse(text);
  } catch {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[0]);
      } catch {
        return null;
      }
    }
    return null;
  }
}

/**
 * Make a streaming call to the LLM.
 */
async function callLLMStreaming(
  messages: { role: string; content: string }[],
  apiKey: string
): Promise<Response> {
  const response = await fetch(OPENROUTER_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
      "X-Title": "Persona Chat",
    },
    body: JSON.stringify({
      model: DEFAULT_MODEL,
      messages,
      stream: true,
      temperature: 0.6,
      max_tokens: 1024,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`LLM API error: ${response.status} - ${errorText}`);
  }

  return response;
}

export async function POST(req: NextRequest) {
  try {
    const body: ChatRequest = await req.json();
    const { messages, persona: personaId } = body;
    const apiKey = process.env.OPENROUTER_API_KEY;
    
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "OpenRouter API key not configured" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    const personaConfig = getPersonaConfig(personaId);
    const baseSystemPrompt = getSystemPrompt(personaId);
    const trimmedMessages = messages.slice(-MAX_CONTEXT_MESSAGES);
    const cotSystemPrompt = baseSystemPrompt + COT_INSTRUCTION;
    const cotMessages = [
      { role: "system", content: cotSystemPrompt },
      ...trimmedMessages.map((m) => ({ role: m.role, content: m.content })),
    ];

    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        const decoder = new TextDecoder();
        
        try {
          // ═══════════════════════════════════════════════════
          // PHASE 1: Streaming JSON CoT Decision
          // ═══════════════════════════════════════════════════
          console.log("[CoT] Phase 1: Decision call (streaming)...");
          const phase1Response = await callLLMStreaming(cotMessages, apiKey);
          const reader = phase1Response.body?.getReader();
          if (!reader) throw new Error("No reader available for Phase 1");

          let buffer = "";
          let lastThinkingLength = 0;
          let lastResponseLength = 0;

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split("\n").filter((l) => l.trim());

            for (const line of lines) {
              if (line.startsWith("data: ") && line !== "data: [DONE]") {
                try {
                  const data = JSON.parse(line.slice(6));
                  const textDelta = data.choices?.[0]?.delta?.content;
                  if (textDelta) {
                    buffer += textDelta;

                    // Extract and stream 'thinking'
                    const currentThinking = extractPartialJsonValue(buffer, "thinking");
                    if (currentThinking.length > lastThinkingLength) {
                      const newThinking = currentThinking.slice(lastThinkingLength);
                      controller.enqueue(
                        encoder.encode(`data: ${JSON.stringify({ thinking: newThinking })}\n\n`)
                      );
                      lastThinkingLength = currentThinking.length;
                    }

                    // Extract and stream 'response' (if OUTPUT state)
                    const currentResponse = extractPartialJsonValue(buffer, "response");
                    if (currentResponse.length > lastResponseLength) {
                      const newResponse = currentResponse.slice(lastResponseLength);
                      controller.enqueue(
                        encoder.encode(`data: ${JSON.stringify({ content: newResponse })}\n\n`)
                      );
                      lastResponseLength = currentResponse.length;
                    }
                  }
                } catch {
                  // Ignore malformed JSON chunks
                }
              }
            }
          }

          // ═══════════════════════════════════════════════════
          // PHASE 2: Tool Execution (if needed)
          // ═══════════════════════════════════════════════════
          const cotResponse = parseCotResponse(buffer);
          if (cotResponse?.state === "TOOL_CALL" && cotResponse.tool?.name === "search_youtube") {
            const query = cotResponse.tool.args.query;
            const channelId = personaConfig.youtubeChannelIds[0];
            console.log(`[CoT] TOOL_CALL: search_youtube("${query}")`);
            
            const videos = await searchVideos(query, channelId);
            if (videos.length > 0) {
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ videos })}\n\n`)
              );
            }

            // ═══════════════════════════════════════════════════
            // PHASE 3: Streaming Final Response (after Tool Call)
            // ═══════════════════════════════════════════════════
            const videoSummary = videos.length > 0
              ? videos.map((v, i) => `${i + 1}. "${v.title}" — https://youtube.com/watch?v=${v.videoId}`).join("\n")
              : "No videos found for this query.";
            const toolResultPrompt = TOOL_RESULT_INSTRUCTION.replace("{TOOL_RESULTS}", videoSummary);
            const finalMessages = [
              { role: "system", content: baseSystemPrompt + toolResultPrompt },
              ...trimmedMessages.map((m) => ({ role: m.role, content: m.content })),
            ];

            console.log("[CoT] Phase 3: Final stream...");
            const phase3Response = await callLLMStreaming(finalMessages, apiKey);
            const phase3Reader = phase3Response.body?.getReader();
            if (phase3Reader) {
              while (true) {
                const { done, value } = await phase3Reader.read();
                if (done) break;
                
                const chunk = decoder.decode(value, { stream: true });
                const lines = chunk.split("\n").filter((l) => l.trim());
                for (const line of lines) {
                  if (line.startsWith("data: ") && line !== "data: [DONE]") {
                    try {
                      const data = JSON.parse(line.slice(6));
                      const textDelta = data.choices?.[0]?.delta?.content;
                      if (textDelta) {
                        controller.enqueue(
                          encoder.encode(`data: ${JSON.stringify({ content: textDelta })}\n\n`)
                        );
                      }
                    } catch {}
                  }
                }
              }
            }
          } else {
            // Fallback for failed JSON or empty output
            if (lastResponseLength === 0) {
              console.warn("[CoT] No response streamed, falling back to full standard LLM call...");
              const fallbackResponse = await callLLMStreaming([
                { role: "system", content: baseSystemPrompt },
                ...trimmedMessages.map((m) => ({ role: m.role, content: m.content })),
              ], apiKey);
              const fallbackReader = fallbackResponse.body?.getReader();
              if (fallbackReader) {
                while (true) {
                  const { done, value } = await fallbackReader.read();
                  if (done) break;
                  const chunk = decoder.decode(value, { stream: true });
                  const lines = chunk.split("\n").filter(l => l.trim());
                  for (const line of lines) {
                    if (line.startsWith("data: ") && line !== "data: [DONE]") {
                      try {
                        const data = JSON.parse(line.slice(6));
                        const textDelta = data.choices?.[0]?.delta?.content;
                        if (textDelta) {
                          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content: textDelta })}\n\n`));
                        }
                      } catch {}
                    }
                  }
                }
              }
            }
          }
        } catch (err) {
          console.error("Stream error:", err);
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ error: "Stream error occurred" })}\n\n`)
          );
        } finally {
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("Chat API error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
