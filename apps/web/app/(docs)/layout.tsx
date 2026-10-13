import Image from "next/image";
import Link from "next/link";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, getTranslations } from "next-intl/server";
import { AlertTriangle, Hourglass, Layers, Library, Lock, Sparkles } from "@/components/icons";
import type { IconType } from "@/components/icons";
import { BaseUrl } from "@/components/docs/base-url";
import { endpointId } from "@/components/docs/api-reference";
import { DocsSearch, type SearchEntry } from "@/components/docs/docs-search";
import { FooterLinks } from "@/components/footer-links";
import { API_URL, getCurrentUser } from "@/lib/api";
import { USER_DOCS } from "@/lib/api-docs";
import { DISCORD_URL } from "@/lib/site";

const INTRO: { id: string; icon: IconType; key: "overview" | "quickstart" | "auth" | "limits" | "errors" }[] = [
  { id: "overview", icon: Layers, key: "overview" },
  { id: "quickstart", icon: Sparkles, key: "quickstart" },
  { id: "auth", icon: Lock, key: "auth" },
  { id: "limits", icon: Hourglass, key: "limits" },
  { id: "errors", icon: AlertTriangle, key: "errors" },
];

const link =
  "flex items-center gap-3 rounded-xl px-3 py-2 text-sm text-pale-mist transition-colors hover:bg-foreground/10 hover:text-foreground";

export default async function DocsLayout({ children }: { children: React.ReactNode }) {
  const [t, me, all] = await Promise.all([getTranslations("docs"), getCurrentUser(), getMessages()]);
  // seuls les composants client de la documentation ont besoin de leurs textes dans le HTML
  const clientMessages = { docs: { site: { search: all.docs.site.search, baseUrl: all.docs.site.baseUrl } } };
  const entries: SearchEntry[] = [
    ...INTRO.map((i) => ({ href: `/docs#${i.id}`, title: t(`site.sidebar.${i.key}`), hint: t("site.nav.docs") })),
    ...USER_DOCS.flatMap((s) =>
      s.endpoints.map((e) => ({
        href: `/docs#${endpointId(s.id, e)}`,
        title: e.path,
        hint: t(`endpoints.${e.key}.summary`),
        method: e.method,
      })),
    ),
  ];

  const nav = (
    <nav aria-label={t("site.nav.menu")} className="grid gap-5">
      <div>
        <p className="px-3 text-[11px] font-bold uppercase tracking-[0.18em] text-fog">{t("site.sidebar.intro")}</p>
        <ul className="mt-2 grid gap-0.5">
          {INTRO.map(({ id, icon: Icon, key }) => (
            <li key={id}>
              <Link href={`/docs#${id}`} className={link}>
                <Icon className="size-5 shrink-0" />
                {t(`site.sidebar.${key}`)}
              </Link>
            </li>
          ))}
        </ul>
      </div>
      <div>
        <p className="px-3 text-[11px] font-bold uppercase tracking-[0.18em] text-fog">{t("site.sidebar.reference")}</p>
        <ul className="mt-2 grid gap-0.5">
          {USER_DOCS.map((s) => (
            <li key={s.id}>
              <Link href={`/docs#${s.id}`} className={link}>
                <Library className="size-5 shrink-0" />
                {t(`sections.${s.id}.title`)}
              </Link>
            </li>
          ))}
        </ul>
      </div>
      <div>
        <p className="px-3 text-[11px] font-bold uppercase tracking-[0.18em] text-fog">{t("site.sidebar.resources")}</p>
        <ul className="mt-2 grid gap-0.5">
          <li>
            <Link href="/docs#examples" className={link}>
              {t("site.sidebar.examples")}
            </Link>
          </li>
          <li>
            <Link href="/docs#rarities" className={link}>
              {t("site.sidebar.rarities")}
            </Link>
          </li>
          {me?.staff && (
            <li>
              <Link href="/docs/staff" className={link}>
                {t("site.sidebar.staffDocs")}
              </Link>
            </li>
          )}
        </ul>
      </div>
    </nav>
  );

  return (
    <NextIntlClientProvider messages={clientMessages}>
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-40 border-b border-line bg-background/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-[1500px] items-center gap-4 px-4 sm:px-6">
          <Link href="/docs" className="flex shrink-0 items-center gap-3">
            <Image src="/logo.webp" alt="" width={96} height={96} className="size-9" />
            <span className="text-lg font-bold">{t("site.brand")}</span>
          </Link>
          <nav className="mx-auto hidden items-center gap-1 md:flex">
            <Link href="/docs" className="rounded-lg px-3 py-1.5 text-sm font-semibold text-accent underline decoration-2 underline-offset-8">
              {t("site.nav.docs")}
            </Link>
            <a href={`${API_URL}/health`} className="rounded-lg px-3 py-1.5 text-sm text-pale-mist hover:text-foreground">
              {t("site.nav.status")}
            </a>
            <a href={DISCORD_URL} className="rounded-lg px-3 py-1.5 text-sm text-pale-mist hover:text-foreground">
              {t("site.nav.support")}
            </a>
          </nav>
          <div className="ml-auto flex flex-1 justify-end md:flex-none">
            <DocsSearch entries={entries} />
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-[1500px] gap-x-8 px-4 sm:px-6 lg:grid-cols-[16rem_minmax(0,1fr)]">
        <aside className="hidden border-r border-line py-8 pr-6 lg:sticky lg:top-16 lg:block lg:h-[calc(100vh-4rem)] lg:self-start lg:overflow-y-auto">
          {nav}
          <div className="mt-6">
            <BaseUrl apiUrl={API_URL} />
          </div>
          <Link href="/" className="mt-4 block px-3 text-xs text-fog hover:text-foreground">
            ← {t("site.sidebar.backToSite")}
          </Link>
        </aside>
        <div className="min-w-0">
          <details className="mt-4 rounded-xl border border-line bg-surface p-3 lg:hidden">
            <summary className="cursor-pointer text-sm font-semibold">{t("site.nav.menu")}</summary>
            <div className="mt-3">{nav}</div>
          </details>
          <main>{children}</main>
          <footer className="border-t border-line py-6 text-xs text-fog">
            <FooterLinks />
          </footer>
        </div>
      </div>
    </div>
    </NextIntlClientProvider>
  );
}
