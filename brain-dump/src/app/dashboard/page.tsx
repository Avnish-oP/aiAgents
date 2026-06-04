import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { connectDB } from "@/lib/mongodb";
import { Source, type ISource } from "@/models/Source";
import { UploadForm } from "./UploadForm";
import { SourceCard } from "./SourceCard";
import { ThemeToggle } from "@/components/ThemeToggle";

export const metadata = {
  title: "Dashboard — Brain Dump",
  description: "Manage your knowledge base sources",
};

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  await connectDB();
  const sources = await Source.find({ userId: session.user.id })
    .sort({ createdAt: -1 })
    .lean<ISource[]>();

  return (
    <div className="min-h-screen bg-[var(--app-bg)] text-[var(--app-text)]">
      {/* ── Nav ── */}
      <nav className="sticky top-0 z-50 border-b border-[var(--app-border)] bg-[color-mix(in_srgb,var(--app-bg)_90%,transparent)] backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-[var(--app-brand)]">
              <div className="h-2.5 w-2.5 rounded-sm bg-[var(--app-brand-text)]" />
            </div>
            <span className="text-sm font-semibold tracking-tight">Brain Dump</span>
            <span className="hidden text-xs text-[var(--app-subtle)] sm:block">/ Dashboard</span>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <a
              href="/chat"
              className="flex items-center gap-2 rounded-lg border border-[var(--app-border)] bg-[var(--app-panel)] px-4 py-2 text-sm text-[var(--app-muted)] transition-all hover:border-[var(--app-border-strong)] hover:text-[var(--app-text)]"
            >
              <span className="material-symbols-outlined text-[18px]">chat</span>
              <span className="hidden sm:inline">Open Chat</span>
            </a>
          </div>
        </div>
      </nav>

      <main className="mx-auto max-w-5xl px-6 py-12">
        {/* ── Hero ── */}
        <div className="mb-12">
          <h1 className="mb-2 text-3xl font-bold tracking-tight">
            Knowledge Base
          </h1>
          <p className="text-sm text-[var(--app-muted)]">
            Upload documents, paste text, or add URLs. Brain Dump will index your
            content and make it queryable in chat.
          </p>
        </div>

        <div className="grid gap-10 lg:grid-cols-[1fr_360px]">
          {/* ── Source List ── */}
          <section>
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-widest text-[var(--app-subtle)]">
                Sources ({sources.length})
              </h2>
            </div>

            {sources.length === 0 ? (
              <EmptySourcesState />
            ) : (
              <div className="flex flex-col gap-3">
                {sources.map((source) => (
                  <SourceCard
                    key={String(source._id)}
                    source={{
                      _id: String(source._id),
                      title: source.title,
                      type: source.type,
                      status: source.status,
                      chunkCount: source.chunkCount,
                      url: source.url,
                      filename: source.filename,
                      errorMessage: source.errorMessage,
                      createdAt: source.createdAt.toISOString(),
                    }}
                  />
                ))}
              </div>
            )}
          </section>

          {/* ── Upload Form ── */}
          <aside className="lg:sticky lg:top-24 h-fit">
            <UploadForm />
          </aside>
        </div>
      </main>

    </div>
  );
}

function EmptySourcesState() {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-[var(--app-border-strong)] bg-[var(--app-panel)] py-20 text-center shadow-[var(--app-shadow)]">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg border border-[var(--app-border)] bg-[var(--app-panel-soft)]">
        <span className="material-symbols-outlined text-2xl text-[var(--app-accent)]">
          upload_file
        </span>
      </div>
      <p className="mb-1 text-sm font-medium text-[var(--app-text)]">No sources yet</p>
      <p className="text-xs text-[var(--app-muted)]">
        Add your first source using the form
      </p>
    </div>
  );
}
