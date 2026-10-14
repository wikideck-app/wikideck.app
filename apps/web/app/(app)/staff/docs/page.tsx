import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { ArrowLeft } from "@/components/icons";
import { ApiReference } from "@/components/docs/api-reference";
import { getCurrentUser } from "@/lib/api";
import { STAFF_DOCS } from "@/lib/api-docs";
import { pageMetadata } from "@/i18n/metadata";

export async function generateMetadata() {
  return { ...(await pageMetadata("docsStaff")()), robots: { index: false } };
}

const code = "rounded bg-foreground/10 px-1.5 py-0.5 text-xs";
const tags = {
  code: (chunks: React.ReactNode) => <code className={code}>{chunks}</code>,
  strong: (chunks: React.ReactNode) => <strong className="text-foreground">{chunks}</strong>,
};

type Role = "MODERATOR" | "ADMIN";
type Action = { id: string; text: string; role: Role };
// actions des routes POST, par route ; `text` : clé sous docs.staff.actions, `id` : valeur envoyée dans `action`
const GROUPS: { key: "users" | "reports" | "bugs" | "guilds" | "auctions" | "alerts"; actions: Action[] }[] = [
  {
    key: "users",
    actions: [
      { id: "ban", text: "ban", role: "MODERATOR" },
      { id: "unban", text: "unban", role: "MODERATOR" },
      { id: "rename", text: "rename", role: "MODERATOR" },
      { id: "setTrust", text: "setTrust", role: "MODERATOR" },
      { id: "clearSignals", text: "clearSignals", role: "MODERATOR" },
      { id: "wikibits", text: "wikibits", role: "ADMIN" },
      { id: "packs", text: "packs", role: "ADMIN" },
      { id: "setRole", text: "setRole", role: "ADMIN" },
      { id: "delete", text: "delete", role: "ADMIN" },
    ],
  },
  {
    key: "reports",
    actions: [
      { id: "dismiss", text: "dismiss", role: "MODERATOR" },
      { id: "deleteMessage", text: "deleteMessage", role: "MODERATOR" },
    ],
  },
  {
    key: "bugs",
    actions: [
      { id: "resolve", text: "resolve", role: "MODERATOR" },
      { id: "dismiss", text: "dismissBug", role: "MODERATOR" },
    ],
  },
  {
    key: "guilds",
    actions: [
      { id: "edit", text: "edit", role: "MODERATOR" },
      { id: "kick", text: "kick", role: "MODERATOR" },
      { id: "dissolve", text: "dissolve", role: "MODERATOR" },
    ],
  },
  { key: "auctions", actions: [{ id: "reason", text: "cancel", role: "MODERATOR" }] },
  { key: "alerts", actions: [{ id: "userId · all", text: "read", role: "MODERATOR" }] },
];

export default async function StaffDocsPage() {
  const me = await getCurrentUser();
  if (!me?.staff) notFound();
  const [t, tr] = await Promise.all([getTranslations("docs.staff"), getTranslations("docs.reference")]);
  return (
    <div className="mx-auto max-w-4xl py-4">
      <Link
        href="/staff"
        className="inline-flex items-center gap-1.5 text-sm text-fog hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        {t("back")}
      </Link>
      <h1 className="mt-3 font-display text-5xl font-semibold">{t("title")}</h1>
      <p className="prose-serif mt-3 text-pale-mist">{t.rich("intro", tags)}</p>
      <div className="mt-6 rounded-xl border border-line bg-surface p-4 text-sm text-pale-mist">
        <p>{t.rich("access", tags)}</p>
        <p className="mt-2">{t.rich("auth", tags)}</p>
        <p className="mt-2">
          <strong className="text-foreground">{t("rule")}</strong> : {t("ruleText")}
        </p>
      </div>

      <h2 className="mt-10 font-display text-3xl font-semibold">{t("actionsTitle")}</h2>
      <p className="prose-serif mt-2 text-pale-mist">{t.rich("actionsIntro", tags)}</p>
      {GROUPS.map((group) => (
        <section key={group.key} className="mt-6">
          <h3 className="text-xs font-bold uppercase tracking-[0.15em] text-fog">{t(`groups.${group.key}`)}</h3>
          <ul className="mt-2 flex flex-col gap-2">
            {group.actions.map((a) => (
              <li key={a.text} className="rounded-xl border border-line bg-surface p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <code className="text-sm font-semibold">{a.id}</code>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
                      a.role === "ADMIN" ? "bg-danger/15 text-danger" : "bg-accent/15 text-accent"
                    }`}
                  >
                    {tr(`role.${a.role}`)}
                  </span>
                </div>
                <p className="mt-2 text-sm text-pale-mist">{t(`actions.${a.text}.what` as never)}</p>
                <p className="mt-1.5 text-xs text-fog">
                  {tr("body")} : <span className="text-pale-mist">{t(`actions.${a.text}.params` as never)}</span>
                </p>
              </li>
            ))}
          </ul>
        </section>
      ))}

      <h2 className="mt-12 font-display text-3xl font-semibold">{tr("sections")}</h2>
      <div className="-mt-6">
        <ApiReference sections={STAFF_DOCS} />
      </div>
    </div>
  );
}
