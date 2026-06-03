import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { ChatInterface } from "./ChatInterface";

export default async function ChatPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  return (
    <ChatInterface
      userName={session.user.name ?? session.user.email ?? "User"}
    />
  );
}
