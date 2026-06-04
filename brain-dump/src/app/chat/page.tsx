import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { ChatShell } from "./ChatShell";
import { Suspense } from "react";

export default async function ChatPage({
  searchParams,
}: {
  searchParams: Promise<{ session?: string }>;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const { session: sessionId } = await searchParams;

  return (
    <Suspense>
      <ChatShell
        userName={session.user.name ?? session.user.email ?? "User"}
        initialSessionId={sessionId}
      />
    </Suspense>
  );
}
