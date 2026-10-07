import { getTranslations } from "next-intl/server";
import type { ConversationsResponse } from "@wikideck/shared";
import { MessagesView } from "@/components/messages/messages-view";
import { API_URL, apiGet } from "@/lib/api";
import { pageMetadata } from "@/i18n/metadata";

export const generateMetadata = pageMetadata("messages");

export default async function MessagesPage({ searchParams }: PageProps<"/messages">) {
  const [{ with: other }, t, data] = await Promise.all([
    searchParams,
    getTranslations("messages"),
    apiGet<ConversationsResponse>("/messages"),
  ]);
  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="text-center font-display text-5xl font-medium">{t("title")}</h1>
      <p className="prose-serif mt-2 text-center text-pale-mist">
        {t("subtitle")}
      </p>
      {data ? (
        <MessagesView
          initial={data.conversations}
          initialWith={typeof other === "string" ? other : null}
          apiUrl={API_URL}
        />
      ) : (
        <p className="mt-10 text-center text-sm text-danger">{t("loadError")}</p>
      )}
    </div>
  );
}
