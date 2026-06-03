<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Current Auth Progress

- Auth has been migrated to the NextAuth v5 beta API via `next-auth@^5.0.0-beta.31`.
- The source of truth is `src/auth.ts`; `src/utils/auth/config.ts` only re-exports from it for compatibility.
- The App Router auth handler is wired at `src/app/api/auth/[...nextauth]/route.ts`.
- GitHub login redirects to `/chat` and accepts either `AUTH_GITHUB_ID` / `AUTH_GITHUB_SECRET` or the existing `GITHUB_ID` / `GITHUB_SECRET` env names.
- Auth.js host trust is enabled outside production and can be enabled for production-like local smoke tests with `AUTH_TRUST_HOST=true`.
- Credentials login redirects to `/chat`; unverified email credentials surface the `email_not_verified` code.
- Email registration stores pending users in Redis, sends OTP to pending users, verifies OTP before Mongo user creation, and applies basic Redis-backed OTP send/verify rate limits.
- `/chat` is a server-protected route using `auth()` and redirects unauthenticated users to `/login`.
- `src/types/next-auth.d.ts` augments the session/JWT types with `user.id`.
- `next.config.ts` sets `turbopack.root` to the project cwd to avoid parent-lockfile root inference.

## Auth Verification Status

- `npm run lint` passes.
- `npx tsc --noEmit` passes.
- `npm run build` passes and lists `/api/auth/[...nextauth]` and `/chat` as dynamic routes.
- Local production smoke test on `127.0.0.1:3001` with `AUTH_TRUST_HOST=true` passed for:
  - `GET /api/auth/session` returning unauthenticated `null`.
  - `GET /api/auth/providers` exposing GitHub and credentials providers.
  - `HEAD /chat` redirecting unauthenticated users to `/login`.
  - `HEAD /login` returning 200.
  - invalid `POST /api/auth/register` returning 400.
  - email-only `POST /api/auth/resend-otp` reaching the pending-registration guard and returning 400 when no pending registration exists.
- Provider URLs in smoke tests follow `AUTH_URL` / `NEXTAUTH_URL`; update that env value when testing on a port other than `3000`.
- Full end-to-end OAuth and OTP verification still depends on valid `.env.local` values for GitHub, MongoDB, Upstash Redis, and Resend.
