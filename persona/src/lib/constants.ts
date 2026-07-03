export const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";

// Use the free router — auto-selects best available free model
// export const DEFAULT_MODEL = "google/gemma-4-26b-a4b-it:free";//either openai/gpt-4o-mini
export const DEFAULT_MODEL = "openai/gpt-4o-mini";//either openai/gpt-4o-mini

// Maximum number of message pairs to send for context (to stay within token limits)
export const MAX_CONTEXT_MESSAGES = 20;

// YouTube Data API v3
export const YOUTUBE_API_URL = "https://www.googleapis.com/youtube/v3/search";
export const YOUTUBE_MAX_RESULTS = 3;

// App metadata
export const APP_NAME = "Persona Chat";
export const APP_DESCRIPTION =
  "AI-powered conversations with Hitesh Choudhary and Piyush Garg";
export const APP_URL = "https://persona-chat.vercel.app";
