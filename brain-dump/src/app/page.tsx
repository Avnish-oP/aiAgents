import Link from "next/link";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import {
  ArrowRight,
  Brain,
  FileText,
  Layers3,
  MessageSquareText,
  Search,
  ShieldCheck,
  Sparkles,
  UploadCloud,
} from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";

const features = [
  {
    icon: UploadCloud,
    title: "Import without cleanup",
    description:
      "Bring in PDFs, articles, notes, and transcripts without building a folder system first.",
  },
  {
    icon: Search,
    title: "Ask across everything",
    description:
      "Retrieve the relevant context from your saved sources and get a grounded answer back.",
  },
  {
    icon: ShieldCheck,
    title: "Keep sources visible",
    description:
      "Answers stay connected to the material they came from so important claims are easy to verify.",
  },
];

function Logo() {
  return (
    <div className="flex items-center gap-2.5">
      <div className="flex size-8 items-center justify-center rounded-md bg-[var(--app-brand)] text-[var(--app-brand-text)]">
        <Brain className="size-4" />
      </div>
      <span className="text-base font-semibold tracking-tight text-[var(--app-text)]">
        Brain Dump
      </span>
    </div>
  );
}

function ProductPreview() {
  return (
    <div className="pointer-events-none absolute inset-y-20 right-0 z-0 hidden w-[48%] min-w-[560px] overflow-hidden rounded-l-2xl border border-[var(--app-border)] bg-[var(--app-elevated)] shadow-[var(--app-shadow)] xl:block">
      <div className="flex h-12 items-center justify-between border-b border-[var(--app-border)] bg-[var(--app-panel-soft)] px-5">
        <div className="flex items-center gap-2">
          <span className="size-2 rounded-full bg-[#d66f5d]" />
          <span className="size-2 rounded-full bg-[#d5a64f]" />
          <span className="size-2 rounded-full bg-[#6f9f82]" />
        </div>
        <div className="rounded-full border border-[var(--app-border)] bg-[var(--app-panel)] px-3 py-1 text-xs text-[var(--app-muted)]">
          Knowledge workspace
        </div>
      </div>
      <div className="grid h-[520px] grid-cols-[230px_1fr]">
        <aside className="border-r border-[var(--app-border)] bg-[var(--app-panel-soft)] p-4">
          <button className="mb-4 flex w-full items-center justify-center gap-2 rounded-md bg-[var(--app-brand)] px-3 py-2 text-sm font-medium text-[var(--app-brand-text)]">
            <UploadCloud className="size-4" />
            Add source
          </button>
          <div className="space-y-2">
            {["Research notes", "Product docs", "Video transcripts"].map(
              (label, index) => (
                <div
                  key={label}
                  className={`rounded-md border px-3 py-3 ${
                    index === 0
                      ? "border-[var(--app-border-strong)] bg-[var(--app-panel)]"
                      : "border-transparent bg-transparent"
                  }`}
                >
                  <div className="flex items-center gap-2 text-sm font-medium text-[var(--app-text)]">
                    <FileText className="size-4 text-[var(--app-accent)]" />
                    {label}
                  </div>
                  <div className="mt-2 h-1.5 w-24 rounded-full bg-[var(--app-border)]" />
                </div>
              ),
            )}
          </div>
        </aside>
        <div className="flex flex-col">
          <div className="border-b border-[var(--app-border)] px-6 py-5">
            <div className="flex items-center gap-2 text-sm font-medium text-[var(--app-accent)]">
              <Sparkles className="size-4" />
              RAG answer
            </div>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-[var(--app-text)]">
              What changed in the latest customer research?
            </h2>
          </div>
          <div className="flex-1 space-y-5 p-6">
            <div className="max-w-[78%] rounded-lg bg-[var(--app-panel-soft)] px-4 py-3 text-sm text-[var(--app-text)]">
              Compare the interview notes with the onboarding transcript.
            </div>
            <div className="max-w-[86%] space-y-3 rounded-lg border border-[var(--app-border)] bg-[var(--app-panel)] p-4 text-sm leading-6 text-[var(--app-text)]">
              <p>
                Three themes appear consistently: setup friction, unclear
                source coverage, and a need for short cited summaries.
              </p>
              <div className="grid grid-cols-3 gap-2 pt-1">
                {["Interview notes", "Onboarding call", "Support log"].map(
                  (label) => (
                    <div
                      key={label}
                      className="rounded-md border border-[var(--app-border)] bg-[var(--app-panel-soft)] px-2 py-2 text-xs text-[var(--app-muted)]"
                    >
                      {label}
                    </div>
                  ),
                )}
              </div>
            </div>
            <div className="rounded-lg border border-[var(--app-border)] bg-[var(--app-elevated)] p-3">
              <div className="flex items-center gap-2 rounded-md border border-[var(--app-border)] bg-[var(--app-panel)] px-3 py-3 text-sm text-[var(--app-subtle)]">
                <MessageSquareText className="size-4" />
                Ask a follow-up about your sources...
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default async function LandingPage() {
  const session = await auth();
  if (session?.user) {
    redirect("/chat");
  }

  return (
    <div className="min-h-screen bg-[var(--app-bg)] text-[var(--app-text)]">
      <header className="sticky top-0 z-50 border-b border-[var(--app-border)] bg-[color-mix(in_srgb,var(--app-bg)_90%,transparent)] backdrop-blur">
        <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5 md:px-8">
          <Logo />
          <div className="hidden items-center gap-7 text-sm text-[var(--app-muted)] md:flex">
            <a href="#workflow" className="hover:text-[var(--app-text)]">
              Workflow
            </a>
            <a href="#sources" className="hover:text-[var(--app-text)]">
              Sources
            </a>
            <a href="#security" className="hover:text-[var(--app-text)]">
              Security
            </a>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Link
              href="/login"
              className="hidden rounded-md px-3 py-2 text-sm font-medium text-[var(--app-muted)] hover:bg-[var(--app-panel-soft)] sm:inline-flex"
            >
              Sign in
            </Link>
            <Link
              href="/register"
              className="inline-flex items-center gap-2 rounded-md bg-[var(--app-brand)] px-4 py-2 text-sm font-semibold text-[var(--app-brand-text)] shadow-sm hover:bg-[var(--app-brand-hover)]"
            >
              Get started
              <ArrowRight className="size-4" />
            </Link>
          </div>
        </nav>
      </header>

      <main>
        <section className="relative isolate min-h-[calc(100vh-4rem)] overflow-hidden border-b border-[var(--app-border)]">
          <ProductPreview />
          <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-6xl items-center px-5 py-16 md:px-8">
            <div className="relative z-10 max-w-2xl xl:max-w-xl">
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[var(--app-border)] bg-[var(--app-panel)] px-3 py-1.5 text-sm font-medium text-[var(--app-accent)]">
                <Sparkles className="size-4" />
                Personal knowledge, made searchable
              </div>
              <h1 className="max-w-2xl text-5xl font-semibold tracking-tight text-[var(--app-text)] sm:text-6xl lg:text-7xl xl:text-6xl">
                Brain Dump turns scattered sources into clear answers.
              </h1>
              <p className="mt-6 max-w-xl text-lg leading-8 text-[var(--app-muted)]">
                Upload what you read, watch, and collect. Ask questions in plain
                language and get concise responses with source context close at
                hand.
              </p>
              <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/register"
                  className="inline-flex items-center justify-center gap-2 rounded-md bg-[var(--app-brand)] px-5 py-3 text-sm font-semibold text-[var(--app-brand-text)] shadow-sm hover:bg-[var(--app-brand-hover)]"
                >
                  Start your workspace
                  <ArrowRight className="size-4" />
                </Link>
                <Link
                  href="/login"
                  className="inline-flex items-center justify-center rounded-md border border-[var(--app-border)] bg-[var(--app-panel)] px-5 py-3 text-sm font-semibold text-[var(--app-text)] hover:bg-[var(--app-panel-soft)]"
                >
                  Sign in
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section
          id="workflow"
          className="mx-auto grid max-w-6xl gap-4 px-5 py-20 md:grid-cols-3 md:px-8"
        >
          {features.map((feature) => (
            <div
              key={feature.title}
              className="rounded-lg border border-[var(--app-border)] bg-[var(--app-panel)] p-6 shadow-[var(--app-shadow)]"
            >
              <div className="mb-5 flex size-10 items-center justify-center rounded-md bg-[var(--app-panel-soft)] text-[var(--app-accent)]">
                <feature.icon className="size-5" />
              </div>
              <h2 className="text-lg font-semibold tracking-tight text-[var(--app-text)]">
                {feature.title}
              </h2>
              <p className="mt-3 text-sm leading-6 text-[var(--app-muted)]">
                {feature.description}
              </p>
            </div>
          ))}
        </section>

        <section
          id="sources"
          className="border-y border-[var(--app-border)] bg-[var(--app-panel-soft)] px-5 py-20 md:px-8"
        >
          <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
            <div>
              <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-[var(--app-accent)]">
                <Layers3 className="size-4" />
                Organized by meaning
              </div>
              <h2 className="text-3xl font-semibold tracking-tight text-[var(--app-text)] md:text-4xl">
                Keep the workflow quiet, even when the source library grows.
              </h2>
              <p className="mt-5 text-base leading-7 text-[var(--app-muted)]">
                The interface is built for repeated use: calm surfaces,
                readable answers, quick source checks, and fewer decorative
                distractions.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                ["PDFs", "Research papers and reports"],
                ["Videos", "Transcripts from learning material"],
                ["Web pages", "Articles, docs, and references"],
                ["Notes", "Personal memos and project context"],
              ].map(([title, body]) => (
                <div
                  key={title}
                  className="rounded-lg border border-[var(--app-border)] bg-[var(--app-elevated)] p-5"
                >
                  <div className="text-sm font-semibold text-[var(--app-text)]">
                    {title}
                  </div>
                  <div className="mt-2 text-sm text-[var(--app-muted)]">{body}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section
          id="security"
          className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-8 px-5 py-20 md:flex-row md:items-center md:px-8"
        >
          <div className="max-w-2xl">
            <h2 className="text-3xl font-semibold tracking-tight text-[var(--app-text)] md:text-4xl">
              A focused place for the material you actually use.
            </h2>
            <p className="mt-4 text-base leading-7 text-[var(--app-muted)]">
              Brain Dump keeps ingestion, retrieval, and chat in one flow so
              your knowledge base feels practical instead of ceremonial.
            </p>
          </div>
          <Link
            href="/register"
            className="inline-flex items-center justify-center gap-2 rounded-md bg-[var(--app-brand)] px-5 py-3 text-sm font-semibold text-[var(--app-brand-text)] shadow-sm hover:bg-[var(--app-brand-hover)]"
          >
            Create account
            <ArrowRight className="size-4" />
          </Link>
        </section>
      </main>

      <footer className="border-t border-[var(--app-border)] bg-[var(--app-panel)]">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-5 py-8 text-sm text-[var(--app-muted)] md:flex-row md:items-center md:justify-between md:px-8">
          <Logo />
          <p>© 2026 Brain Dump AI. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
