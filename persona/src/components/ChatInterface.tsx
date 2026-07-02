"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Message, PersonaConfig, PersonaId } from "@/types";
import { personas } from "@/lib/personas";
import MessageBubble from "./MessageBubble";
import TypingIndicator from "./TypingIndicator";

interface ChatInterfaceProps {
  persona: PersonaConfig;
  activePersona: PersonaId;
  onSwitchPersona: (id: PersonaId) => void;
}

export default function ChatInterface({
  persona,
  activePersona,
  onSwitchPersona,
}: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const personaList = Object.values(personas) as PersonaConfig[];

  // Reset messages when persona changes
  useEffect(() => {
    setMessages([]);
    setInput("");
    setIsLoading(false);
    setStreamingMessageId(null);
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  }, [persona.id]);

  // Auto-scroll to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Auto-resize textarea
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = "auto";
      inputRef.current.style.height =
        Math.min(inputRef.current.scrollHeight, 120) + "px";
    }
  }, [input]);

  const sendMessage = useCallback(
    async (content: string) => {
      if (!content.trim() || isLoading) return;

      const userMessage: Message = {
        id: crypto.randomUUID(),
        role: "user",
        content: content.trim(),
        timestamp: new Date(),
      };

      const aiMessageId = crypto.randomUUID();
      const aiMessage: Message = {
        id: aiMessageId,
        role: "assistant",
        content: "",
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, userMessage, aiMessage]);
      setInput("");
      setIsLoading(true);
      setStreamingMessageId(aiMessageId);

      // Reset textarea height
      if (inputRef.current) {
        inputRef.current.style.height = "auto";
      }

      try {
        abortControllerRef.current = new AbortController();

        const apiMessages = [...messages, userMessage].map((m) => ({
          role: m.role,
          content: m.content,
        }));

        const response = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: apiMessages,
            persona: persona.id,
          }),
          signal: abortControllerRef.current.signal,
        });

        if (!response.ok) {
          throw new Error("Failed to get response");
        }

        const reader = response.body?.getReader();
        const decoder = new TextDecoder();

        if (!reader) throw new Error("No reader available");

        let accumulated = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split("\n").filter((line) => line.trim());

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const data = line.slice(6);
              if (data === "[DONE]") continue;

              try {
                const parsed = JSON.parse(data);
                if (parsed.content) {
                  accumulated += parsed.content;
                  setMessages((prev) =>
                    prev.map((m) =>
                      m.id === aiMessageId
                        ? { ...m, content: accumulated }
                        : m
                    )
                  );
                }
              } catch {
                // Skip malformed data
              }
            }
          }
        }
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") {
          return;
        }
        setMessages((prev) =>
          prev.map((m) =>
            m.id === aiMessageId
              ? {
                  ...m,
                  content:
                    "Sorry, kuch gadbad ho gayi! 😅 Please check if the API key is configured correctly in `.env.local` and try again.",
                }
              : m
          )
        );
      } finally {
        setIsLoading(false);
        setStreamingMessageId(null);
      }
    },
    [isLoading, messages, persona.id]
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const handleSuggestion = (question: string) => {
    sendMessage(question);
  };

  const showWelcome = messages.length === 0;

  return (
    <div
      className="chat-container"
      style={
        {
          "--persona-primary": persona.colorTheme.primary,
          "--persona-glow": persona.colorTheme.primaryGlow,
          "--persona-from": persona.colorTheme.gradientFrom,
          "--persona-to": persona.colorTheme.gradientTo,
        } as React.CSSProperties
      }
    >
      <div className="chat-messages" id="chat-messages">
        {showWelcome && (
          <div className="welcome-section">
            <div className="welcome-avatar-wrapper">
              <img
                src={persona.avatarUrl}
                alt={persona.name}
                className="welcome-avatar"
                width={80}
                height={80}
              />
              <div className="welcome-glow" />
            </div>
            <h2 className="welcome-name">{persona.name}</h2>
            <p className="welcome-title">{persona.title}</p>
            <div className="welcome-greeting">
              <p>{persona.greeting}</p>
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <MessageBubble
            key={msg.id}
            message={msg}
            persona={persona}
            isStreaming={msg.id === streamingMessageId}
          />
        ))}

        {isLoading && !streamingMessageId && <TypingIndicator />}
        <div ref={chatEndRef} />
      </div>

      {/* Suggested questions */}
      {showWelcome && (
        <div className="suggestions">
          {persona.suggestedQuestions.map((q, i) => (
            <button
              key={i}
              className="suggestion-chip"
              onClick={() => handleSuggestion(q)}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
              {q}
            </button>
          ))}
        </div>
      )}

      {/* Input bar with integrated persona switcher */}
      <form className="input-bar" onSubmit={handleSubmit}>
        <div className="input-wrapper">
          {/* Persona switcher dropdown inside input */}
          <div className="inline-persona-switcher" ref={dropdownRef}>
            <button
              type="button"
              className="inline-persona-btn active"
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              title={`Current persona: ${persona.name}`}
              style={
                {
                  "--btn-color": persona.colorTheme.primary,
                  "--btn-glow": persona.colorTheme.primaryGlow,
                } as React.CSSProperties
              }
            >
              <img
                src={persona.avatarUrl}
                alt={persona.name}
                className="inline-persona-avatar"
                width={28}
                height={28}
              />
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                style={{ marginLeft: 2, opacity: 0.7 }}
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>

            {isDropdownOpen && (
              <div className="persona-dropdown-menu">
                {personaList.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    className={`dropdown-item ${p.id === activePersona ? "active" : ""}`}
                    onClick={() => {
                      onSwitchPersona(p.id);
                      setIsDropdownOpen(false);
                    }}
                  >
                    <img
                      src={p.avatarUrl}
                      alt={p.name}
                      width={24}
                      height={24}
                      className="dropdown-avatar"
                    />
                    <span>{p.name}</span>
                    {p.id === activePersona && (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginLeft: "auto", color: p.colorTheme.primary }}>
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`Ask ${persona.name} something...`}
            rows={1}
            disabled={isLoading}
            className="chat-input"
            id="chat-input"
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="send-btn"
            aria-label="Send message"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </button>
        </div>
        <p className="input-hint">
          AI persona simulation — responses may not reflect actual views.
          Press Enter to send, Shift+Enter for new line.
        </p>
      </form>
    </div>
  );
}
