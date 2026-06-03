"use client";

import { useChat } from "@ai-sdk/react";
import { type UIMessage } from "ai";
import { useRef, useEffect, useState } from "react";
import { signOut } from "next-auth/react";
import Link from "next/link";

function MaterialIcon({
  name,
  className = "",
}: {
  name: string;
  className?: string;
}) {
  return (
    <span className={`material-symbols-outlined ${className}`}>{name}</span>
  );
}

function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2 group">
      <div className="w-5 h-5 bg-white rounded-sm flex items-center justify-center transition-transform duration-300 group-hover:rotate-90">
        <div className="w-1.5 h-1.5 bg-black rounded-sm" />
      </div>
      <span className="text-sm font-bold tracking-tight text-white hidden sm:block">Brain Dump</span>
    </Link>
  );
}

// ─────────────────── Extract text from UIMessage parts ───────────────────
function getMessageText(message: UIMessage): string {
  return message.parts
    .filter((part): part is { type: "text"; text: string } => part.type === "text")
    .map((part) => part.text)
    .join("");
}

// ─────────────────── Message Bubble ───────────────────
function MessageBubble({ message }: { message: UIMessage }) {
  const text = getMessageText(message);

  if (message.role === "user") {
    return (
      <div className="flex justify-end mb-6 animate-reveal">
        <div className="max-w-[75%] bg-[#111] border border-[#333] rounded-lg px-5 py-3.5">
          <p className="text-sm text-white leading-relaxed whitespace-pre-wrap">
            {text}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-start mb-6 animate-reveal">
      <div className="flex gap-4 max-w-[85%]">
        {/* AI Avatar */}
        <div className="flex-shrink-0 w-8 h-8 rounded-sm bg-white flex items-center justify-center mt-1">
          <div className="w-2.5 h-2.5 bg-black rounded-sm" />
        </div>
        {/* Message */}
        <div className="px-1 py-1.5">
          <p className="text-sm text-[#e5e5e5] leading-relaxed whitespace-pre-wrap">
            {text || "..."}
          </p>
        </div>
      </div>
    </div>
  );
}

// ─────────────────── Typing Indicator ───────────────────
function TypingIndicator() {
  return (
    <div className="flex justify-start mb-6 animate-reveal">
      <div className="flex gap-4">
        <div className="flex-shrink-0 w-8 h-8 rounded-sm bg-white flex items-center justify-center">
          <div className="w-2.5 h-2.5 bg-black rounded-sm" />
        </div>
        <div className="px-1 py-3">
          <div className="flex gap-1.5">
            <div
              className="w-1.5 h-1.5 rounded-full bg-[#555] animate-bounce"
              style={{ animationDelay: "0ms" }}
            />
            <div
              className="w-1.5 h-1.5 rounded-full bg-[#555] animate-bounce"
              style={{ animationDelay: "150ms" }}
            />
            <div
              className="w-1.5 h-1.5 rounded-full bg-[#555] animate-bounce"
              style={{ animationDelay: "300ms" }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────── Empty State ───────────────────
function EmptyState({ onSuggestionClick }: { onSuggestionClick: (text: string) => void }) {
  const suggestions = [
    { icon: "description", text: "Summarize my uploaded PDF" },
    { icon: "youtube_activity", text: "What did the YouTube video explain?" },
    { icon: "travel_explore", text: "Find key insights from my sources" },
    { icon: "lightbulb", text: "Compare arguments across documents" },
  ];

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6 py-20 animate-reveal">
      <div className="w-12 h-12 rounded-sm bg-white flex items-center justify-center mb-8">
        <div className="w-4 h-4 bg-black rounded-sm" />
      </div>
      <h2 className="text-2xl font-semibold tracking-tight text-white mb-2">
        How can I help?
      </h2>
      <p className="text-[#888888] text-sm mb-12 text-center max-w-md">
        Ask questions about your uploaded documents, or explore your knowledge
        base with natural language.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-lg">
        {suggestions.map((s, i) => (
          <button
            key={i}
            onClick={() => onSuggestionClick(s.text)}
            className="bg-[#0a0a0a] border border-[#222] hover:border-[#555] rounded-lg px-4 py-3 flex items-center gap-3 text-left text-sm text-[#888888] hover:text-white transition-all group cursor-pointer"
          >
            <MaterialIcon
              name={s.icon}
              className="text-lg text-[#555] group-hover:text-white transition-colors"
            />
            <span>{s.text}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ─────────────────── Main Chat Interface ───────────────────
export function ChatInterface({ userName }: { userName: string }) {
  const { messages, sendMessage, stop, status } = useChat();

  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const isLoading = status === "streaming" || status === "submitted";

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Auto-focus input
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSend = () => {
    if (!input.trim() || isLoading) return;
    const text = input.trim();
    setInput("");
    sendMessage({ text });
  };

  // Handle Enter to submit (Shift+Enter for newline)
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSuggestionClick = (text: string) => {
    sendMessage({ text });
  };

  return (
    <div className="min-h-screen flex flex-col bg-black">
      {/* ─── Top Nav ─── */}
      <nav className="bg-black/80 backdrop-blur-md sticky top-0 w-full z-50 border-b border-[#222]">
        <div className="flex justify-between items-center px-6 max-w-[1400px] mx-auto h-16">
          <div className="flex items-center gap-6">
            <Logo />
            <div className="h-4 w-px bg-[#333] hidden sm:block" />
            <span className="text-sm text-[#888888] hidden sm:block">
              Chat
            </span>
          </div>

          <div className="flex items-center gap-4">
            <Link
              href="/dashboard"
              className="text-sm text-[#888888] hover:text-white transition-colors flex items-center gap-1.5"
            >
              <MaterialIcon name="dashboard" className="text-lg" />
              <span className="hidden sm:inline">Dashboard</span>
            </Link>
            <div className="h-4 w-px bg-[#333]" />
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-[#111] border border-[#333] flex items-center justify-center">
                <span className="text-xs font-semibold text-white">
                  {userName.charAt(0).toUpperCase()}
                </span>
              </div>
              <button
                onClick={() => signOut({ redirectTo: "/" })}
                className="text-[#888888] hover:text-white transition-colors"
                title="Sign out"
              >
                <MaterialIcon name="logout" className="text-lg" />
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* ─── Chat Area ─── */}
      <div className="flex-1 flex flex-col max-w-[800px] w-full mx-auto relative z-10">
        {messages.length === 0 ? (
          <EmptyState onSuggestionClick={handleSuggestionClick} />
        ) : (
          <div className="flex-1 overflow-y-auto px-6 py-8">
            {messages.map((message) => (
              <MessageBubble key={message.id} message={message} />
            ))}
            {status === "submitted" &&
              messages[messages.length - 1]?.role === "user" && (
                <TypingIndicator />
              )}
            <div ref={messagesEndRef} />
          </div>
        )}

        {/* ─── Input Area ─── */}
        <div className="sticky bottom-0 bg-gradient-to-t from-black via-black to-transparent pt-6 pb-8 px-6">
          <div className="bg-[#0a0a0a] border border-[#333] focus-within:border-[#666] rounded-xl p-2 flex items-end gap-3 transition-colors">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask anything..."
              rows={1}
              className="flex-1 bg-transparent text-sm text-white placeholder-[#555] resize-none focus:outline-none py-2.5 px-3 max-h-32"
              style={{ minHeight: "40px" }}
            />
            <div className="flex items-center gap-2 mb-1 mr-1">
              {isLoading ? (
                <button
                  type="button"
                  onClick={stop}
                  className="w-8 h-8 rounded-md bg-[#222] flex items-center justify-center hover:bg-[#333] transition-colors cursor-pointer"
                  title="Stop generating"
                >
                  <MaterialIcon
                    name="stop"
                    className="text-sm text-white"
                  />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleSend}
                  disabled={!input.trim()}
                  className="w-8 h-8 rounded-md bg-white flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed hover:scale-95 transition-transform"
                  title="Send message"
                >
                  <MaterialIcon
                    name="arrow_upward"
                    className="text-sm text-black"
                  />
                </button>
              )}
            </div>
          </div>
          <p className="text-center text-xs text-[#555] mt-3">
            Brain Dump can make mistakes. Consider verifying important information.
          </p>
        </div>
      </div>
    </div>
  );
}
