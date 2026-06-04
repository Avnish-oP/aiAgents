"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export interface SourceCardProps {
  source: {
    _id: string;
    title: string;
    type: string;
    status: string;
    chunkCount: number;
    url?: string;
    filename?: string;
    errorMessage?: string;
    createdAt: string;
  };
}

const TYPE_CONFIG: Record<string, { label: string; icon: string; color: string }> = {
  pdf: {
    label: "PDF",
    icon: "picture_as_pdf",
    color: "text-[var(--app-danger-text)] bg-[var(--app-danger-bg)] border-[var(--app-danger-border)]",
  },
  docx: {
    label: "DOCX",
    icon: "description",
    color: "text-[var(--app-info-text)] bg-[var(--app-info-bg)] border-[var(--app-info-border)]",
  },
  text: {
    label: "Text",
    icon: "notes",
    color: "text-[var(--app-warning-text)] bg-[var(--app-warning-bg)] border-[var(--app-warning-border)]",
  },
  youtube: {
    label: "YouTube",
    icon: "smart_display",
    color: "text-[var(--app-danger-text)] bg-[var(--app-danger-bg)] border-[var(--app-danger-border)]",
  },
  website: {
    label: "Website",
    icon: "language",
    color: "text-[var(--app-success-text)] bg-[var(--app-success-bg)] border-[var(--app-success-border)]",
  },
};

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: string }> = {
  pending: {
    label: "Pending",
    color: "text-[var(--app-warning-text)] bg-[var(--app-warning-bg)] border-[var(--app-warning-border)]",
    icon: "schedule",
  },
  processing: {
    label: "Processing",
    color: "text-[var(--app-info-text)] bg-[var(--app-info-bg)] border-[var(--app-info-border)]",
    icon: "progress_activity",
  },
  ready: {
    label: "Ready",
    color: "text-[var(--app-success-text)] bg-[var(--app-success-bg)] border-[var(--app-success-border)]",
    icon: "check_circle",
  },
  failed: {
    label: "Failed",
    color: "text-[var(--app-danger-text)] bg-[var(--app-danger-bg)] border-[var(--app-danger-border)]",
    icon: "error",
  },
};

export function SourceCard({ source }: SourceCardProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const router = useRouter();

  const type = TYPE_CONFIG[source.type] ?? TYPE_CONFIG.text;
  const status = STATUS_CONFIG[source.status] ?? STATUS_CONFIG.pending;

  const handleDelete = async () => {
    if (!confirm(`Delete "${source.title}"? This cannot be undone.`)) return;
    setIsDeleting(true);

    try {
      const res = await fetch("/api/sources", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourceId: source._id }),
      });
      if (!res.ok) throw new Error("Delete failed");
      router.refresh();
    } catch {
      alert("Failed to delete source. Please try again.");
      setIsDeleting(false);
    }
  };

  const date = new Date(source.createdAt).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div className="group relative rounded-xl border border-[var(--app-border)] bg-[var(--app-panel)] p-4 shadow-[var(--app-shadow)] transition-all hover:border-[var(--app-border-strong)]">
      <div className="flex items-start justify-between gap-3">
        {/* Left: icon + info */}
        <div className="flex min-w-0 flex-1 items-start gap-3">
          {/* Type icon */}
          <div className={`mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg border ${type.color}`}>
            <span className="material-symbols-outlined text-[18px]">{type.icon}</span>
          </div>

          {/* Title + meta */}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-[var(--app-text)]">{source.title}</p>
            <div className="mt-1.5 flex flex-wrap items-center gap-2">
              {/* Type badge */}
              <span className={`inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${type.color}`}>
                {type.label}
              </span>

              {/* Status badge */}
              <span className={`inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[10px] font-medium ${status.color}`}>
                <span className={`material-symbols-outlined text-[12px] ${source.status === "processing" ? "animate-spin" : ""}`}>
                  {status.icon}
                </span>
                {status.label}
              </span>

              {/* Chunk count */}
              {source.status === "ready" && source.chunkCount > 0 && (
                <span className="text-[10px] text-[var(--app-subtle)]">
                  {source.chunkCount} chunks
                </span>
              )}

              {/* Date */}
              <span className="text-[10px] text-[var(--app-subtle)]">{date}</span>
            </div>

            {/* URL preview */}
            {source.url && (
              <a
                href={source.url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1 block truncate text-[11px] text-[var(--app-subtle)] hover:text-[var(--app-muted)] transition-colors"
              >
                {source.url}
              </a>
            )}

            {/* Error message */}
            {source.status === "failed" && source.errorMessage && (
              <p className="mt-1.5 rounded bg-[var(--app-danger-bg)] px-2 py-1 text-[11px] text-[var(--app-danger-text)]">
                {source.errorMessage}
              </p>
            )}
          </div>
        </div>

        {/* Delete button */}
        <button
          onClick={handleDelete}
          disabled={isDeleting}
          className="flex-shrink-0 rounded-lg p-2 text-[var(--app-subtle)] opacity-0 transition-all group-hover:opacity-100 hover:bg-[var(--app-danger-bg)] hover:text-[var(--app-danger-text)] disabled:opacity-50"
          title="Delete source"
        >
          {isDeleting ? (
            <span className="material-symbols-outlined animate-spin text-[18px]">
              progress_activity
            </span>
          ) : (
            <span className="material-symbols-outlined text-[18px]">delete</span>
          )}
        </button>
      </div>
    </div>
  );
}
