"use client";

import { useState, useRef, useEffect } from "react";
import type { SessionSummary } from "./ChatShell";

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

interface SessionItemProps {
  session: SessionSummary;
  isActive: boolean;
  onSelect: () => void;
  onRename: (title: string) => void;
  onDelete: () => void;
}

export function SessionItem({
  session,
  isActive,
  onSelect,
  onRename,
  onDelete,
}: SessionItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(session.title);
  const [showMenu, setShowMenu] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isEditing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [isEditing]);

  // Close menu on outside click
  useEffect(() => {
    if (!showMenu) return;
    const handler = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) {
        setShowMenu(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showMenu]);

  const commitRename = () => {
    const trimmed = editValue.trim();
    if (trimmed && trimmed !== session.title) {
      onRename(trimmed);
    } else {
      setEditValue(session.title);
    }
    setIsEditing(false);
  };

  return (
    <div
      className={`
        group relative flex items-center gap-2 px-3 py-2.5 rounded-lg cursor-pointer
        transition-all duration-150 select-none
        ${isActive
          ? "bg-[var(--app-panel)] text-[var(--app-text)] shadow-sm ring-1 ring-[var(--app-border)]"
          : "text-[var(--app-muted)] hover:bg-[var(--app-panel)] hover:text-[var(--app-text)]"
        }
      `}
      onClick={!isEditing ? onSelect : undefined}
    >
      {/* Active indicator */}
      {isActive && (
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-[var(--app-accent)] rounded-r" />
      )}

      <div className="flex-1 min-w-0">
        {isEditing ? (
          <input
            ref={inputRef}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={commitRename}
            onKeyDown={(e) => {
              if (e.key === "Enter") commitRename();
              if (e.key === "Escape") {
                setEditValue(session.title);
                setIsEditing(false);
              }
              e.stopPropagation();
            }}
            onClick={(e) => e.stopPropagation()}
            className="w-full bg-[var(--app-panel)] border border-[var(--app-border-strong)] rounded px-2 py-0.5 text-xs text-[var(--app-text)] outline-none"
            maxLength={60}
          />
        ) : (
          <>
            <p className="text-xs font-medium truncate leading-tight">
              {session.title}
            </p>
            <p className="text-[10px] text-[var(--app-subtle)] mt-0.5">
              {timeAgo(session.updatedAt)}
            </p>
          </>
        )}
      </div>

      {/* Actions menu */}
      {!isEditing && (
        <div className="relative" ref={menuRef}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowMenu((v) => !v);
            }}
            className={`
              p-1 rounded transition-opacity
              ${showMenu ? "opacity-100" : "opacity-0 group-hover:opacity-100"}
              hover:bg-[var(--app-panel-soft)] text-[var(--app-subtle)] hover:text-[var(--app-text)]
            `}
          >
            <span className="material-symbols-outlined text-sm">more_horiz</span>
          </button>

          {showMenu && (
            <div className="absolute right-0 top-full mt-1 w-36 bg-[var(--app-panel)] border border-[var(--app-border)] rounded-lg shadow-xl z-50 py-1 overflow-hidden">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowMenu(false);
                  setIsEditing(true);
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs text-[var(--app-muted)] hover:text-[var(--app-text)] hover:bg-[var(--app-panel-soft)] transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-sm">edit</span>
                Rename
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowMenu(false);
                  onDelete();
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-sm">delete</span>
                Delete
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
