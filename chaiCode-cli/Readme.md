# 🤖 WebCloner Agent

A CLI-based autonomous AI agent that clones websites — built as a learning project while exploring **Agentic AI** concepts. The agent reasons step-by-step, picks the right tools, downloads all assets, and saves a fully working local copy of any website.

---

## What This Is

This is a fun side project I built while learning how AI agents actually work under the hood. Instead of just calling an LLM and getting a response, the agent follows a structured reasoning loop — it _thinks_, _acts_, _observes_, and _repeats_ until the job is done. The task I gave it: clone any website, completely, including all images, CSS, JS, fonts, and videos.

---

## Demo

```bash
$ node index.js

AI Agent Started
Type "exit" to quit

You: clone https://chaicode.com

THINKING: This is a JS-heavy site, I should use CLONE_WEBSITE tool.
TOOL: CLONE_WEBSITE
Input: https://chaicode.com|./cloned-chaicode

⚙️  JS-heavy site detected → using Puppeteer (full render)
Downloading 84 assets...

FINAL OUTPUT: Site successfully cloned to ./cloned-chaicode. Open index.html in a browser.
```

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        index.js (Agent Loop)                 │
│                                                             │
│   User Input → History → Gemini API → Parse JSON Steps      │
│                              ↓                              │
│              START → THINKING → TOOL → OBSERVATION          │
│                          ↑__________________________|       │
│                     (loop until OUTPUT)                     │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                        scrapper.js (Tools)                   │
│                                                             │
│   detectNeedsJS()                                           │
│       ├── Static site?  → cloneStatic()   (axios + cheerio) │
│       └── JS-heavy SPA? → clonePuppeteer() (headless chrome)│
│                              ↓                              │
│   collectAssets() → downloadAsset() x N (parallel)          │
│       ↓                                                     │
│   rewriteHtml() → save index.html + assets/                 │
└─────────────────────────────────────────────────────────────┘
```

### Agent Reasoning Loop

The agent follows a strict **ReAct-style** (Reason + Act) workflow:

```
START → THINKING → TOOL → OBSERVATION → THINKING → ... → OUTPUT
```

Each step is a JSON object the LLM emits. The agent runner parses them sequentially and decides what to do:

| Step          | What happens                                                      |
| ------------- | ----------------------------------------------------------------- |
| `START`       | Agent acknowledges the task                                       |
| `THINKING`    | Agent reasons about the next action                               |
| `TOOL`        | Agent calls a tool (CLONE_WEBSITE, SAVE_TO_FILE, EXECUTE_COMMAND) |
| `OBSERVATION` | Tool result is fed back into the conversation history             |
| `OUTPUT`      | Agent declares the task complete                                  |

This loop runs up to 8 iterations before giving up — preventing infinite loops.

### Scraper: Two-Path Cloning

The scraper auto-detects what kind of site it's dealing with and picks the right strategy:

**Path A — Static Fetch** (fast, ~2–5 seconds)

Used for traditional server-rendered sites (plain HTML, WordPress, etc.).

```
axios.get(url) → cheerio.load(html) → collect assets → download → rewrite URLs → save
```

**Path B — Puppeteer Render** (thorough, ~15–30 seconds)

Used for JS-heavy SPAs: Next.js, Nuxt, React, Vue. The raw HTML from these sites is nearly empty — all content is injected by JavaScript at runtime.

```
puppeteer.launch() → page.goto(url, { waitUntil: 'networkidle2' })
    → scroll page (trigger lazy images)
    → intercept all network requests (captures JS-injected assets)
    → page.content() (fully rendered DOM)
    → same asset pipeline as Path A
```

**Auto-detection logic:**

```js
// If the raw HTML has Next.js/_nuxt/webpack chunk patterns
// OR the body text is under 200 characters → needs Puppeteer
const hasJsBundles = JS_HEAVY_PATTERNS.some((p) => p.test(html));
const bodyIsEmpty = bodyText.length < 200;
return hasJsBundles || bodyIsEmpty;
```

### Asset Pipeline

```
Discover                      Download (parallel)         Rewrite
────────                      ───────────────────         ───────
img[src]                  ┐                           ┐
img[srcset]               │                           │
img[data-src]             │   Promise.allSettled()    │  rewrite all
link[rel=stylesheet]      ├─► downloadAsset() x N ───┤  src/href/srcset/
link[rel*=icon]           │   (arraybuffer, 80MB cap) │  style="" / <style>
script[src]               │                           │  blocks to relative
video/audio source        │                           │  local paths
inline style url()        │                           │
<style> block url()       │                           │
CSS @import / url()       ┘                           ┘
network-intercepted URLs
(Puppeteer path only)
```

Key decisions in the asset pipeline:

- **`Promise.allSettled`** — one broken asset never kills the whole clone
- **Full path preservation** — `_next/static/css/abc.css` saves as `assets/_next/static/css/abc.css`, avoiding filename collisions
- **CSS deep-parsing** — each downloaded CSS file is re-fetched as text and scanned for nested `url()` and `@import` references (catches fonts, background images loaded by stylesheets)
- **`<base>` tag removal** — the original code injected a `<base href="...">` which caused the browser to fetch everything from the live site. Now it's stripped entirely.
- **No data: or blob: URLs** — filtered out before downloading since they're already inline

---

## Project Structure

```
websitecloner-agent/
├── index.js          # Agent runner — Gemini loop, tool dispatch, history management
├── scrapper.js       # Scraping tool — static + Puppeteer paths, asset pipeline
├── .env              # GEMINI_API_KEY=...
├── package.json
└── cloned-output/    # Default output directory
    ├── index.html
    └── assets/
        ├── _next/static/css/
        ├── _next/static/js/
        ├── images/
        └── fonts/
