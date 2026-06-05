"use client";


import Link from "next/link";
import { signOut } from "next-auth/react";
import type { SessionSummary } from "./ChatShell";
import { SessionItem } from "./SessionItem";

interface SidebarProps {
  sessions: SessionSummary[];
  activeSessionId?: string;
  loading: boolean;
  open: boolean;
  userName: string;
  onNewChat: () => void;
  onSelectSession: (id: string) => void;
  onRename: (id: string, title: string) => void;
  onDelete: (id: string) => void;
  onToggle: () => void;
}

import { Brain } from "lucide-react";

function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2.5 group">
      <div className="flex size-7 items-center justify-center rounded-md bg-[var(--app-brand)] text-[var(--app-brand-text)] transition-transform duration-300 group-hover:scale-105">
        <Brain className="size-4" />
      </div>
      <span className="text-sm font-semibold tracking-tight text-[var(--app-text)]">
        Brain Dump
      </span>
    </Link>
  );
}

export function Sidebar({
  sessions,
  activeSessionId,
  loading,
  open,
  userName,
  onNewChat,
  onSelectSession,
  onRename,
  onDelete,
  onToggle,
}: SidebarProps) {
  return (
    <aside
      className={`
        fixed top-0 left-0 h-full z-30 flex flex-col
        w-[260px] bg-[var(--app-panel-soft)] border-r border-[var(--app-border)]
        shrink-0 overflow-hidden transition-[transform,width,border-color] duration-300
        ${open ? "translate-x-0" : "-translate-x-full"}
        md:relative md:translate-x-0
        ${open ? "md:w-[260px]" : "md:w-0 md:border-r-0 md:pointer-events-none"}
      `}
    >
      {/* ── Header ── */}
      <div className="flex items-center justify-between px-4 h-16 border-b border-[var(--app-border)] shrink-0">
        <Logo />
        <button
          onClick={onToggle}
          className="text-[var(--app-subtle)] hover:text-[var(--app-text)] hover:bg-[var(--app-panel)] transition-colors p-1 rounded"
          title="Close sidebar"
        >
          <span className="material-symbols-outlined text-lg">left_panel_close</span>
        </button>
      </div>

      {/* ── New Chat button ── */}
      <div className="px-3 py-3 shrink-0">
        <button
          onClick={onNewChat}
          className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg border border-[var(--app-border)] bg-[var(--app-panel)] hover:border-[var(--app-border-strong)] hover:bg-[var(--app-elevated)] text-[var(--app-muted)] hover:text-[var(--app-text)] transition-all text-sm cursor-pointer"
        >
          <span className="material-symbols-outlined text-base">add</span>
          New Chat
        </button>
      </div>

      {/* ── Session list ── */}
      <div className="flex-1 overflow-y-auto px-2 py-1 space-y-0.5">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="w-4 h-4 border border-[var(--app-border)] border-t-[var(--app-brand)] rounded-full animate-spin" />
          </div>
        ) : sessions.length === 0 ? (
          <p className="text-xs text-[var(--app-subtle)] text-center py-8 px-4">
            No conversations yet. Start a new chat.
          </p>
        ) : (
          sessions.map((s) => (
            <SessionItem
              key={s._id}
              session={s}
              isActive={s._id === activeSessionId}
              onSelect={() => onSelectSession(s._id)}
              onRename={(title) => onRename(s._id, title)}
              onDelete={() => onDelete(s._id)}
            />
          ))
        )}
      </div>

      {/* ── Footer ── */}
      <div className="px-4 py-4 border-t border-[var(--app-border)] shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-full bg-[var(--app-panel)] border border-[var(--app-border)] flex items-center justify-center">
              <span className="text-xs font-semibold text-[var(--app-text)]">
                {userName.charAt(0).toUpperCase()}
              </span>
            </div>
            <span className="text-xs text-[var(--app-muted)] truncate max-w-[120px]">
              {userName}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <Link
              href="/dashboard"
              title="Dashboard"
              className="text-[var(--app-subtle)] hover:text-[var(--app-text)] hover:bg-[var(--app-panel)] transition-colors p-1 rounded"
            >
              <span className="material-symbols-outlined text-base">dashboard</span>
            </Link>
            <button
              onClick={() => signOut({ redirectTo: "/" })}
              title="Sign out"
              className="text-[var(--app-subtle)] hover:text-[var(--app-text)] hover:bg-[var(--app-panel)] transition-colors p-1 rounded cursor-pointer"
            >
              <span className="material-symbols-outlined text-base">logout</span>
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}
