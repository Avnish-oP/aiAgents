"use client";

import { Message, PersonaConfig, YouTubeVideo } from "@/types";
import { useRef, useEffect, useState } from "react";

interface MessageBubbleProps {
  message: Message;
  persona: PersonaConfig;
  isStreaming?: boolean;
}

// Simple markdown-like renderer for code blocks, bold, and lists
function renderContent(content: string) {
  const parts: React.ReactNode[] = [];
  const lines = content.split("\n");
  let inCodeBlock = false;
  let codeContent = "";
  let codeLang = "";
  let key = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.startsWith("```")) {
      if (inCodeBlock) {
        parts.push(
          <CodeBlock key={key++} code={codeContent.trimEnd()} language={codeLang} />
        );
        codeContent = "";
        codeLang = "";
        inCodeBlock = false;
      } else {
        inCodeBlock = true;
        codeLang = line.slice(3).trim();
      }
      continue;
    }

    if (inCodeBlock) {
      codeContent += (codeContent ? "\n" : "") + line;
      continue;
    }

    // Inline formatting
    parts.push(<TextLine key={key++} line={line} isLast={i === lines.length - 1} />);
  }

  // If code block wasn't closed
  if (inCodeBlock && codeContent) {
    parts.push(
      <CodeBlock key={key++} code={codeContent.trimEnd()} language={codeLang} />
    );
  }

  return parts;
}

function extractYouTubeVideos(content: string): YouTubeVideo[] {
  const videos: YouTubeVideo[] = [];
  
  // Parse Markdown links [Title](https://youtube.com/watch?v=...)
  const markdownRegex = /\[([^\]]+)\]\((https?:\/\/(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]+)[^\)]*)\)/g;
  let match: RegExpExecArray | null;
  while ((match = markdownRegex.exec(content)) !== null) {
    const videoId = match[3];
    const title = match[1].replace(/\*\*/g, ""); // Remove bold asterisks if present
    if (!videos.find((v) => v.videoId === videoId)) {
      videos.push({
        title,
        videoId,
        thumbnail: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
        description: "",
        publishedAt: "",
      });
    }
  }

  // Parse raw YouTube URLs
  const rawRegex = /https?:\/\/(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]+)[^\s\)]*/g;
  while ((match = rawRegex.exec(content)) !== null) {
    const videoId = match[1];
    if (!videos.find((v) => v.videoId === videoId)) {
      videos.push({
        title: "YouTube Video",
        videoId,
        thumbnail: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
        description: "",
        publishedAt: "",
      });
    }
  }

  return videos;
}

function TextLine({ line, isLast }: { line: string; isLast: boolean }) {
  if (!line.trim()) return <br />;

  // Process inline markdown: **bold**, `code`, *italic*, [link](url)
  const processText = (text: string) => {
    return text
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.+?)\*/g, "<em>$1</em>")
      .replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>')
      .replace(
        /\[([^\]]+)\]\((https?:\/\/[^\s\)]+)\)/g,
        '<a href="$2" target="_blank" rel="noopener noreferrer" class="chat-link">$1</a>'
      );
  };

  const processed = processText(line);

  // Check if it's a list item
  const isBullet = /^[\-\*]\s/.test(line.trim());
  const isNumbered = /^\d+\.\s/.test(line.trim());

  if (isBullet || isNumbered) {
    const listContent = line.replace(/^[\-\*\d.]+\s/, "");
    const processedList = processText(listContent);
    return (
      <div className="list-item">
        <span className="list-marker">{isNumbered ? line.match(/^\d+/)?.[0] + "." : "•"}</span>
        <span dangerouslySetInnerHTML={{ __html: processedList }} />
      </div>
    );
  }

  // Headings
  if (line.startsWith("### ")) {
    return <h4 className="msg-heading">{line.slice(4)}</h4>;
  }
  if (line.startsWith("## ")) {
    return <h3 className="msg-heading">{line.slice(3)}</h3>;
  }

  return (
    <span>
      <span dangerouslySetInnerHTML={{ __html: processed }} />
      {!isLast && "\n"}
    </span>
  );
}

function CodeBlock({ code, language }: { code: string; language: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  return (
    <div className="code-block">
      <div className="code-header">
        <span className="code-lang">{language || "code"}</span>
        <button className="code-copy" onClick={handleCopy}>
          {copied ? (
            <>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              Copied
            </>
          ) : (
            <>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
              </svg>
              Copy
            </>
          )}
        </button>
      </div>
      <pre className="code-content">
        <code>{code}</code>
      </pre>
    </div>
  );
}

function VideoCard({ video }: { video: YouTubeVideo }) {
  return (
    <a
      href={`https://youtube.com/watch?v=${video.videoId}`}
      target="_blank"
      rel="noopener noreferrer"
      className="video-card"
    >
      <div className="video-thumbnail-wrapper">
        <img
          src={video.thumbnail}
          alt={video.title}
          className="video-thumbnail"
          loading="lazy"
        />
        <div className="video-play-icon">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
            <polygon points="5 3 19 12 5 21 5 3" />
          </svg>
        </div>
      </div>
      <div className="video-info">
        <span className="video-title">{video.title}</span>
        <span className="video-meta">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
            <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814z" />
          </svg>
          YouTube
        </span>
      </div>
    </a>
  );
}

export default function MessageBubble({
  message,
  persona,
  isStreaming,
}: MessageBubbleProps) {
  const isUser = message.role === "user";
  const bubbleRef = useRef<HTMLDivElement>(null);

  // Extract video links automatically from the text to ensure cards always render
  const displayVideos = (() => {
    if (isUser) return [];
    
    const apiVideos = message.videos || [];
    const extracted = extractYouTubeVideos(message.content);
    
    // Merge without duplicates
    const merged = [...apiVideos];
    extracted.forEach((extVid) => {
      if (!merged.find((v) => v.videoId === extVid.videoId)) {
        merged.push(extVid);
      }
    });
    
    return merged;
  })();

  useEffect(() => {
    bubbleRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [message.content]);

  return (
    <div
      ref={bubbleRef}
      className={`message ${isUser ? "message-user" : "message-ai"}`}
      style={
        !isUser
          ? ({
              "--persona-primary": persona.colorTheme.primary,
              "--persona-glow": persona.colorTheme.primaryGlow,
            } as React.CSSProperties)
          : undefined
      }
    >
      {!isUser && (
        <img
          src={persona.avatarUrl}
          alt={persona.name}
          className="message-avatar"
          width={36}
          height={36}
        />
      )}
      <div className={`message-bubble ${isUser ? "bubble-user" : "bubble-ai"}`}>
        {/* Thought Process (Phase 1 Stream) */}
        {!isUser && message.thinking && (
          <details className="thinking-box" open={isStreaming && !message.content}>
            <summary className="thinking-summary">
              <span className="thinking-icon">🧠</span>
              {isStreaming && !message.content ? "Thinking..." : "Thought Process"}
            </summary>
            <div className="thinking-content">
              {message.thinking}
              {isStreaming && !message.content && <span className="cursor-blink">▊</span>}
            </div>
          </details>
        )}

        {message.content && (
          <div className="message-content">
            {renderContent(message.content)}
            {isStreaming && <span className="cursor-blink">▊</span>}
          </div>
        )}

        {/* YouTube Video Cards */}
        {displayVideos.length > 0 && (
          <div className="video-cards">
            <div className="video-cards-label">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polygon points="23 7 16 12 23 17 23 7" />
                <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
              </svg>
              Recommended Videos
            </div>
            <div className="video-cards-grid">
              {displayVideos.map((video) => (
                <VideoCard key={video.videoId} video={video} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
