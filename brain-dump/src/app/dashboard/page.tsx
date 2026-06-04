import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { connectDB } from "@/lib/mongodb";
import { Source, type ISource } from "@/models/Source";
import { UploadForm } from "./UploadForm";
import { SourceCard } from "./SourceCard";

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
    <div className="min-h-screen bg-black text-white">
      {/* ── Nav ── */}
      <nav className="sticky top-0 z-50 border-b border-[#1a1a1a] bg-black/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-white">
              <div className="h-2.5 w-2.5 rounded-sm bg-black" />
            </div>
            <span className="text-sm font-semibold tracking-tight">Brain Dump</span>
            <span className="hidden text-xs text-[#555] sm:block">/ Dashboard</span>
          </div>
          <a
            href="/chat"
            className="flex items-center gap-2 rounded-lg border border-[#2a2a2a] bg-[#111] px-4 py-2 text-sm text-[#aaa] transition-all hover:border-[#444] hover:text-white"
          >
            <span className="material-symbols-outlined text-[18px]">chat</span>
            <span className="hidden sm:inline">Open Chat</span>
          </a>
        </div>
      </nav>

      <main className="mx-auto max-w-5xl px-6 py-12">
        {/* ── Hero ── */}
        <div className="mb-12">
          <h1 className="mb-2 text-3xl font-bold tracking-tight">
            Knowledge Base
          </h1>
          <p className="text-sm text-[#666]">
            Upload documents, paste text, or add URLs. Brain Dump will index your
            content and make it queryable in chat.
          </p>
        </div>

        <div className="grid gap-10 lg:grid-cols-[1fr_360px]">
          {/* ── Source List ── */}
          <section>
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-widest text-[#555]">
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
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-[#2a2a2a] bg-[#080808] py-20 text-center">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg border border-[#2a2a2a] bg-[#111]">
        <span className="material-symbols-outlined text-2xl text-[#555]">
          upload_file
        </span>
      </div>
      <p className="mb-1 text-sm font-medium text-white">No sources yet</p>
      <p className="text-xs text-[#555]">
        Add your first source using the form →
      </p>
    </div>
  );
}
