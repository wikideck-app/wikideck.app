import Link from "next/link";
import { useTranslations } from "next-intl";
import { LEGAL_LINKS } from "@/lib/legal";

export function LegalLinks({ className = "" }: { className?: string }) {
  const t = useTranslations("legal.nav");
  return (
    <nav
      aria-label={t("label")}
      className={`flex flex-wrap gap-x-4 gap-y-1 ${className}`}
    >
      {LEGAL_LINKS.map((l) => (
        <Link
          key={l.href}
          href={l.href}
          className="underline-offset-2 hover:text-foreground hover:underline"
        >
          {t(l.key)}
        </Link>
      ))}
    </nav>
  );
}
