import { getTranslations } from "next-intl/server";
import { ImportWizard } from "@/components/import-wizard";
import { API_URL } from "@/lib/api";
import { pageMetadata } from "@/i18n/metadata";

export const generateMetadata = pageMetadata("import");

export default async function ImportPage() {
  const t = await getTranslations("importer");
  return (
    <div className="mx-auto max-w-3xl text-center">
      <h1 className="font-display text-5xl font-medium">{t("title")}</h1>
      <p className="prose-serif mt-3 text-pale-mist">
        {t("subtitle")}
      </p>
      <div className="text-left">
        <ImportWizard apiUrl={API_URL} />
      </div>
    </div>
  );
}
