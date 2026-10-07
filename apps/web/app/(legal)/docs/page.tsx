import { getTranslations } from "next-intl/server";
import { ApiReference } from "@/components/docs/api-reference";
import { API_URL } from "@/lib/api";
import { USER_DOCS } from "@/lib/api-docs";
import { pageMetadata } from "@/i18n/metadata";

export const generateMetadata = pageMetadata("docs", { path: "/docs" });

const code = "rounded bg-foreground/10 px-1.5 py-0.5 text-xs";
const tags = { code: (chunks: React.ReactNode) => <code className={code}>{chunks}</code> };

export default async function DocsPage() {
  const t = await getTranslations("docs.api");
  return (
    <>
      <h1 className="font-display text-5xl font-medium">{t("title")}</h1>
      <p className="prose-serif mt-3 text-pale-mist">{t("intro")}</p>

      <div
        role="note"
        className="mt-6 rounded-xl border border-warning/40 bg-warning/10 p-4 text-sm"
      >
        <p className="font-semibold">{t("noBotTitle")}</p>
        <p className="mt-1 text-pale-mist">{t.rich("noBotText", tags)}</p>
      </div>

      <section className="mt-10">
        <h2 className="font-display text-3xl font-medium">{t("principles")}</h2>
        <dl className="mt-4 flex flex-col gap-4 text-sm">
          {(
            [
              ["baseUrl", "baseUrlText"],
              ["auth", "authText"],
              ["format", "formatText"],
              ["errors", "errorsText"],
              ["rateLimits", "rateLimitsText"],
              ["rarities", "raritiesText"],
            ] as const
          ).map(([title, text]) => (
            <div key={title}>
              <dt className="font-semibold">{t(title)}</dt>
              <dd className="mt-1 text-pale-mist">{t.rich(text, { ...tags, url: API_URL })}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="mt-10">
        <h2 className="font-display text-3xl font-medium">{t("health")}</h2>
        <ul className="mt-4">
          <li className="rounded-xl border border-line bg-surface p-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-md bg-success/15 px-2 py-0.5 text-xs font-bold text-success">
                GET
              </span>
              <code className="text-sm font-semibold">/health</code>
              <span className="ml-auto text-xs text-fog">{t("noLogin")}</span>
            </div>
            <p className="mt-2 text-sm text-pale-mist">{t("healthText")}</p>
          </li>
        </ul>
      </section>

      <ApiReference sections={USER_DOCS} />
    </>
  );
}
