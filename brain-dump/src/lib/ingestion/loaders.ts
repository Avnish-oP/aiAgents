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
// PDF  — pdf-parse (v2 class-based API)
// ─────────────────────────────────────────────────────────────
export async function loadPdf(
  buffer: Buffer,
  filename = "document.pdf",
): Promise<{ text: string; title: string }> {
  const { PDFParse } = await import("pdf-parse");
  // Pass the PDF data via the constructor (load() is private in v2)
  const parser = new PDFParse({ data: new Uint8Array(buffer) });
  const result = await parser.getText();   // returns TextResult with .text
  const title = filename.replace(/\.pdf$/i, "");
  return { text: result.text ?? "", title };
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

  const { data: html } = await axios.get<string>(url, {
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
