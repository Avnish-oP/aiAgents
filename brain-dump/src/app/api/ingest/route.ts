/**
 * POST /api/ingest
 *
 * Accepts:
 *   - multipart/form-data  → file (pdf/docx) + type
 *   - application/json     → { type: "text", title, content }
 *                          → { type: "youtube"|"website", url }
 *
 * Pipeline:
 *  1. Auth check
 *  2. Create Source doc { status: "pending" }
 *  3. Load content via type-specific loader
 *  4. Chunk → embed → upsert to Upstash Vector
 *  5. Update Source { status: "ready", chunkCount }
 *
 * Returns: { sourceId, chunkCount }
 * On error: Source updated to { status: "failed", errorMessage }
 */

import { auth } from "@/auth";
import { connectDB } from "@/lib/mongodb";
import { Source } from "@/models/Source";
import { loadPdf, loadDocx, loadText, loadYoutube, loadWebsite } from "@/lib/ingestion/loaders";
import { chunkText } from "@/lib/ingestion/chunker";
import { embedChunks } from "@/lib/ingestion/embedder";
import { upsertChunks } from "@/lib/vector/client";
import { NextResponse } from "next/server";

export const maxDuration = 120; // long-running ingestion

export async function POST(req: Request) {
  // ── Auth ─────────────────────────────────────────────────────
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;

  // ── Parse request ─────────────────────────────────────────────
  const contentType = req.headers.get("content-type") ?? "";
  let type: string;
  let title: string | null = null;
  let content: string | null = null;
  let url: string | null = null;
  let fileBuffer: Buffer | null = null;
  let filename: string | null = null;

  if (contentType.includes("multipart/form-data")) {
    const form = await req.formData();
    type = String(form.get("type") ?? "");
    const file = form.get("file") as File | null;
    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }
    filename = file.name;
    fileBuffer = Buffer.from(await file.arrayBuffer());
  } else {
    const body = await req.json();
    type = String(body.type ?? "");
    title = body.title ?? null;
    content = body.content ?? null;
    url = body.url ?? null;
  }

  // ── Validate type ─────────────────────────────────────────────
  const validTypes = ["pdf", "docx", "text", "youtube", "website"];
  if (!validTypes.includes(type)) {
    return NextResponse.json(
      { error: `Invalid type. Must be one of: ${validTypes.join(", ")}` },
      { status: 400 },
    );
  }

  // ── Create Source doc ─────────────────────────────────────────
  await connectDB();
  const source = await Source.create({
    userId,
    type,
    title: title ?? filename ?? url ?? "Untitled",
    url: url ?? undefined,
    filename: filename ?? undefined,
    status: "pending",
  });
  const sourceId = String(source._id);

  try {
    // ── Update status: processing ─────────────────────────────────
    source.status = "processing";
    await source.save();

    // ── Load content ───────────────────────────────────────────────
    let loaded: { text: string; title: string };

    switch (type) {
      case "pdf":
        if (!fileBuffer) throw new Error("File buffer missing for PDF");
        loaded = await loadPdf(fileBuffer, filename ?? "document.pdf");
        break;
      case "docx":
        if (!fileBuffer) throw new Error("File buffer missing for DOCX");
        loaded = await loadDocx(fileBuffer, filename ?? "document.docx");
        break;
      case "text":
        if (!content || !title) throw new Error("content and title required for text type");
        loaded = loadText(content, title);
        break;
      case "youtube":
        if (!url) throw new Error("url required for youtube type");
        loaded = await loadYoutube(url);
        break;
      case "website":
        if (!url) throw new Error("url required for website type");
        loaded = await loadWebsite(url);
        break;
      default:
        throw new Error(`Unknown type: ${type}`);
    }

    if (!loaded.text || loaded.text.length < 10) {
      throw new Error("Extracted text is too short or empty");
    }

    // Update source title from loader (e.g. YouTube video title)
    source.title = loaded.title;

    // ── Chunk ────────────────────────────────────────────────────
    const chunks = await chunkText(loaded.text);
    if (chunks.length === 0) {
      throw new Error("No chunks generated from content");
    }

    // ── Embed ────────────────────────────────────────────────────
    const vectors = await embedChunks(chunks);

    // ── Upsert to Upstash Vector ──────────────────────────────────
    await upsertChunks(
      userId,
      chunks.map((chunkText, idx) => ({
        id: `${sourceId}-${idx}`,
        vector: vectors[idx],
        payload: {
          chunkText,
          sourceId,
          title: loaded.title,
          type,
          chunkIndex: idx,
        },
      })),
    );

    // ── Update Source: ready ──────────────────────────────────────
    source.status = "ready";
    source.chunkCount = chunks.length;
    await source.save();

    return NextResponse.json({ sourceId, chunkCount: chunks.length });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[ingest] Error:", message, err);

    // Mark source as failed
    source.status = "failed";
    source.errorMessage = message;
    await source.save();

    return NextResponse.json(
      { error: "Ingestion failed", details: message },
      { status: 500 },
    );
  }
}
