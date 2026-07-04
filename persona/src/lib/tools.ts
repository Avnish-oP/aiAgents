/**
 * Chain-of-Thought State Machine — Tool Definitions & Prompts
 *
 * The LLM always responds in JSON with a "state" field.
 * States: THINKING → TOOL_CALL → OUTPUT
 * The server parses each state, executes tools, and drives the loop.
 */

/**
 * Appended to the persona's system prompt for the FIRST call (decision phase).
 * Forces the model to respond in structured JSON.
 */
export const COT_INSTRUCTION = `

## RESPONSE FORMAT — VERY IMPORTANT
You MUST respond ONLY with valid JSON. No extra text before or after the JSON.

Analyze the user's message and decide if you need to search your YouTube channel for relevant videos.

### If you can answer directly (no video search needed):
Respond with this JSON:
{
  "state": "OUTPUT",
  "thinking": "brief reasoning about the question",
  "response": "your full response to the user in your persona style"
}

### If the user asks about a technical topic you likely have a YouTube video about:
Respond with this JSON:
{
  "state": "TOOL_CALL",
  "thinking": "reasoning about why you need to search YouTube",
  "tool": {
    "name": "search_youtube",
    "args": {
      "query": "concise search terms for finding the right video"
    }
  }
}

### Decision Rules:
- Use TOOL_CALL when: user asks about a programming concept, framework, language, tutorial, roadmap, or any technical topic you likely covered on YouTube
- Use OUTPUT when: casual chat, greetings, personal questions, non-technical conversation, or when they specifically don't want video recommendations
- The "query" in TOOL_CALL should be concise search keywords (2-5 words), not a full sentence
- The "thinking" field should briefly explain your decision
- Your "response" in OUTPUT must be in your persona style (Hinglish, catchphrases, etc.)
- NEVER include markdown formatting in the JSON — use plain text for the response field
`;

/**
 * Used in the SECOND call (after tool execution).
 * Tells the model to write a normal text response incorporating the video results.
 */
export const TOOL_RESULT_INSTRUCTION = `

## CONTEXT: YouTube Search Results
You previously decided to search your YouTube channel for relevant videos.
Here are the search results:

{TOOL_RESULTS}

## INSTRUCTIONS:
- Respond naturally in your persona style (Hinglish, catchphrases, etc.)
- Mention 1-2 of the most relevant videos from the results above naturally in your answer
- Format video references EXACTLY like this markdown link: 📺 **[Video Title](https://youtube.com/watch?v=VIDEO_ID)**
- CRITICAL: ONLY use the exact Video Title and VIDEO_ID provided in the search results above. DO NOT invent or guess YouTube links!
- First answer the user's question in your style, THEN suggest the relevant videos at the end
- If no videos were found, just answer normally without mentioning videos
`;

/**
 * Available tools that the CoT system can call.
 * Each tool has a name and an executor function signature.
 */
export const AVAILABLE_TOOLS = {
  search_youtube: {
    name: "search_youtube",
    description:
      "Search for videos on the persona's YouTube channel to suggest relevant content to the user.",
    parameters: {
      query: "Search keywords for YouTube",
    },
  },
} as const;
