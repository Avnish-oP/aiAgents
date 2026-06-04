/**
 * GET /api/sources/[id]
 * Returns single source metadata for citation display.
 */

import { auth } from "@/auth";
import { connectDB } from "@/lib/mongodb";
import { Source } from "@/models/Source";
import { NextResponse } from "next/server";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;

  await connectDB();

  const source = await Source.findOne({
    _id: id,
    userId: session.user.id,
  })
    .select("title type url filename status")
    .lean();

  if (!source) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(source);
}
