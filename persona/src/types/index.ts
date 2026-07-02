export type PersonaId = "hitesh" | "piyush";

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

export interface PersonaConfig {
  id: PersonaId;
  name: string;
  title: string;
  avatarUrl: string;
  description: string;
  greeting: string;
  suggestedQuestions: string[];
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
