/**
 * src/proxy.ts  (Next.js 16 — renamed from middleware.ts)
 *
 * Protects authenticated routes using NextAuth v5.
 * Unauthenticated requests to protected routes are redirected to /login.
 *
 * Protected routes:
 *   /chat, /dashboard             — app pages
 *   /api/chat, /api/sources,
 *   /api/ingest                   — API routes
 */

import { auth } from "@/auth";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Re-export as the "proxy" named export (Next.js 16 convention)
export async function proxy(req: NextRequest) {
  const session = await auth();

  if (!session) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", req.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/chat",
    "/dashboard",
    "/api/chat",
    "/api/sources",
    "/api/ingest",
  ],
};
