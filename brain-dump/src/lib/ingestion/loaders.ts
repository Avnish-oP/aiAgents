/**
 * lib/ingestion/loaders.ts
 *
 * Per-type text extractors.
 * Uses direct libraries (pdf-parse, mammoth, cheerio+axios, youtubei.js)
 * instead of @langchain/community to avoid Next.js fs-module conflicts.
 *
 * Each function returns { text: string, title: string }.
 */

// ─────────────────────────────────────────────────────────────
// PDF  — pdfjs-dist (direct, no separate worker — safe for serverless)
// ─────────────────────────────────────────────────────────────
export async function loadPdf(
  buffer: Buffer,
  filename = "document.pdf",
): Promise<{ text: string; title: string }> {
  // Polyfill DOMMatrix for Node environments (required by pdfjs internals)
  if (typeof globalThis.DOMMatrix === "undefined") {
    (globalThis as unknown as { DOMMatrix: unknown }).DOMMatrix = class DOMMatrix {};
  }

  // Import pdfjs-dist legacy build directly (avoids the worker ESM shim in pdf-parse
  // that tries to dynamic-import pdf.worker.mjs at an absolute path that doesn't exist
  // inside Vercel / Lambda serverless bundles).
  const pdfjsLib = await import("pdfjs-dist/legacy/build/pdf.mjs");

  // Disable the worker entirely so pdfjs runs in the main thread.
  // Setting workerSrc to an empty data-URL makes it skip the fetch/import
  // and fall back to the built-in fake-worker (synchronous, in-process).
  pdfjsLib.GlobalWorkerOptions.workerSrc = "";

  const loadingTask = pdfjsLib.getDocument({
    data: new Uint8Array(buffer),
    // Prevent pdfjs from trying to resolve relative URLs in the serverless env
    useWorkerFetch: false,
    isEvalSupported: false,
    useSystemFonts: true,
  });

  const pdfDoc = await loadingTask.promise;
  const numPages = pdfDoc.numPages;
  const textParts: string[] = [];

  for (let i = 1; i <= numPages; i++) {
    const page = await pdfDoc.getPage(i);
    const content = await page.getTextContent();
    const pageText = content.items
      .map((item) => ("str" in item ? item.str : ""))
      .join(" ");
    textParts.push(pageText);
    page.cleanup();
  }

  await pdfDoc.destroy();

  const title = filename.replace(/\.pdf$/i, "");
  return { text: textParts.join("\n\n").trim(), title };
}

// ─────────────────────────────────────────────────────────────
// DOCX  — mammoth
// ─────────────────────────────────────────────────────────────
export async function loadDocx(
  buffer: Buffer,
  filename = "document.docx",
): Promise<{ text: string; title: string }> {
  const mammoth = await import("mammoth");
  const result = await mammoth.extractRawText({ buffer });
  const title = filename.replace(/\.docx$/i, "");
  return { text: result.value ?? "", title };
}

// ─────────────────────────────────────────────────────────────
// Plain text — passthrough
// ─────────────────────────────────────────────────────────────
export function loadText(
  content: string,
  title: string,
): { text: string; title: string } {
  return { text: content.trim(), title };
}

// ─────────────────────────────────────────────────────────────
// YouTube — youtubei.js transcript
// ─────────────────────────────────────────────────────────────
export async function loadYoutube(
  url: string,
): Promise<{ text: string; title: string }> {
  const { Innertube } = await import("youtubei.js");
  const youtube = await Innertube.create({ retrieve_player: false });

  const videoId = extractYoutubeId(url);
  if (!videoId) throw new Error(`Cannot extract video ID from URL: ${url}`);

  const info = await youtube.getInfo(videoId);
  const title = (info.basic_info?.title ?? "YouTube Video").trim();

  const transcriptData = await info.getTranscript();
  const segments =
    transcriptData?.transcript?.content?.body?.initial_segments ?? [];

  const text = segments
    .map((seg: { snippet?: { text?: string } }) => seg.snippet?.text ?? "")
    .filter(Boolean)
    .join(" ")
    .trim();

  if (!text) throw new Error("No transcript available for this video.");
  return { text, title };
}

function extractYoutubeId(url: string): string | null {
  try {
    const parsed = new URL(url);
    if (parsed.hostname.includes("youtu.be")) return parsed.pathname.slice(1);
    return parsed.searchParams.get("v");
  } catch {
    return null;
  }
}

// ─────────────────────────────────────────────────────────────
// Website — axios + cheerio
// ─────────────────────────────────────────────────────────────
export async function loadWebsite(
  url: string,
): Promise<{ text: string; title: string }> {
  const axios = (await import("axios")).default;
  const { load } = await import("cheerio");

  // Sanitize malformed URLs like "ww.example.com" or "http:/ww.example.com"
  let sanitizedUrl = url.trim();
  sanitizedUrl = sanitizedUrl.replace(/^(https?):\/+([^\/])/i, "$1://$2");
  if (!/^https?:\/\//i.test(sanitizedUrl)) {
    sanitizedUrl = "https://" + sanitizedUrl;
  }
  const finalUrl = new URL(sanitizedUrl).href;

  const { data: html } = await axios.get<string>(finalUrl, {
    timeout: 15000,
    headers: {
      "User-Agent":
        "Mozilla/5.0 (compatible; BrainDumpBot/1.0; +https://braindump.avnish.dev)",
    },
  });

  const $ = load(html);

  // Remove nav, footer, scripts, styles
  $("script, style, nav, footer, header, aside, [role=navigation]").remove();

  const title = $("title").first().text().trim() || new URL(url).hostname;
  const text = $("body")
    .text()
    .replace(/\s{3,}/g, "\n\n")
    .trim();

  return { text, title };
}
