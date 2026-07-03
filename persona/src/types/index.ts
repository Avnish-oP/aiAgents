export type PersonaId = "hitesh" | "piyush";

export interface YouTubeVideo {
  videoId: string;
  title: string;
  description: string;
  thumbnail: string;
  publishedAt: string;
}

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  thinking?: string;
  timestamp: Date;
  videos?: YouTubeVideo[];
}

export interface PersonaConfig {
  id: PersonaId;
  name: string;
  title: string;
  avatarUrl: string;
  description: string;
  greeting: string;
  suggestedQuestions: string[];
  youtubeChannelIds: string[];
  socialLinks: {
    youtube?: string;
    twitter?: string;
    github?: string;
    website?: string;
    linkedin?: string;
  };
  colorTheme: {
    primary: string;
    primaryGlow: string;
    gradientFrom: string;
    gradientTo: string;
  };
  systemPrompt: string;
}

export interface ChatRequest {
  messages: { role: "user" | "assistant"; content: string }[];
  persona: PersonaId;
}

export interface ChatResponse {
  content: string;
  error?: string;
}

// CoT State Machine types
export interface CotToolCall {
  name: string;
  args: Record<string, string>;
}

export interface CotResponse {
  state: "THINKING" | "TOOL_CALL" | "OUTPUT";
  thinking?: string;
  tool?: CotToolCall;
  response?: string;
}
