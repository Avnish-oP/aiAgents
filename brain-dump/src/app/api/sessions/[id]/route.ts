/**
 * GET  /api/sessions/[id] — load full session messages
 * PATCH /api/sessions/[id] — rename session
 * DELETE /api/sessions/[id] — delete session
 */

import { auth } from "@/auth";
import { connectDB } from "@/lib/mongodb";
import { ChatSession } from "@/models/ChatSession";
import { NextResponse } from "next/server";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;

  await connectDB();

  const chatSession = await ChatSession.findOne({
    _id: id,
    userId: session.user.id,
  }).lean();

  if (!chatSession) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(chatSession);
}

export async function PATCH(req: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const { title } = await req.json();

  if (!title?.trim()) {
    return NextResponse.json({ error: "Title is required" }, { status: 400 });
  }

  await connectDB();

  const updated = await ChatSession.findOneAndUpdate(
    { _id: id, userId: session.user.id },
    { title: title.trim().slice(0, 60) },
    { new: true, select: "_id title updatedAt" },
  ).lean();

  if (!updated) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(updated);
}

export async function DELETE(_req: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;

  await connectDB();

  const deleted = await ChatSession.findOneAndDelete({
    _id: id,
    userId: session.user.id,
  });

  if (!deleted) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
