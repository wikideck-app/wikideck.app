import Image from "next/image";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { FooterLinks } from "@/components/footer-links";

// pages de présentation publiques (référencement) : en-tête simple, un appel à jouer, pied de page avec maillage interne
export default async function ContentLayout({ children }: { children: React.ReactNode }) {
  const t = await getTranslations("seoPages.layout");
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <header className="border-b border-line">
        <div className="mx-auto flex h-16 w-full max-w-5xl items-center justify-between gap-4 px-6">
          <Link href="/" className="flex items-center gap-3" aria-label={t("homeLabel")}>
            <Image src="/logo.webp" alt="" width={96} height={96} className="size-9" />
            <span className="text-lg font-bold tracking-tight">Wikideck</span>
          </Link>
          <nav aria-label={t("nav")} className="flex items-center gap-4 text-sm">
            <Link href="/cartes-wikipedia" className="hidden text-pale-mist hover:text-foreground sm:block">
              {t("wikipedia")}
            </Link>
            <Link href="/cartes-anime-manga" className="hidden text-pale-mist hover:text-foreground sm:block">
              {t("anime")}
            </Link>
            <Link
              href="/#login"
              className="rounded-full bg-accent px-4 py-1.5 font-semibold text-accent-foreground hover:bg-accent/80"
            >
              {t("play")}
            </Link>
          </nav>
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-12">{children}</main>
      <footer className="border-t border-line">
        <div className="mx-auto w-full max-w-5xl px-6 py-6 text-xs text-fog">
          <FooterLinks />
        </div>
      </footer>
    </div>
  );
}
