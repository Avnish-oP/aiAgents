/**
 * GET  /api/sources → list user's sources (sorted newest first)
 * DELETE /api/sources → delete source doc + all vector chunks
 */

import { auth } from "@/auth";
import { connectDB } from "@/lib/mongodb";
import { Source } from "@/models/Source";
import { deleteBySourceId } from "@/lib/vector/client";
import { NextResponse } from "next/server";

// ── GET: list all sources for the authed user ─────────────────
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectDB();
  const sources = await Source.find({ userId: session.user.id })
    .sort({ createdAt: -1 })
    .lean();

  return NextResponse.json({ sources });
}

// ── DELETE: remove a source and its vector chunks ─────────────
export async function DELETE(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;

  const body = await req.json();
  const sourceId = body?.sourceId;

  if (!sourceId || typeof sourceId !== "string") {
    return NextResponse.json(
      { error: "sourceId is required" },
      { status: 400 },
    );
  }

  await connectDB();

  // Verify the source belongs to this user
  const source = await Source.findOne({ _id: sourceId, userId });
  if (!source) {
    return NextResponse.json({ error: "Source not found" }, { status: 404 });
  }

  // Delete vector chunks from Upstash
  await deleteBySourceId(userId, sourceId);

  // Delete MongoDB doc
  await Source.deleteOne({ _id: sourceId });

  return NextResponse.json({ success: true });
}
