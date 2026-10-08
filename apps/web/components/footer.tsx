import { getTranslations } from "next-intl/server";
import { BugReportButton } from "@/components/bug-report";
import { LegalLinks } from "@/components/legal/legal-links";

// pied de page de l'espace connecté : copyright à gauche, liens légaux et signalement de bug à droite
export async function Footer({ apiUrl }: { apiUrl: string }) {
  const t = await getTranslations("nav");
  return (
    <footer className="mt-12 border-t border-line">
      <div className="mx-auto flex w-full max-w-[1600px] flex-col items-center gap-3 px-6 py-5 text-xs text-fog md:flex-row md:justify-between">
        <p className="max-w-2xl text-center leading-relaxed md:text-left">
          {t("copyright", { year: new Date().getFullYear() })} · {t("disclaimer")}
        </p>
        <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-1">
          <LegalLinks className="gap-x-5" />
          <BugReportButton apiUrl={apiUrl} />
        </div>
      </div>
    </footer>
  );
}
