"use client";

import { useState, useEffect, useCallback, useRef, Fragment } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage, isDataUIPart } from "ai";
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import {
  Message,
  MessageContent,
  MessageResponse,
  MessageActions,
  MessageAction,
} from "@/components/ai-elements/message";
import {
  PromptInput,
  PromptInputTextarea,
  PromptInputSubmit,
  type PromptInputMessage,
} from "@/components/ai-elements/prompt-input";
import {
  Sources,
  SourcesContent,
  SourcesTrigger,
  Source,
} from "@/components/ai-elements/sources";
import { ThemeToggle } from "@/components/ThemeToggle";
import { CopyIcon, RefreshCcwIcon } from "lucide-react";

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────
interface SourceAnnotation {
  id: string;
  title: string;
  type: string;
  url: string | null;
}

// ─────────────────────────────────────────────
// Empty state
// ─────────────────────────────────────────────
const SUGGESTIONS = [
  { icon: "description", text: "Summarize my uploaded PDF" },
  { icon: "youtube_activity", text: "What did the YouTube video explain?" },
  { icon: "travel_explore", text: "Find key insights from my sources" },
  { icon: "lightbulb", text: "Compare arguments across documents" },
];

function EmptyState({
  onSuggestionClick,
}: {
  onSuggestionClick: (text: string) => void;
}) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6 py-20">
      <div className="w-12 h-12 rounded-md bg-[var(--app-brand)] flex items-center justify-center mb-8">
        <div className="w-4 h-4 bg-[var(--app-brand-text)] rounded-sm" />
      </div>
      <h2 className="text-2xl font-semibold tracking-tight text-[var(--app-text)] mb-2">
        How can I help?
      </h2>
      <p className="text-[var(--app-muted)] text-sm mb-12 text-center max-w-md">
        Ask questions about your uploaded documents, or explore your knowledge
        base with natural language.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-lg">
        {SUGGESTIONS.map((s) => (
          <button
            key={s.text}
            onClick={() => onSuggestionClick(s.text)}
            className="bg-[var(--app-panel)] border border-[var(--app-border)] hover:border-[var(--app-border-strong)] hover:bg-[var(--app-elevated)] rounded-lg px-4 py-3 flex items-center gap-3 text-left text-sm text-[var(--app-muted)] hover:text-[var(--app-text)] transition-all group cursor-pointer shadow-sm"
          >
            <span className="material-symbols-outlined text-lg text-[var(--app-accent)] group-hover:text-[var(--app-text)] transition-colors">
              {s.icon}
            </span>
            <span>{s.text}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Extract sources from DataUIParts in a message
// ─────────────────────────────────────────────
function getSourcesFromMessage(message: UIMessage): SourceAnnotation[] {
  const sources: SourceAnnotation[] = [];
  for (const part of message.parts) {
    const p = part as unknown as { type: string; data?: { sources?: SourceAnnotation[] } };
    if (
      (p.type === "data" || isDataUIPart(part)) &&
      p.data &&
      typeof p.data === "object" &&
      "sources" in p.data &&
      Array.isArray(p.data.sources)
    ) {
      sources.push(...p.data.sources);
    }
  }
  return sources;
}

// ─────────────────────────────────────────────
// Source citations panel
// ─────────────────────────────────────────────
function SourcesPanel({ message }: { message: UIMessage }) {
  const sources = getSourcesFromMessage(message);
  if (sources.length === 0) return null;

  return (
    <div className="mt-2 ml-12">
      <Sources>
        <SourcesTrigger count={sources.length} />
        <SourcesContent>
          {sources.map((s) => (
            <Source
              key={s.id}
              href={s.url ?? "/dashboard"}
              title={s.title}
              target={s.url ? "_blank" : undefined}
              rel={s.url ? "noopener noreferrer" : undefined}
            />
          ))}
        </SourcesContent>
      </Sources>
    </div>
  );
}

// ─────────────────────────────────────────────
// Main Chat Pane
// ─────────────────────────────────────────────
interface ChatPaneProps {
  sessionId?: string;
  userName: string;
  onSessionCreated: (sessionId: string, title: string) => void;
  onSidebarToggle: () => void;
  sidebarOpen: boolean;
}

export function ChatPane({
  sessionId,
  onSessionCreated,
  onSidebarToggle,
  sidebarOpen,
}: ChatPaneProps) {
  const [input, setInput] = useState("");
  const [initialMessages, setInitialMessages] = useState<UIMessage[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  // chatId is its OWN state — never derived inline from sessionId.
  // This is the only thing that controls whether useChat creates a new Chat instance.
  const [chatId, setChatId] = useState<string>("new");
  const locallyCreatedSessionIdRef = useRef<string | null>(null);

  // ── Load existing session history ─────────────────────────
  useEffect(() => {
    if (!sessionId) {
      // User clicked "New Chat" — reset to a fresh Chat instance.
      setInitialMessages([]);
      setChatId(`new-${Date.now()}`);
      return;
    }

    if (locallyCreatedSessionIdRef.current === sessionId) {
      // This ID came back via X-Session-Id from OUR own request.
      // The stream is still active — do NOT touch chatId or the Chat
      // instance will be recreated and the stream will be killed.
      return;
    }

    // User navigated to an existing session — load history first,
    // THEN update chatId so useChat creates the Chat with correct messages.
    const load = async () => {
      setLoadingHistory(true);
      try {
        const r = await fetch(`/api/sessions/${sessionId}`);
        const data: { messages?: { role: string; content: string }[] } = await r.json();
        const mapped: UIMessage[] = Array.isArray(data.messages)
          ? data.messages.map((m, i) => ({
              id: `hist-${i}`,
              role: m.role as "user" | "assistant",
              parts: [{ type: "text" as const, text: m.content }],
              content: m.content,
            }))
          : [];
        // React 18 batches both of these into one re-render, so when useChat
        // sees the new chatId it also sees the correct initialMessages.
        setInitialMessages(mapped);
        setChatId(sessionId);
      } catch {
        setInitialMessages([]);
        setChatId(sessionId);
      } finally {
        setLoadingHistory(false);
      }
    };
    load();
  }, [sessionId]);

  // ── Create stable transport once ──────────────────────────
  const ctxRef = useRef({
    sessionId,
    onSessionCreated,
    sessionNotified: false,
  });

  useEffect(() => { ctxRef.current.sessionId = sessionId; }, [sessionId]);
  useEffect(() => { ctxRef.current.onSessionCreated = onSessionCreated; }, [onSessionCreated]);
  useEffect(() => { ctxRef.current.sessionNotified = false; }, [sessionId]);

  const [transport] = useState(() => {
    const ctx = ctxRef;
    return new DefaultChatTransport({
      api: "/api/chat",
      body: () => ({ sessionId: ctx.current.sessionId }),
      fetch: async (input, init) => {
        const response = await fetch(input, init);
        const newId = response.headers.get("X-Session-Id");
        if (newId && !ctx.current.sessionId && !ctx.current.sessionNotified) {
          ctx.current.sessionNotified = true;
          // Mark as locally created BEFORE calling onSessionCreated, so the
          // useEffect guard fires synchronously on the same render cycle and
          // skips the setChatId call — keeping the Chat instance alive.
          locallyCreatedSessionIdRef.current = newId;
          ctx.current.onSessionCreated(newId, "New Chat");
        }
        return response;
      },
    });
  });

  // chatId only changes when we explicitly call setChatId above.
  // It never changes just because sessionId prop changes — that was the bug.
  const { messages, sendMessage, stop, status, regenerate, error } = useChat({
    id: chatId,
    messages: initialMessages,
    transport,
  });


  const isLoading = status === "streaming" || status === "submitted";

  const handleSubmit = useCallback(
    (msg: PromptInputMessage) => {
      if (!msg.text.trim() || isLoading) return;
      setInput("");
      sendMessage({ text: msg.text });
    },
    [isLoading, sendMessage],
  );

  const handleSuggestionClick = useCallback(
    (text: string) => {
      sendMessage({ text });
    },
    [sendMessage],
  );

  if (loadingHistory) {
    return (
      <main className="flex-1 flex items-center justify-center bg-[var(--app-bg)]">
        <div className="w-5 h-5 border border-[var(--app-border)] border-t-[var(--app-brand)] rounded-full animate-spin" />
      </main>
    );
  }

  const displayMessages = messages.filter((m) =>
    m.parts.some((p) => p.type === "text"),
  );

  return (
    <main className="flex-1 flex flex-col min-w-0 bg-[var(--app-bg)] relative overflow-hidden">
      {/* ── Top bar ── */}
      <header className="flex items-center justify-between gap-3 px-4 h-16 border-b border-[var(--app-border)] bg-[var(--app-bg)] shrink-0">
        <div className="flex items-center gap-3">
          {!sidebarOpen && (
            <button
              onClick={onSidebarToggle}
              className="text-[var(--app-subtle)] hover:text-[var(--app-text)] hover:bg-[var(--app-panel)] transition-colors p-1 rounded cursor-pointer"
              title="Open sidebar"
            >
              <span className="material-symbols-outlined text-lg">
                left_panel_open
              </span>
            </button>
          )}
          <span className="text-sm text-[var(--app-muted)]">Brain Dump</span>
        </div>
        <ThemeToggle />
      </header>

      {/* ── Messages area ── */}
      {displayMessages.length === 0 ? (
        <EmptyState onSuggestionClick={handleSuggestionClick} />
      ) : (
        <Conversation className="flex-1 min-h-0">
          <ConversationContent className="max-w-3xl mx-auto w-full px-4 py-6 space-y-2">
            {displayMessages.map((message, messageIndex) => (
              <Fragment key={message.id}>
                {message.parts
                  .filter((p) => p.type === "text")
                  .map((part, i) => {
                    if (part.type !== "text") return null;
                    const isLastMessage =
                      messageIndex === displayMessages.length - 1;

                    return (
                      <Fragment key={`${message.id}-${i}`}>
                        <Message from={message.role}>
                          <MessageContent
                            className={
                              message.role === "user"
                                ? "bg-[var(--app-panel-soft)] border border-[var(--app-border)] text-[var(--app-text)]"
                                : "text-[var(--app-text)]"
                            }
                          >
                            {message.role === "assistant" &&
                            isLoading &&
                            isLastMessage ? (
                              <div className="whitespace-pre-wrap text-sm leading-7 text-[var(--app-text)]">
                                {part.text}
                              </div>
                            ) : (
                              <MessageResponse
                                className="text-[var(--app-text)]"
                                parseIncompleteMarkdown={false}
                              >
                                {part.text}
                              </MessageResponse>
                            )}
                          </MessageContent>
                        </Message>

                        {/* Source citations */}
                        {message.role === "assistant" && (
                          <SourcesPanel message={message} />
                        )}

                        {/* Action buttons on last assistant message */}
                        {message.role === "assistant" &&
                          isLastMessage &&
                          !isLoading && (
                            <MessageActions className="mt-1">
                              <MessageAction
                                label="Copy"
                                onClick={() =>
                                  navigator.clipboard.writeText(part.text)
                                }
                              >
                                <CopyIcon className="size-3" />
                              </MessageAction>
                              <MessageAction
                                label="Retry"
                                onClick={() => regenerate()}
                              >
                                <RefreshCcwIcon className="size-3" />
                              </MessageAction>
                            </MessageActions>
                          )}
                      </Fragment>
                    );
                  })}
              </Fragment>
            ))}
          </ConversationContent>
          <ConversationScrollButton className="absolute bottom-36 right-6 z-10 border-[var(--app-border)] bg-[var(--app-panel)] text-[var(--app-text)] shadow-[var(--app-shadow)] hover:bg-[var(--app-panel-soft)]" />
        </Conversation>
      )}

      {error && (
        <div className="mx-auto w-full max-w-3xl px-4 pt-3">
          <div className="rounded-lg border border-[var(--app-danger-border)] bg-[var(--app-danger-bg)] px-3 py-2 text-sm text-[var(--app-danger-text)]">
            The response could not be streamed. Please try again.
            {error.message && (
              <span className="block mt-1 font-mono text-xs opacity-80">
                {error.message}
              </span>
            )}
          </div>
        </div>
      )}

      {/* ── Input area ── */}
      <div className="px-4 pb-6 pt-3 shrink-0 max-w-3xl mx-auto w-full">
        <PromptInput
          onSubmit={handleSubmit}
          className="w-full [&_[data-slot=input-group]]:border-[var(--app-border)] [&_[data-slot=input-group]]:bg-[var(--app-panel)] [&_[data-slot=input-group]]:shadow-[var(--app-shadow)]"
        >
          <PromptInputTextarea
            value={input}
            placeholder="Ask anything..."
            onChange={(e) => setInput(e.currentTarget.value)}
            className="pr-12 min-h-[44px] max-h-32 text-[var(--app-text)] placeholder:text-[var(--app-subtle)] caret-[var(--app-brand)]"
          />
          <PromptInputSubmit
            status={isLoading ? "streaming" : "ready"}
            disabled={!input.trim() && !isLoading}
            className="absolute bottom-1.5 right-1.5"
            onStop={stop}
          />
        </PromptInput>
        <p className="text-center text-xs text-[var(--app-subtle)] mt-3">
          Brain Dump can make mistakes. Consider verifying important information.
        </p>
      </div>
    </main>
  );
}
