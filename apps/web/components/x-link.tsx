import { useTranslations } from "next-intl";
import { XLogo } from "@/components/icons";
import { X_URL } from "@/lib/site";

// lien vers le compte X de Wikideck (pieds de page)
export function XLink({ className = "" }: { className?: string }) {
  const t = useTranslations("nav");
  return (
    <a
      href={X_URL}
      target="_blank"
      rel="noopener noreferrer me"
      aria-label={t("xLabel")}
      className={`inline-flex items-center gap-1.5 underline-offset-2 hover:text-foreground hover:underline ${className}`}
    >
      <XLogo className="size-3.5" aria-hidden />
      {t("xName")}
    </a>
  );
}
