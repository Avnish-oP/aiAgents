/**
 * GET /api/sessions
 * Returns all chat sessions for the authenticated user, sorted by latest activity.
 */

import { auth } from "@/auth";
import { connectDB } from "@/lib/mongodb";
import { ChatSession } from "@/models/ChatSession";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectDB();

  const sessions = await ChatSession.find(
    { userId: session.user.id },
    { title: 1, updatedAt: 1, createdAt: 1, "messages": { $slice: -1 } },
  )
    .sort({ updatedAt: -1 })
    .lean();

  const result = sessions.map((s) => ({
    _id: s._id.toString(),
    title: s.title,
    updatedAt: s.updatedAt,
    createdAt: s.createdAt,
    messageCount: (s as { messages?: unknown[] }).messages?.length ?? 0,
  }));

  return NextResponse.json(result);
}
