import type { ConversationsResponse } from "@wikideck/shared";
import { MessagesView } from "@/components/messages/messages-view";
import { API_URL, apiGet } from "@/lib/api";

export const metadata = { title: "Messages — Wikideck" };

export default async function MessagesPage({ searchParams }: PageProps<"/messages">) {
  const { with: other } = await searchParams;
  const data = await apiGet<ConversationsResponse>("/messages");
  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="text-center font-display text-5xl font-medium">Messages</h1>
      <p className="prose-serif mt-2 text-center text-pale-mist">
        Discutez en privé avec vos amis.
      </p>
      {data ? (
        <MessagesView
          initial={data.conversations}
          initialWith={typeof other === "string" ? other : null}
          apiUrl={API_URL}
        />
      ) : (
        <p className="mt-10 text-center text-sm text-danger">Impossible de charger les messages.</p>
      )}
    </div>
  );
}
