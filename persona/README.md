# 🗣️ Persona Chat — AI Conversations with Hitesh Choudhary & Piyush Garg

An AI-powered chat application that simulates conversations with two of India's most prominent tech educators — **Hitesh Choudhary** (Chai aur Code) and **Piyush Garg** (Teachyst). Built for the GenAI Cohort assignment.

![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)
![OpenRouter](https://img.shields.io/badge/OpenRouter-Free_API-green)
![Deploy](https://img.shields.io/badge/Deploy-Vercel-black?logo=vercel)

## ✨ Features

- 🤖 **Dual Persona Chat** — Switch between Hitesh Choudhary and Piyush Garg
- 🎯 **Authentic Persona Accuracy** — Captures speaking style, vocabulary, catchphrases, and teaching approach
- 🌊 **Streaming Responses** — Real-time token-by-token response rendering
- 🎨 **Premium Dark UI** — Glassmorphism design with persona-specific color themes
- 💻 **Markdown Support** — Code blocks with syntax highlighting and copy-to-clipboard
- 📱 **Fully Responsive** — Works great on desktop and mobile
- ⚡ **Hinglish Responses** — Natural mix of Hindi and English, just like the real personas
- 🔄 **Context-Aware** — Maintains conversation context across messages

---

## 🛠️ Tech Stack

| Technology | Purpose |
|---|---|
| **Next.js 16** | Full-stack React framework |
| **TypeScript** | Type safety |
| **Tailwind CSS 4** | Utility-first styling base |
| **OpenRouter API** | LLM access (free tier) |
| **Vercel** | Deployment |

---

## 🚀 Setup & Run Instructions

### Prerequisites
- Node.js 18+ installed
- An OpenRouter API key ([get one free](https://openrouter.ai/keys))

### 1. Clone the repository
```bash
git clone https://github.com/YOUR_USERNAME/persona-chat.git
cd persona-chat
```

### 2. Install dependencies
```bash
npm install
```

### 3. Configure environment variables
```bash
cp .env.example .env.local
```

Edit `.env.local` and add your OpenRouter API key:
```env
OPENROUTER_API_KEY=sk-or-v1-your-key-here
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 4. Run the development server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 5. Deploy to Vercel
```bash
npx vercel --prod
```

Or connect your GitHub repo to [vercel.com](https://vercel.com) for automatic deployments. Make sure to add `OPENROUTER_API_KEY` as an environment variable in your Vercel project settings.

---

## 📚 Documentation

### How Persona Data Was Collected and Prepared

Persona data was gathered from **publicly available sources** only:

| Source | Hitesh Choudhary | Piyush Garg |
|---|---|---|
| **Website** | hiteshchoudhary.com / hitesh.ai | piyushgarg.dev |
| **YouTube** | @chaborcode (1.8M+ subs) | @piyushgargdev |
| **Social Media** | Twitter, LinkedIn | Twitter, LinkedIn, Instagram |
| **Courses** | Udemy bestsellers, ChaiCode cohorts | Teachyst, ChaiCode cohorts |
| **Products** | ChaiCode platform | Teachyst, WisprType, Skyping |

**Key data points collected:**
- Speaking style and vocabulary patterns
- Signature catchphrases and expressions
- Teaching methodology and philosophy
- Professional background and experience
- Product and platform knowledge
- Community interaction patterns

### Prompt Engineering Strategy

The persona simulation uses **detailed system prompts** (~800-1000 words each) that encode:

1. **Identity Layer** — Name, role, background, affiliations
2. **Communication Style** — Tone, language (Hinglish), formality level
3. **Signature Phrases** — Natural catchphrases used organically (not forced)
4. **Teaching Approach** — How each persona explains concepts differently
5. **Knowledge Domain** — Expertise areas, products, and platforms
6. **Behavioral Rules** — Stay in character, never reveal AI nature, be encouraging

**Key prompt design decisions:**
- **Hinglish-flavored English**: Primarily English with natural Hindi phrases, matching how both educators actually speak
- **Distinct personalities**: Hitesh is warm/energetic/mentor-like with chai metaphors; Piyush is professional/calm/builder-focused
- **Temperature 0.8**: Slightly creative to allow personality variation while staying coherent
- **Max 1024 tokens**: Keeps responses conversational, not essay-length

### Context Management Approach

```
┌────────────────────────────────────────────┐
│  System Prompt (Persona Identity)          │  ← Always included, never trimmed
├────────────────────────────────────────────┤
│  Last 20 message pairs (user + assistant)  │  ← Sliding window for context
├────────────────────────────────────────────┤
│  Current user message                      │  ← Latest input
└────────────────────────────────────────────┘
```

- **System prompt stays constant** for the entire conversation
- **Conversation history** uses a sliding window of the last 20 messages to stay within free model token limits
- **Persona switching clears history** — fresh start with the new persona's system prompt
- **Streaming (SSE)** — Responses are streamed token-by-token via Server-Sent Events for real-time feedback

---

## 💬 Sample Conversations

### Hitesh Choudhary Persona

**User:** JavaScript mein closures kaise kaam karte hain?

**Hitesh (AI):** Arre wah, bohot accha sawaal hai! ☕ Chai peelo aur dhyan se suno.

Dekho, closure basically yeh hai — jab ek function apne bahar ke variables ko "yaad" rakh leta hai, even after the outer function has finished executing. It's like a backpack that a function carries around.

```javascript
function outerFunction() {
  let count = 0; // yeh variable closure mein reh jayega

  return function innerFunction() {
    count++;
    console.log(`Count: ${count}`);
  };
}

const counter = outerFunction();
counter(); // Count: 1
counter(); // Count: 2 — dekho, count yaad hai!
```

Samjhe? `innerFunction` ko `count` variable ka access hai even though `outerFunction` already return ho chuki hai. Yahi closure ka magic hai! 🔥

Real-world mein iska use hota hai — data privacy, factory functions, event handlers mein. Pehle ek chhota project banao isse use karke, phir aur deep samajh aa jayegi!

---

### Piyush Garg Persona

**User:** Docker seekhna hai, kahan se shuru karun?

**Piyush (AI):** Hey! 👋 Docker seekhna hai toh seedha practical approach chalte hain — theory se pehle hands-on.

Step by step karun:

1. **Docker Desktop install karo** — docker.com se download karo apne OS ke liye
2. **Basic commands seekho** — `docker run`, `docker build`, `docker ps`, `docker images`
3. **Ek simple Node.js app ko containerize karo** — this is where real learning starts

Here's a basic Dockerfile for a Node.js app:

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3000
CMD ["node", "server.js"]
```

Phir run karo:
```bash
docker build -t my-app .
docker run -p 3000:3000 my-app
```

4. **Docker Compose seekho** — multi-container apps ke liye (e.g., app + database)
5. **Production deployment** — AWS ECS ya Railway pe deploy karo

Bhai, main apne Teachyst platform mein bhi Docker extensively use karta hoon. Real-world mein aise hota hai — containers se deployment predictable ho jaata hai. 🚀

My YouTube pe Docker ka full series hai, check it out!

---

## 📁 Project Structure

```
persona/
├── src/
│   ├── app/
│   │   ├── api/chat/route.ts    # OpenRouter API proxy with streaming
│   │   ├── globals.css           # Complete design system (glassmorphism)
│   │   ├── layout.tsx            # Root layout with SEO metadata
│   │   └── page.tsx              # Main page composition
│   ├── components/
│   │   ├── ChatInterface.tsx     # Chat window with streaming & suggestions
│   │   ├── Header.tsx            # App header with persona info & socials
│   │   ├── MessageBubble.tsx     # Message rendering with markdown support
│   │   ├── PersonaSwitcher.tsx   # Persona selection cards
│   │   └── TypingIndicator.tsx   # Animated typing dots
│   ├── lib/
│   │   ├── constants.ts          # API config & limits
│   │   └── personas.ts          # Persona data & system prompts
│   └── types/
│       └── index.ts              # TypeScript interfaces
├── .env.example                  # Environment template
├── next.config.ts
├── package.json
├── tailwind.config.ts
└── README.md                     # This file
```

---

## 📊 Evaluation Coverage

| Parameter | How It's Addressed |
|---|---|
| **Persona Accuracy (30)** | Detailed system prompts with identity, catchphrases, teaching style. Hinglish responses. Distinct personalities. |
| **Conversation Quality (25)** | Context window of 20 messages. Streaming for responsiveness. Persona-consistent across long chats. |
| **Technical Implementation (25)** | Clean Next.js architecture. Server-side API route. SSE streaming. TypeScript throughout. Modular components. |
| **User Experience (20)** | Premium glassmorphism UI. Animated persona switching. Suggested questions. Code block copy. Mobile responsive. |

---

## 📄 License

MIT — Built with ☕ for the GenAI Cohort.
