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
  pdf:     { label: "PDF",     icon: "picture_as_pdf", color: "text-red-400 bg-red-950/40 border-red-900/40" },
  docx:    { label: "DOCX",    icon: "description",    color: "text-blue-400 bg-blue-950/40 border-blue-900/40" },
  text:    { label: "Text",    icon: "notes",           color: "text-yellow-400 bg-yellow-950/40 border-yellow-900/40" },
  youtube: { label: "YouTube", icon: "smart_display",  color: "text-red-400 bg-red-950/40 border-red-900/40" },
  website: { label: "Website", icon: "language",       color: "text-green-400 bg-green-950/40 border-green-900/40" },
};

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: string }> = {
  pending:    { label: "Pending",    color: "text-yellow-400 bg-yellow-950/30 border-yellow-900/40", icon: "schedule" },
  processing: { label: "Processing", color: "text-blue-400 bg-blue-950/30 border-blue-900/40",       icon: "progress_activity" },
  ready:      { label: "Ready",      color: "text-green-400 bg-green-950/30 border-green-900/40",    icon: "check_circle" },
  failed:     { label: "Failed",     color: "text-red-400 bg-red-950/30 border-red-900/40",          icon: "error" },
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
    <div className="group relative rounded-xl border border-[#1a1a1a] bg-[#080808] p-4 transition-all hover:border-[#2a2a2a]">
      <div className="flex items-start justify-between gap-3">
        {/* Left: icon + info */}
        <div className="flex min-w-0 flex-1 items-start gap-3">
          {/* Type icon */}
          <div className={`mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg border ${type.color}`}>
            <span className="material-symbols-outlined text-[18px]">{type.icon}</span>
          </div>

          {/* Title + meta */}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-white">{source.title}</p>
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
                <span className="text-[10px] text-[#555]">
                  {source.chunkCount} chunks
                </span>
              )}

              {/* Date */}
              <span className="text-[10px] text-[#444]">{date}</span>
            </div>

            {/* URL preview */}
            {source.url && (
              <a
                href={source.url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1 block truncate text-[11px] text-[#444] hover:text-[#888] transition-colors"
              >
                {source.url}
              </a>
            )}

            {/* Error message */}
            {source.status === "failed" && source.errorMessage && (
              <p className="mt-1.5 rounded bg-red-950/30 px-2 py-1 text-[11px] text-red-400">
                {source.errorMessage}
              </p>
            )}
          </div>
        </div>

        {/* Delete button */}
        <button
          onClick={handleDelete}
          disabled={isDeleting}
          className="flex-shrink-0 rounded-lg p-2 text-[#333] opacity-0 transition-all group-hover:opacity-100 hover:bg-red-950/40 hover:text-red-400 disabled:opacity-50"
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
