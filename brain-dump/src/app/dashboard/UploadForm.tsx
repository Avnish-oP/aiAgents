"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";

type TabType = "file" | "text" | "youtube" | "website";

const TABS: { id: TabType; label: string; icon: string }[] = [
  { id: "file", label: "File", icon: "upload_file" },
  { id: "text", label: "Text", icon: "notes" },
  { id: "youtube", label: "YouTube", icon: "smart_display" },
  { id: "website", label: "Website", icon: "language" },
];

const ACCEPTED_TYPES = ".pdf,.docx";

export function UploadForm() {
  const [activeTab, setActiveTab] = useState<TabType>("file");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  // File tab
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Text tab
  const [textTitle, setTextTitle] = useState("");
  const [textContent, setTextContent] = useState("");

  // URL tab
  const [url, setUrl] = useState("");

  const router = useRouter();

  const reset = () => {
    setSelectedFile(null);
    setTextTitle("");
    setTextContent("");
    setUrl("");
    setError(null);
    setSuccess(null);
  };

  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    reset();
  };

  // ── Drag & Drop ──────────────────────────────────────────────
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(true);
  };
  const handleDragLeave = () => setDragging(false);
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  };

  const handleFileSelect = (file: File) => {
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (!["pdf", "docx"].includes(ext ?? "")) {
      setError("Only PDF and DOCX files are supported");
      return;
    }
    setSelectedFile(file);
    setError(null);
  };

  // ── Submit ───────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setIsLoading(true);

    try {
      let response: Response;

      if (activeTab === "file") {
        if (!selectedFile) throw new Error("Please select a file");
        const ext = selectedFile.name.split(".").pop()?.toLowerCase();
        const type = ext === "pdf" ? "pdf" : "docx";

        const form = new FormData();
        form.set("type", type);
        form.set("file", selectedFile);
        response = await fetch("/api/ingest", { method: "POST", body: form });
      } else if (activeTab === "text") {
        if (!textTitle.trim()) throw new Error("Please enter a title");
        if (!textContent.trim()) throw new Error("Please enter some text");
        response = await fetch("/api/ingest", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type: "text", title: textTitle, content: textContent }),
        });
      } else {
        // youtube or website
        if (!url.trim()) throw new Error("Please enter a URL");
        response = await fetch("/api/ingest", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type: activeTab, url }),
        });
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.details ?? data.error ?? "Ingestion failed");
      }

      setSuccess(`✓ Indexed ${data.chunkCount} chunks successfully`);
      reset();
      router.refresh(); // re-fetch server component data
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="rounded-xl border border-[#1a1a1a] bg-[#080808] p-6">
      <h2 className="mb-5 text-sm font-semibold text-white">Add Source</h2>

      {/* ── Tab Bar ── */}
      <div className="mb-6 flex gap-1 rounded-lg bg-[#111] p-1">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => handleTabChange(tab.id)}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-md py-1.5 text-xs font-medium transition-all ${
              activeTab === tab.id
                ? "bg-white text-black"
                : "text-[#666] hover:text-white"
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">{tab.icon}</span>
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {/* ── File Tab ── */}
        {activeTab === "file" && (
          <div>
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed px-4 py-10 text-center transition-colors ${
                dragging
                  ? "border-white bg-[#111]"
                  : selectedFile
                    ? "border-[#2a2a2a] bg-[#0f0f0f]"
                    : "border-[#222] hover:border-[#444]"
              }`}
            >
              <span className="material-symbols-outlined mb-3 text-3xl text-[#555]">
                {selectedFile ? "task" : "cloud_upload"}
              </span>
              {selectedFile ? (
                <p className="text-sm font-medium text-white">{selectedFile.name}</p>
              ) : (
                <>
                  <p className="text-sm text-[#888]">
                    Drop PDF or DOCX here, or click to browse
                  </p>
                  <p className="mt-1 text-xs text-[#555]">Max 4MB</p>
                </>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept={ACCEPTED_TYPES}
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
            />
          </div>
        )}

        {/* ── Text Tab ── */}
        {activeTab === "text" && (
          <div className="flex flex-col gap-3">
            <input
              type="text"
              placeholder="Title (e.g. 'Meeting Notes')"
              value={textTitle}
              onChange={(e) => setTextTitle(e.target.value)}
              className="w-full rounded-lg border border-[#222] bg-[#111] px-4 py-2.5 text-sm text-white placeholder-[#555] outline-none focus:border-[#444]"
            />
            <textarea
              placeholder="Paste your text here..."
              value={textContent}
              onChange={(e) => setTextContent(e.target.value)}
              rows={6}
              className="w-full resize-none rounded-lg border border-[#222] bg-[#111] px-4 py-2.5 text-sm text-white placeholder-[#555] outline-none focus:border-[#444]"
            />
          </div>
        )}

        {/* ── YouTube / Website Tabs ── */}
        {(activeTab === "youtube" || activeTab === "website") && (
          <input
            type="url"
            placeholder={
              activeTab === "youtube"
                ? "https://youtube.com/watch?v=..."
                : "https://example.com/article"
            }
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="w-full rounded-lg border border-[#222] bg-[#111] px-4 py-2.5 text-sm text-white placeholder-[#555] outline-none focus:border-[#444]"
          />
        )}

        {/* ── Feedback ── */}
        {error && (
          <p className="flex items-center gap-2 rounded-lg border border-red-900/40 bg-red-950/30 px-3 py-2 text-xs text-red-400">
            <span className="material-symbols-outlined text-[16px]">error</span>
            {error}
          </p>
        )}
        {success && (
          <p className="flex items-center gap-2 rounded-lg border border-green-900/40 bg-green-950/30 px-3 py-2 text-xs text-green-400">
            <span className="material-symbols-outlined text-[16px]">check_circle</span>
            {success}
          </p>
        )}

        {/* ── Submit ── */}
        <button
          type="submit"
          disabled={isLoading}
          className="flex items-center justify-center gap-2 rounded-lg bg-white py-2.5 text-sm font-semibold text-black transition-all hover:bg-[#e5e5e5] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isLoading ? (
            <>
              <span className="material-symbols-outlined animate-spin text-[18px]">
                progress_activity
              </span>
              Processing…
            </>
          ) : (
            <>
              <span className="material-symbols-outlined text-[18px]">
                add_circle
              </span>
              Add to Knowledge Base
            </>
          )}
        </button>
      </form>
    </div>
  );
}
