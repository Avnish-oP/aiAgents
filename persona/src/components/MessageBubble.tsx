"use client";

import { Message, PersonaConfig } from "@/types";
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

function TextLine({ line, isLast }: { line: string; isLast: boolean }) {
  if (!line.trim()) return <br />;

  // Process inline markdown: **bold**, `code`, *italic*
  const processed = line
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(
      /`([^`]+)`/g,
      '<code class="inline-code">$1</code>'
    );

  // Check if it's a list item
  const isBullet = /^[\-\*]\s/.test(line.trim());
  const isNumbered = /^\d+\.\s/.test(line.trim());

  if (isBullet || isNumbered) {
    const listContent = line.replace(/^[\-\*\d.]+\s/, "");
    const processedList = listContent
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.+?)\*/g, "<em>$1</em>")
      .replace(
        /`([^`]+)`/g,
        '<code class="inline-code">$1</code>'
      );
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

export default function MessageBubble({
  message,
  persona,
  isStreaming,
}: MessageBubbleProps) {
  const isUser = message.role === "user";
  const bubbleRef = useRef<HTMLDivElement>(null);

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
        <div className="message-content">
          {renderContent(message.content)}
          {isStreaming && <span className="cursor-blink">▊</span>}
        </div>
      </div>
    </div>
  );
}
