"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "./Sidebar";
import { ChatPane } from "./ChatPane";

export interface SessionSummary {
  _id: string;
  title: string;
  updatedAt: string;
  createdAt: string;
  messageCount: number;
}

export function ChatShell({
  userName,
  initialSessionId,
}: {
  userName: string;
  initialSessionId?: string;
}) {
  const router = useRouter();

  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | undefined>(
    initialSessionId,
  );
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [loadingSessions, setLoadingSessions] = useState(true);

  // ── Load session list ─────────────────────────────────────
  const loadSessions = useCallback(async () => {
    try {
      const res = await fetch("/api/sessions");
      if (res.ok) {
        const data: SessionSummary[] = await res.json();
        setSessions(data);
      }
    } catch {
      // silently ignore
    } finally {
      setLoadingSessions(false);
    }
  }, []);

  // Fetch sessions once on mount
  useEffect(() => {
    // Deferred to avoid setState-in-effect lint
    Promise.resolve().then(() => loadSessions());
  }, [loadSessions]);

  // ── Handle new session created from ChatPane ──────────────
  const handleSessionCreated = useCallback(
    (sessionId: string, title: string) => {
      setActiveSessionId(sessionId);
      router.replace(`/chat?session=${sessionId}`, { scroll: false });
      // Prepend new session to sidebar list
      setSessions((prev) => [
        {
          _id: sessionId,
          title,
          updatedAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          messageCount: 1,
        },
        ...prev,
      ]);
    },
    [router],
  );

  // ── Switch to a different session ─────────────────────────
  const handleSelectSession = useCallback(
    (sessionId: string) => {
      setActiveSessionId(sessionId);
      router.replace(`/chat?session=${sessionId}`, { scroll: false });
    },
    [router],
  );

  // ── Start a new chat ──────────────────────────────────────
  const handleNewChat = useCallback(() => {
    setActiveSessionId(undefined);
    router.replace("/chat", { scroll: false });
  }, [router]);

  // ── Rename a session ──────────────────────────────────────
  const handleRename = useCallback(
    async (sessionId: string, newTitle: string) => {
      const res = await fetch(`/api/sessions/${sessionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newTitle }),
      });
      if (res.ok) {
        setSessions((prev) =>
          prev.map((s) =>
            s._id === sessionId ? { ...s, title: newTitle } : s,
          ),
        );
      }
    },
    [],
  );

  // ── Delete a session ──────────────────────────────────────
  const handleDelete = useCallback(
    async (sessionId: string) => {
      const res = await fetch(`/api/sessions/${sessionId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setSessions((prev) => prev.filter((s) => s._id !== sessionId));
        if (activeSessionId === sessionId) {
          handleNewChat();
        }
      }
    },
    [activeSessionId, handleNewChat],
  );

  // URL param sync is already handled by initialSessionId from server-side rendering

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--app-bg)] text-[var(--app-text)]">
      {/* ── Sidebar ── */}
      <Sidebar
        sessions={sessions}
        activeSessionId={activeSessionId}
        loading={loadingSessions}
        open={sidebarOpen}
        userName={userName}
        onNewChat={handleNewChat}
        onSelectSession={handleSelectSession}
        onRename={handleRename}
        onDelete={handleDelete}
        onToggle={() => setSidebarOpen((o) => !o)}
      />

      {/* ── Mobile overlay ── */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/25 z-20 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── Chat Pane ── */}
      <ChatPane
        sessionId={activeSessionId}
        userName={userName}
        onSessionCreated={handleSessionCreated}
        onSidebarToggle={() => setSidebarOpen((o) => !o)}
        sidebarOpen={sidebarOpen}
      />
    </div>
  );
}
