import Link from "next/link";
import { useTranslations } from "next-intl";
import { LegalLinks } from "@/components/legal/legal-links";
import { XLink } from "@/components/x-link";

// liens de pied de page des pages publiques : maillage interne vers les pages de présentation, puis légal et X
export function FooterLinks({ className = "" }: { className?: string }) {
  const t = useTranslations("home.footer.explore");
  const link = "underline-offset-2 hover:text-foreground hover:underline";
  return (
    <div className={`flex flex-wrap items-center gap-x-4 gap-y-1 ${className}`}>
      <nav aria-label={t("label")} className="flex flex-wrap gap-x-4 gap-y-1">
        <Link href="/cartes-wikipedia" className={link}>
          {t("wikipedia")}
        </Link>
        <Link href="/cartes-anime-manga" className={link}>
          {t("anime")}
        </Link>
      </nav>
      <LegalLinks />
      <XLink />
    </div>
  );
}
