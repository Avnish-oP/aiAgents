# Brain Dump — Personal Knowledge Base with RAG Pipeline

> An AI-powered personal knowledge base where users can ingest any content (PDFs, documents, text, YouTube videos, websites) and query it using natural language. The system uses a full RAG pipeline with advanced retrieval techniques (HyDE, multi-query generation, relevance gating) to deliver accurate, context-aware answers.

---

## Table of Contents

- [Project Overview](#project-overview)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Data Flow](#data-flow)
- [Project Structure](#project-structure)
- [Module Reference](#module-reference)
- [Database Schemas](#database-schemas)
- [API Reference](#api-reference)
- [Environment Variables](#environment-variables)
- [Auth Flow](#auth-flow)
- [Ingestion Pipeline](#ingestion-pipeline)
- [RAG Query Pipeline](#rag-query-pipeline)
- [Redis Key Schema](#redis-key-schema)
- [Upstash Vector Schema](#upstash-vector-schema)
- [Deployment](#deployment)
- [Development Setup](#development-setup)

---

## Project Overview

Brain Dump is a full-stack Next.js application that allows users to build a personal knowledge base from heterogeneous content sources and query it conversationally. It is architecturally similar to Google NotebookLM but built as an open learning project focused on understanding RAG pipeline internals.

**Core capabilities:**
- Ingest PDFs, DOCX files, plain text, YouTube video transcripts, and website URLs
- Chunk and embed content using Google Gemini `text-embedding-004` (768 dimensions)
- Store vectors in Upstash Vector with per-user namespace isolation
- Query using advanced RAG: HyDE + multi-query generation + relevance gating
- Auto-decide whether to use RAG context or answer from general knowledge
- Stream responses back to the client via Next.js Server-Sent Events
- Full authentication: GitHub OAuth + Email/Password with OTP email verification

**Learning focus:** This project is built to deeply understand agentic AI and RAG pipeline internals — not as a production SaaS. Each module is intentionally explicit rather than abstracted.

---

## Tech Stack

| Layer | Technology | Purpose |
|---|---|---|
| Framework | Next.js 15 (App Router) | Full-stack React framework |
| Language | TypeScript | Type safety throughout |
| Styling | Tailwind CSS | Utility-first CSS |
| Auth | NextAuth v5 (Auth.js) | Session management, OAuth, JWT |
| Primary DB | MongoDB Atlas + Mongoose | User data, source metadata, chat history |
| Vector DB | Upstash Vector | Storing and querying embeddings |
| Cache / OTP | Upstash Redis | OTP codes, rate limiting, pending user sessions |
| AI Model | Google Gemini API | Embeddings + text generation |
| Email | Resend | Transactional OTP emails |
| PDF parsing | pdf-parse | Extract text from PDF buffers |
| DOCX parsing | mammoth | Extract text from Word documents |
| HTML parsing | cheerio + axios | Website content extraction |
| YouTube | youtubei.js | Fetch video transcripts |
| Text splitting | @langchain/textsplitters | Recursive character text splitter |
| Validation | Zod | Runtime schema validation on all API inputs |
| Forms | react-hook-form + @hookform/resolvers | Client-side form handling |
| Hosting | Vercel | Serverless deployment |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                            CLIENT (Next.js)                              │
│                                                                          │
│   /login          /register        /verify-email                         │
│   /dashboard      /chat                                                  │
│                                                                          │
│   Components: DropZone, SourceCard, ChatWindow, Navbar                   │
└──────────────────────────┬──────────────────────────────────────────────┘
                           │ HTTP / SSE
┌──────────────────────────▼──────────────────────────────────────────────┐
│                         API ROUTES (Next.js)                             │
│                                                                          │
│  /api/auth/[...nextauth]   Auth.js handler                               │
│  /api/auth/register        Validate → send OTP → store pending user      │
│  /api/auth/verify-otp      Verify OTP → create user → return success     │
│  /api/auth/resend-otp      Rate-limited OTP resend                       │
│  /api/sources              GET list / DELETE source                      │
│  /api/ingest               POST → trigger ingestion pipeline             │
│  /api/chat                 POST → trigger RAG pipeline → SSE stream      │
└────┬──────────────┬────────────────────┬────────────────────────────────┘
     │              │                    │
     ▼              ▼                    ▼
┌─────────┐  ┌────────────┐   ┌─────────────────────────────────────────┐
│ MongoDB │  │  Upstash   │   │              SERVICE LAYER                │
│  Atlas  │  │   Redis    │   │                                           │
│         │  │            │   │  lib/auth/       NextAuth config, OTP     │
│ Users   │  │ OTP codes  │   │  lib/db/         Mongoose connection      │
│ Sources │  │ Rate limits│   │  lib/ingestion/  Loaders, chunker,        │
│ Chat    │  │ Pending    │   │                  embedder                 │
│ History │  │ users      │   │  lib/retrieval/  HyDE, multi-query,       │
└─────────┘  └────────────┘   │                  retrieve orchestrator    │
                               │  lib/vector/     Upstash Vector client    │
                               └─────────────────────────────────────────┘
                                              │
                                              ▼
                               ┌─────────────────────────┐
                               │      Upstash Vector      │
                               │  Namespace per userId    │
                               │  768-dim cosine index    │
                               │  Payload: chunkText,     │
                               │  sourceId, title, type   │
                               └─────────────────────────┘
                                              │
                                              ▼
                               ┌─────────────────────────┐
                               │     Google Gemini API    │
                               │  text-embedding-004      │
                               │  gemini-2.0-flash        │
                               └─────────────────────────┘
```

---

## Data Flow

### Ingestion Flow

```
User uploads content (file / URL / text paste)
          │
          ▼
POST /api/ingest
          │
          ▼
Source created in MongoDB { status: "processing" }
          │
          ▼
lib/ingestion/loaders.ts
  ├── PDF        → pdf-parse          → raw text
  ├── DOCX       → mammoth            → raw text
  ├── Plain text → direct passthrough → raw text
  ├── YouTube    → youtubei.js        → transcript text
  └── Website    → axios + cheerio    → cleaned text
          │
          ▼
lib/ingestion/chunker.ts
  RecursiveCharacterTextSplitter
  chunkSize: 512 tokens
  chunkOverlap: 50 tokens
          │
          ▼
lib/ingestion/embedder.ts
  Gemini text-embedding-004
  768-dimensional vectors
  Batched: 20 chunks per API call
          │
          ▼
lib/vector/client.ts
  Upstash Vector upsert
  Namespace: userId
  ID: {sourceId}-{chunkIndex}
  Payload: { chunkText, sourceId, title, type, chunkIndex }
          │
          ▼
MongoDB Source updated { status: "ready", chunkCount: N }
```

### Query Flow

```
User sends message in chat
          │
          ▼
POST /api/chat
  Auth check → extract userId
          │
          ▼
lib/retrieval/retrieve.ts  (orchestrator)
          │
          ├── Step 1: Query Translation
          │     Gemini rewrites user query for better retrieval
          │     e.g. "what did the paper say about X" → "X methodology findings"
          │
          ├── Step 2: HyDE (Hypothetical Document Embedding)
          │     lib/retrieval/hyde.ts
          │     Ask Gemini: "Write a short passage that answers: {query}"
          │     Embed the hypothetical answer (not the query itself)
          │     Rationale: hypothetical answers are semantically closer
          │     to stored chunks than short queries are
          │
          ├── Step 3: Multi-Query Generation
          │     lib/retrieval/multiquery.ts
          │     Ask Gemini to generate 3 rephrasings of the original query
          │     Embed each rephrasing → retrieve top-k for each
          │     Deduplicate results across all 3
          │     Rationale: different phrasings surface different chunks
          │
          ├── Step 4: Merge + Deduplicate
          │     Combine HyDE results + multi-query results
          │     Remove duplicate chunkIds, re-rank by score
          │     Take top 6 chunks
          │
          ├── Step 5: Relevance Gating
          │     Check top result similarity score
          │     If score < 0.75 threshold → skip RAG context entirely
          │     Answer from Gemini general knowledge instead
          │     Prevents hallucinated citations on irrelevant queries
          │
          └── Step 6: Generate Response
                If context relevant:
                  Build prompt: system + retrieved chunks + chat history + query
                  Stream Gemini response via SSE
                  usedRAG: true, sources: [sourceIds]
                If context not relevant:
                  Stream Gemini response from general knowledge
                  usedRAG: false, sources: []
          │
          ▼
Save message + response to MongoDB ChatHistory
Stream complete → client renders response + RAG badge
```

---

## Project Structure

```
brain-dump/
├── src/
│   ├── app/
│   │   ├── (auth)/                        # Unauthenticated route group
│   │   │   ├── login/
│   │   │   │   └── page.tsx               # Login: GitHub OAuth + email/password
│   │   │   ├── register/
│   │   │   │   └── page.tsx               # Register: triggers OTP flow
│   │   │   └── verify-email/
│   │   │       └── page.tsx               # OTP input: 6-box, resend timer
│   │   ├── (app)/                         # Authenticated route group
│   │   │   ├── dashboard/
│   │   │   │   └── page.tsx               # Source library: list, upload, delete
│   │   │   └── chat/
│   │   │       └── page.tsx               # Chat interface with SSE streaming
│   │   ├── api/
│   │   │   ├── auth/
│   │   │   │   ├── [...nextauth]/
│   │   │   │   │   └── route.ts           # NextAuth handler (GET + POST)
│   │   │   │   ├── register/
│   │   │   │   │   └── route.ts           # Validate → pending user → send OTP
│   │   │   │   ├── verify-otp/
│   │   │   │   │   └── route.ts           # Verify OTP → create MongoDB user
│   │   │   │   └── resend-otp/
│   │   │   │       └── route.ts           # Rate-limited OTP resend
│   │   │   ├── sources/
│   │   │   │   └── route.ts               # GET: list | DELETE: remove + vector cleanup
│   │   │   ├── ingest/
│   │   │   │   └── route.ts               # POST: run full ingestion pipeline
│   │   │   └── chat/
│   │   │       └── route.ts               # POST: RAG pipeline → SSE stream
│   │   ├── layout.tsx                     # Root layout, SessionProvider
│   │   └── page.tsx                       # Landing → redirect to /dashboard
│   │
│   ├── lib/
│   │   ├── auth/
│   │   │   ├── config.ts                  # NextAuth: providers, callbacks, JWT strategy
│   │   │   ├── otp.ts                     # sendOtp, verifyOtp, rate limiting
│   │   │   └── validation.ts              # Zod: RegisterSchema, LoginSchema, OtpSchema
│   │   ├── db/
│   │   │   └── mongodb.ts                 # Mongoose connection with hot-reload cache
│   │   ├── redis/
│   │   │   └── client.ts                  # Upstash Redis singleton
│   │   ├── ingestion/
│   │   │   ├── loaders.ts                 # PDF, DOCX, text, YouTube, website extractors
│   │   │   ├── chunker.ts                 # RecursiveCharacterTextSplitter wrapper
│   │   │   └── embedder.ts                # Gemini text-embedding-004, batched 20/call
│   │   ├── retrieval/
│   │   │   ├── hyde.ts                    # Hypothetical Document Embedding
│   │   │   ├── multiquery.ts              # 3 query variants → retrieve → deduplicate
│   │   │   └── retrieve.ts                # Main orchestrator: all RAG steps
│   │   └── vector/
│   │       └── client.ts                  # Upstash Vector: upsert, query, delete
│   │
│   ├── models/
│   │   ├── User.ts                        # name, email, password, githubId, isVerified
│   │   ├── Source.ts                      # userId, type, title, url, status, chunkCount
│   │   └── ChatHistory.ts                 # userId, messages[], usedRAG, sources
│   │
│   ├── components/
│   │   ├── layout/
│   │   │   └── Navbar.tsx                 # Logo, user avatar, sign out
│   │   ├── sources/
│   │   │   ├── DropZone.tsx               # Drag-and-drop + URL/text input tabs
│   │   │   └── SourceCard.tsx             # Title, type badge, status pill, delete button
│   │   └── chat/
│   │       └── ChatWindow.tsx             # Message list, input, SSE consumer, RAG badge
│   │
│   ├── types/
│   │   └── next-auth.d.ts                 # Augments Session + JWT with user.id
│   │
│   └── middleware.ts                      # Protects app routes, redirects to /login
│
├── .env.local                             # All secrets (never commit)
├── .env.example                           # Template with all keys, no values
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

---

## Module Reference

### `lib/auth/config.ts`
NextAuth configuration. Providers: GitHub OAuth, Credentials (email+password). Callbacks: `signIn` auto-creates GitHub users with `isVerified: true`. `jwt` callback enriches token with MongoDB `_id`. `session` callback exposes `user.id` to the client. Credentials provider throws `EMAIL_NOT_VERIFIED` if `isVerified: false`, and `INVALID_CREDENTIALS` for wrong password. Session strategy: JWT (no database sessions — compatible with Vercel serverless).

### `lib/auth/otp.ts`
Full OTP lifecycle.
- `sendOtp(email)` — generates 6-digit OTP, stores `{otp, attempts: 0}` in Redis with 10-min TTL, enforces 3-sends-per-hour rate limit per email, sends via Resend.
- `verifyOtp(email, inputOtp)` — fetches from Redis, enforces 5-attempt brute-force limit (increments `attempts` counter on each wrong attempt, deletes key after max attempts or on success).

### `lib/ingestion/loaders.ts`
Per-type text extractors. Each returns `{ text: string, title: string }`.
- `loadPdf(buffer)` — pdf-parse
- `loadDocx(buffer)` — mammoth
- `loadText(text, title)` — passthrough
- `loadYoutube(url)` — youtubei.js transcript fetch, title from video metadata
- `loadWebsite(url)` — axios GET + cheerio text extraction

### `lib/ingestion/chunker.ts`
Wraps `@langchain/textsplitters` `RecursiveCharacterTextSplitter`. Config: `chunkSize: 512`, `chunkOverlap: 50`, separators `["\n\n", "\n", " ", ""]`. Returns `string[]`.

### `lib/ingestion/embedder.ts`
Calls Gemini `text-embedding-004` in batches of 20. Returns `number[][]` (768-dim vector per chunk). Handles API rate limiting with retry on 429.

### `lib/vector/client.ts`
Thin wrapper around `@upstash/vector`.
- `upsertChunks(userId, chunks[])` — batch upsert, namespace = userId
- `queryVector(userId, vector, topK)` — semantic search within namespace
- `deleteBySourceId(userId, sourceId)` — filter-delete all chunks for a source using payload filter

### `lib/retrieval/hyde.ts`
HyDE (Hypothetical Document Embeddings). Prompts Gemini to generate a short passage that would answer the query. Embeds that passage — not the query. Rationale: document-like text embeds closer to stored document chunks than a short interrogative question does.

### `lib/retrieval/multiquery.ts`
Generates 3 semantically distinct rephrasings of the user query via Gemini. Embeds each independently. Retrieves top-5 results per variant from Upstash. Returns merged, deduplicated list sorted by score.

### `lib/retrieval/retrieve.ts`
Main RAG orchestrator. Runs all 6 steps in sequence: query translation → HyDE → multi-query → merge/deduplicate → relevance gate → stream generation. Saves result to MongoDB ChatHistory after streaming completes.

---

## Database Schemas

### MongoDB — User
```typescript
{
  _id:        ObjectId,
  name:       string,
  email:      string,          // unique, indexed
  password:   string | null,   // bcrypt hash; null for OAuth users
  image:      string | null,   // avatar from GitHub
  githubId:   string | null,
  isVerified: boolean,         // false until OTP verified; GitHub = true by default
  createdAt:  Date,
  updatedAt:  Date
}
```

### MongoDB — Source
```typescript
{
  _id:        ObjectId,
  userId:     string,          // ref User._id, indexed
  type:       "pdf" | "docx" | "text" | "youtube" | "website",
  title:      string,
  url:        string | null,   // youtube + website types
  filename:   string | null,   // file upload types
  status:     "pending" | "processing" | "ready" | "failed",
  chunkCount: number,          // populated after ingestion
  createdAt:  Date,
  updatedAt:  Date
}
```

### MongoDB — ChatHistory
```typescript
{
  _id:      ObjectId,
  userId:   string,            // unique — one history per user
  messages: Array<{
    role:      "user" | "assistant",
    content:   string,
    sources:   string[],       // sourceIds used (for citation UI)
    usedRAG:   boolean,
    createdAt: Date
  }>,
  updatedAt: Date
}
```

### Upstash Vector — Chunk
```typescript
{
  id:        string,           // "{sourceId}-{chunkIndex}"
  vector:    number[],         // 768-dim, Gemini text-embedding-004
  namespace: string,           // userId — enforces isolation
  payload: {
    chunkText:  string,        // raw text, returned with search results
    sourceId:   string,        // MongoDB Source._id
    title:      string,        // source title for citation display
    type:       string,
    chunkIndex: number
  }
}
```

---

## API Reference

### Auth Routes

| Method | Path | Auth | Body | Response |
|---|---|---|---|---|
| POST | `/api/auth/register` | None | `{ name, email, password }` | `{ success, email }` |
| POST | `/api/auth/verify-otp` | None | `{ email, otp }` | `{ success }` |
| POST | `/api/auth/resend-otp` | None | `{ email }` | `{ success }` |
| GET/POST | `/api/auth/[...nextauth]` | — | NextAuth handler | — |

### Sources Routes

| Method | Path | Auth | Body | Response |
|---|---|---|---|---|
| GET | `/api/sources` | Required | — | `{ sources: ISource[] }` |
| DELETE | `/api/sources` | Required | `{ sourceId: string }` | `{ success }` |

### Ingest Route

| Method | Path | Auth | Body | Response |
|---|---|---|---|---|
| POST | `/api/ingest` | Required | multipart or JSON (see below) | `{ sourceId, chunkCount }` |

Ingest body variants:
```typescript
// File (multipart/form-data)
{ file: File, type: "pdf" | "docx" }

// Text paste (application/json)
{ type: "text", title: string, content: string }

// URL-based (application/json)
{ type: "youtube" | "website", url: string }
```

### Chat Route

| Method | Path | Auth | Body | Response |
|---|---|---|---|---|
| POST | `/api/chat` | Required | `{ message: string }` | SSE stream |

SSE event format:
```typescript
data: { type: "chunk",  content: string }          // streamed token
data: { type: "done",   usedRAG: boolean, sources: string[] }
data: { type: "error",  message: string }
```

---

## Environment Variables

```bash
# ── Application ──────────────────────────────────────────────
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=                    # openssl rand -base64 32

# ── GitHub OAuth ─────────────────────────────────────────────
# github.com/settings/developers → New OAuth App
# Callback: {NEXTAUTH_URL}/api/auth/callback/github
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=

# ── MongoDB Atlas ─────────────────────────────────────────────
# mongodb.com/atlas → free cluster → Connect → Drivers
MONGODB_URI=

# ── Upstash Redis ─────────────────────────────────────────────
# console.upstash.com → Redis → Create Database → REST API tab
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=

# ── Upstash Vector ────────────────────────────────────────────
# console.upstash.com → Vector → Create Index
# Dimensions: 768  |  Metric: Cosine
UPSTASH_VECTOR_REST_URL=
UPSTASH_VECTOR_REST_TOKEN=

# ── Google Gemini ─────────────────────────────────────────────
# aistudio.google.com → Get API Key
# Used: text-embedding-004 (ingestion) + gemini-2.0-flash (generation)
GEMINI_API_KEY=

# ── Resend ────────────────────────────────────────────────────
# resend.com → API Keys (verify sending domain first)
RESEND_API_KEY=
RESEND_FROM_EMAIL=noreply@yourdomain.com
```

---

## Auth Flow

### GitHub OAuth
```
Click "Continue with GitHub"
  → NextAuth → GitHub OAuth
  → signIn callback: find or create User { isVerified: true }
  → JWT issued with MongoDB _id
  → Redirect to /dashboard
```

### Email Signup with OTP
```
POST /api/auth/register { name, email, password }
  → Zod validation
  → Check no verified user exists with this email
  → bcrypt.hash(password, 12)
  → Redis SET pending:user:{email} { name, email, hashedPw }  TTL 15min
  → sendOtp(email):
      → Redis INCR otp:rate:{email}  (max 3 per hour)
      → Generate 6-digit OTP
      → Redis SET otp:code:{email} { otp, attempts: 0 }  TTL 10min
      → Resend → send OTP email
  → Client redirects to /verify-email?email=...

POST /api/auth/verify-otp { email, otp }
  → verifyOtp(email, otp):
      → Redis GET otp:code:{email}
      → Check attempts < 5
      → Compare OTP
      → Mismatch: increment attempts, return remaining count
      → Match: Redis DEL otp:code:{email}
  → Redis GET pending:user:{email}
  → MongoDB User.findOneAndUpdate { isVerified: true } upsert
  → Redis DEL pending:user:{email}
  → Client redirects to /login?verified=true
```

### Email Login
```
POST credentials { email, password }
  → Find user by email
  → isVerified === false → throw EMAIL_NOT_VERIFIED
  → bcrypt.compare → mismatch → throw INVALID_CREDENTIALS
  → Return user → JWT issued → /dashboard
```

---

## Ingestion Pipeline

```
Source type detection
  ├── PDF / DOCX  → read file as Buffer  → loader returns { text, title }
  ├── Plain text  → direct              → loader returns { text, title }
  ├── YouTube URL → fetch transcript    → loader returns { text, title }
  └── Website URL → fetch + parse HTML  → loader returns { text, title }
         │
         ▼
    chunker.ts
    RecursiveCharacterTextSplitter
    chunkSize: 512  |  chunkOverlap: 50
    → string[] (N chunks)
         │
         ▼
    embedder.ts
    Gemini text-embedding-004
    Batched 20 chunks/call
    → number[][] (N × 768)
         │
         ▼
    vector/client.ts  upsertChunks()
    namespace: userId
    id: {sourceId}-{chunkIndex}
    payload: { chunkText, sourceId, title, type, chunkIndex }
         │
         ▼
    MongoDB Source { status: "ready", chunkCount: N }
```

---

## RAG Query Pipeline

```
User query: "What is the main argument in chapter 3?"
         │
         ▼
Step 1 — Query Translation
  Prompt Gemini to rewrite for retrieval
  "chapter 3 main argument thesis claim"
         │
         ▼
Step 2 — HyDE
  Prompt: "Write a passage answering: {translated query}"
  Embed hypothetical answer → vectorA
  Upstash query(namespace=userId, vectorA, topK=5)
  → hyde_chunks[]
         │
         ▼
Step 3 — Multi-Query
  Prompt: "Give 3 rephrasings of: {original query}"
  Embed each → vectorB1, B2, B3
  Query each → results deduplicated
  → multi_chunks[]
         │
         ▼
Step 4 — Merge + Deduplicate
  Combine hyde_chunks + multi_chunks
  Deduplicate by chunk id
  Sort by score desc → take top 6
         │
         ▼
Step 5 — Relevance Gate
  top_score < 0.75 → usedRAG = false, skip context
  top_score ≥ 0.75 → usedRAG = true, use chunks
         │
         ▼
Step 6 — Stream Response
  System: "Answer using the provided context. Cite sources."
  Context: top chunks with source titles
  History: last 6 messages from ChatHistory
  Query: original user message
  → Gemini gemini-2.0-flash stream → SSE to client
         │
         ▼
  MongoDB ChatHistory.push { role, content, usedRAG, sources }
```

---

## Redis Key Schema

| Key | Type | Value | TTL | Purpose |
|---|---|---|---|---|
| `otp:code:{email}` | JSON string | `{ otp, attempts }` | 10 min | Active OTP code + brute-force counter |
| `otp:rate:{email}` | Integer | Send count (max 3) | 1 hour | Per-email OTP send rate limit |
| `pending:user:{email}` | JSON string | `{ name, email, password }` | 15 min | Pre-verification user data buffer |

---

## Upstash Vector Schema

**Index config:** Dimensions = 768, Metric = Cosine

**Namespace strategy:** One namespace per `userId`. All queries are scoped to the caller's namespace — users never retrieve each other's content.

**Vector ID format:** `{sourceId}-{chunkIndex}` — enables efficient deletion of all chunks for a source by ID prefix filter.

**Payload fields:**
```typescript
{
  chunkText:  string,    // raw chunk text (returned in search results for context)
  sourceId:   string,    // links back to MongoDB Source document
  title:      string,    // shown in citation UI
  type:       string,    // pdf | docx | text | youtube | website
  chunkIndex: number     // ordering within original document
}
```

---

## Deployment

### Vercel

```bash
npm i -g vercel
vercel
```

Set all `.env.local` variables in Vercel dashboard under Project → Settings → Environment Variables. Then:
- Set `NEXTAUTH_URL` to your production domain
- Update GitHub OAuth app callback URL to `https://your-domain.vercel.app/api/auth/callback/github`
- MongoDB Atlas: allow all IPs (`0.0.0.0/0`) under Network Access
- Upstash services are HTTP-based — work natively in Vercel serverless with no extra config

### Free Tier Limits

| Service | Free Limit | Notes |
|---|---|---|
| Vercel | 100GB bandwidth/mo | Sufficient for personal use |
| MongoDB Atlas | 512MB storage | ~50MB per 10K sources |
| Upstash Redis | 10K commands/day, 256MB | ~5 ops per signup |
| Upstash Vector | 10K queries+updates/day | ~5 ops per chunk ingested, ~4 per query |
| Gemini API | 1500 embed req/min, 15 gen req/min | Sufficient for personal use |
| Resend | 3000 emails/month | Sufficient |

---

## Development Setup

```bash
# 1. Clone and install
git clone https://github.com/yourusername/brain-dump
cd brain-dump
npm install

# 2. Environment
cp .env.example .env.local
# Fill all values — see Environment Variables section above

# 3. External services required before first run:
#    MongoDB Atlas   → free cluster → connection string
#    Upstash Redis   → create database → REST URL + token
#    Upstash Vector  → create index (768 dims, Cosine) → REST URL + token
#    GitHub OAuth    → github.com/settings/developers → new OAuth app
#    Resend          → verify domain → create API key
#    Google AI       → aistudio.google.com → get API key

# 4. Run
npm run dev
# Open http://localhost:3000
```

**Dev notes:**
- MongoDB connection is cached in `global` to survive Next.js hot reloads in dev
- Upstash clients are module-level singletons
- All API routes run Zod validation before any DB or Redis operations
- Middleware protects `/dashboard`, `/chat`, `/api/sources`, `/api/chat`, `/api/ingest` — unauthenticated requests redirect to `/login`
- SSE streaming uses `ReadableStream` with `TransformStream` — no external streaming library needed

---

## Current Development Phase

| Phase | Description | Status |
|---|---|---|
| 1 | Project setup, folder structure, dependencies | ✅ Complete |
| 2 | Auth — NextAuth + OTP email verification + GitHub OAuth | ✅ Complete |
| 3 | MongoDB models + Mongoose connection | ✅ Complete |
| 4 | Ingestion pipeline — loaders, chunker, embedder, vector upsert | 🔄 In Progress |
| 5 | RAG query pipeline — HyDE, multi-query, relevance gating, streaming | ⏳ Pending |
| 6 | Chat UI — SSE consumer, message list, RAG source badges | ⏳ Pending |
| 7 | Dashboard UI — DropZone, SourceCard, source management | ⏳ Pending |
| 8 | Vercel deployment + production env setup | ⏳ Pending |

---

*Built by Avnish — learning Agentic AI and RAG pipeline internals, 2025*