```

---

## Available Agent Tools

| Tool              | Input format        | What it does                                                        |
| ----------------- | ------------------- | ------------------------------------------------------------------- |
| `CLONE_WEBSITE`   | `url\|output_dir`   | Full clone — detects site type, downloads all assets, rewrites URLs |
| `SAVE_TO_FILE`    | `filename\|content` | Writes any text/code to disk                                        |
| `EXECUTE_COMMAND` | `shell command`     | Runs a shell command and returns stdout                             |

---

## Setup

**Prerequisites:** Node.js 18+

```bash
# Clone the repo
git clone https://github.com/yourusername/websitecloner-agent
cd websitecloner-agent

# Install dependencies
npm install

# Add your Gemini API key
echo "GEMINI_API_KEY=your_key_here" > .env

# Run
node index.js
```

**Dependencies:**

```json
{
  "@google/genai": "latest",
  "axios": "latest",
  "cheerio": "latest",
  "puppeteer": "latest",
  "dotenv": "latest"
}
```

---

## Known Limitations

- **Authentication-gated pages** — sites behind login walls won't clone correctly since neither axios nor Puppeteer has your session cookies
- **Canvas/WebGL content** — dynamically rendered canvas elements are not captured
- **Infinite scroll** — the scroll simulation covers one full page height; content loaded after many scrolls may be missed
- **CORS-blocked assets** — some CDN assets block non-browser requests; these are silently skipped and fall back to the live URL via the `<base>` ... actually, `<base>` is stripped, so these will be broken in the local copy. A future fix would be to detect and log them.
- **Rate limiting** — no delay between asset downloads; aggressive sites may throttle or block

---

## What I Learned

This project was my first hands-on dive into building an actual AI agent — not just prompting an LLM, but making it _do things_ in the real world. Here's what clicked:

**ReAct pattern (Reason + Act)**
Before this I'd read about ReAct but didn't fully get why it mattered. Implementing it myself made it obvious — without forcing the model to _think before acting_, it would jump straight to a tool call with wrong inputs, or worse, declare victory before the job was done. The structured `THINKING → TOOL → OBSERVATION` loop keeps it honest.

**Conversation history is the agent's memory**
There's no magic state object. The agent "remembers" what it did because every tool result gets pushed back into the `history` array and re-sent to the model. The LLM's context window _is_ the working memory. This is both elegant and the reason agents have a limited horizon.

**JSON as a protocol between agent and runner**
Having the LLM emit structured JSON steps (instead of free text) made it trivial to parse actions and dispatch tool calls. The `parseJsonObjects` function that extracts multiple JSON objects from one response was a key insight — the model often emits a THINKING block and a TOOL block in the same response.

**Static HTML ≠ what you see in the browser**
This was the biggest surprise. I assumed fetching HTML and saving it would give you the page. It doesn't — not for modern frameworks. Cheerio on a Next.js site gives you a nearly empty body. You need a real browser runtime (Puppeteer) to execute the JavaScript and capture the rendered DOM. The auto-detection logic to decide which path to use was a fun challenge.

**Graceful failure is a feature**
`Promise.allSettled` instead of `Promise.all` was a deliberate decision. Real-world pages have broken asset links, CORS-blocked resources, and rate-limited CDNs. If one download fails and takes down the whole clone, the tool is useless. Skipping bad assets silently and continuing is the right default.

**Agents get stuck**
The `iteration > 8` guard exists because without it, a confused model will loop forever — re-running the same tool with the same input, convinced it needs more information. Knowing when to stop is as important as knowing what to do.

---

## What's Next

Things I want to add as I keep learning:

- [ ] Multi-page crawling — follow internal links up to a depth limit
- [ ] Puppeteer session injection — paste cookies to clone auth-gated pages
- [ ] Progress bar for asset downloads using `cli-progress`
- [ ] Swap Gemini for Claude or GPT-4o to compare reasoning quality
- [ ] MCP (Model Context Protocol) integration — expose the cloner as an MCP tool so any agent framework can use it

---

## Built With

- [Gemini 2.5 Flash](https://deepmind.google/technologies/gemini/) — the reasoning engine
- [Puppeteer](https://pptr.dev/) — headless Chrome for JS-heavy sites
- [Cheerio](https://cheerio.js.org/) — fast HTML parsing for static sites
- [Axios](https://axios-http.com/) — HTTP client for fetching assets

---

_Made while learning Agentic AI — Avnish, 2025_
