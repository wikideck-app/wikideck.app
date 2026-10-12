import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { Globe, Hourglass, Layers, Lock, ArrowRight } from "@/components/icons";
import type { IconType } from "@/components/icons";
import { ApiReference } from "@/components/docs/api-reference";
import { CodeBlock } from "@/components/docs/code-block";
import { DocsToc } from "@/components/docs/docs-toc";
import { API_URL } from "@/lib/api";
import { USER_DOCS } from "@/lib/api-docs";
import { DISCORD_URL } from "@/lib/site";
import { pageMetadata } from "@/i18n/metadata";

export const generateMetadata = pageMetadata("docs", { path: "/docs" });

const code = "rounded bg-foreground/10 px-1.5 py-0.5 text-xs";
const tags = { code: (chunks: React.ReactNode) => <code className={code}>{chunks}</code> };

const h2 = "font-display text-3xl font-semibold";
const lead = "mt-2 text-pale-mist";

const RARITIES = [
  ["C", "COMMON"],
  ["PC", "UNCOMMON"],
  ["R", "RARE"],
  ["SR", "SUPER_RARE"],
  ["UR", "ULTRA_RARE"],
  ["L", "LEGENDARY"],
  ["M", "MYTHIC"],
] as const;

const SAMPLE_RESPONSE = `{
  "cards": [
    {
      "id": "0192f3a8-6c1e-7b52-9d3a-4f1e2c7b9a10",
      "title": "Tour Eiffel",
      "description": "monument de Paris",
      "extract": "La tour Eiffel est une tour de fer puddlé...",
      "imageUrl": "https://upload.wikimedia.org/...",
      "url": "https://fr.wikipedia.org/wiki/Tour_Eiffel",
      "rarity": "LEGENDARY",
      "views": 1250000,
      "quantity": 2,
      "favorite": false,
      "tags": []
    }
  ],
  "total": 1,
  "page": 1,
  "pageSize": 20,
  "totalPages": 1
}`;

export default async function DocsPage() {
  const t = await getTranslations("docs.site");
  const tr = await getTranslations("docs");
  const base = API_URL;

  const curl = `curl -X GET "${base}/collection?page=1" \\
  -H "Authorization: Bearer VOTRE_CLE_API" \\
  -H "Accept: application/json"`;
  const js = `const res = await fetch("${base}/collection?page=1", {
  headers: {
    Authorization: "Bearer VOTRE_CLE_API",
    Accept: "application/json",
  },
});
const data = await res.json();
console.log(data.cards);`;
  const py = `import requests

res = requests.get(
    "${base}/collection",
    params={"page": 1},
    headers={"Authorization": "Bearer VOTRE_CLE_API"},
)
print(res.json()["cards"])`;
  const tabs = [
    { label: "cURL", code: curl },
    { label: "JavaScript", code: js },
    { label: "Python", code: py },
  ];

  const features: { icon: IconType; key: "key" | "json" | "limits" | "same" }[] = [
    { icon: Lock, key: "key" },
    { icon: Layers, key: "json" },
    { icon: Hourglass, key: "limits" },
    { icon: Globe, key: "same" },
  ];
  const toc = [
    { id: "quickstart", label: t("sidebar.quickstart") },
    { id: "auth", label: t("sidebar.auth") },
    { id: "first", label: t("first.title") },
    { id: "format", label: t("format.title") },
    { id: "errors", label: t("sidebar.errors") },
    { id: "limits", label: t("sidebar.limits") },
    { id: "examples", label: t("sidebar.examples") },
    { id: "rarities", label: t("sidebar.rarities") },
    { id: "reference", label: t("reference.title") },
  ];

  return (
    <div className="grid gap-x-10 py-8 xl:grid-cols-[minmax(0,1fr)_14rem]">
      <article className="min-w-0">
        <section id="overview" className="relative scroll-mt-24">
          <span className="inline-flex rounded-lg border border-line px-2.5 py-1 text-xs font-semibold text-pale-mist">
            {t("hero.badge")}
          </span>
          <h1 className="mt-4 font-display text-5xl font-semibold sm:text-6xl">
            {t("hero.title")} <span className="text-accent">{t("hero.accent")}</span>
          </h1>
          <p className="prose-serif mt-4 max-w-xl text-pale-mist">{t("hero.intro")}</p>
          <p className="mt-3 max-w-xl text-sm text-pale-mist">{t("hero.text")}</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <a href="#quickstart" className="inline-flex items-center gap-2 rounded-xl bg-accent px-5 py-2.5 text-sm font-bold text-accent-foreground hover:bg-accent/80">
              {t("hero.start")}
              <ArrowRight className="size-4" />
            </a>
            <a href="#examples" className="rounded-xl border border-line px-5 py-2.5 text-sm font-semibold hover:bg-foreground/10">
              {t("hero.examples")}
            </a>
          </div>
          <Image
            src="/dos_carte.webp"
            alt=""
            width={400}
            height={560}
            priority
            className="pointer-events-none absolute right-6 top-2 hidden h-64 w-auto rotate-6 rounded-xl drop-shadow-[0_0_40px_rgba(255,180,84,0.25)] lg:block"
          />
        </section>

        <div className="mt-10 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {features.map(({ icon: Icon, key }) => (
            <div key={key} className="rounded-2xl border border-line bg-surface p-4">
              <span className="flex size-10 items-center justify-center rounded-xl bg-accent/15 text-accent">
                <Icon className="size-5" />
              </span>
              <p className="mt-3 font-semibold">{t(`features.${key}.title`)}</p>
              <p className="mt-1 text-sm text-pale-mist">{t(`features.${key}.text`)}</p>
            </div>
          ))}
        </div>

        <section id="quickstart" className="mt-14 scroll-mt-24">
          <h2 className={h2}>{t("quickstart.title")}</h2>
          <p className={lead}>{t("quickstart.intro")}</p>
          <ol className="mt-6 grid gap-5">
            {(["step1", "step2", "step3"] as const).map((step, i) => (
              <li key={step} className="flex gap-4">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-accent font-bold text-accent-foreground">
                  {i + 1}
                </span>
                <div>
                  <p className="font-semibold">{t(`quickstart.${step}`)}</p>
                  <p className="text-sm text-pale-mist">{t.rich(`quickstart.${step}Text`, tags)}</p>
                </div>
              </li>
            ))}
          </ol>
          <div className="mt-6">
            <CodeBlock tabs={[{ label: "cURL", code: curl }]} title={t("quickstart.sample")} />
          </div>
        </section>

        <section id="auth" className="mt-14 scroll-mt-24">
          <h2 className={h2}>{t("auth.title")}</h2>
          <p className={lead}>{t("auth.intro")}</p>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-line bg-surface p-4">
              <p className="font-semibold">{t("auth.keyTitle")}</p>
              <p className="mt-1 text-sm text-pale-mist">{t.rich("auth.keyText", tags)}</p>
            </div>
            <div className="rounded-xl border border-line bg-surface p-4">
              <p className="font-semibold">{t("auth.sessionTitle")}</p>
              <p className="mt-1 text-sm text-pale-mist">{t.rich("auth.sessionText", tags)}</p>
            </div>
          </div>
          <p className="mt-3 text-sm text-pale-mist">{t("auth.sessionOnly")}</p>
          <p className="mt-1 text-sm text-pale-mist">{t.rich("auth.public", tags)}</p>
          <div className="mt-5 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-accent/40 bg-accent/10 p-4">
            <div>
              <p className="font-semibold">{t("auth.whereTitle")}</p>
              <p className="mt-1 max-w-xl text-sm text-pale-mist">{t("auth.whereText")}</p>
            </div>
            <a href={DISCORD_URL} className="rounded-xl border border-accent/50 px-4 py-2 text-sm font-semibold text-accent hover:bg-accent/15">
              {t("auth.whereCta")} →
            </a>
          </div>
        </section>

        <section id="first" className="mt-14 scroll-mt-24">
          <h2 className={h2}>{t("first.title")}</h2>
          <p className={lead}>{t("first.intro")}</p>
          <div className="mt-5 grid gap-4">
            <CodeBlock tabs={tabs} />
            <CodeBlock tabs={[{ label: "JSON", code: SAMPLE_RESPONSE }]} title={t("first.responseTitle")} />
          </div>
        </section>

        <section id="format" className="mt-14 scroll-mt-24">
          <h2 className={h2}>{t("format.title")}</h2>
          <p className={lead}>{t.rich("format.text", tags)}</p>
        </section>

        <section id="errors" className="mt-14 scroll-mt-24">
          <h2 className={h2}>{t("errors.title")}</h2>
          <p className={lead}>{t.rich("errors.text", tags)}</p>
          <div className="mt-4 overflow-hidden rounded-xl border border-line">
            <table className="w-full text-left text-sm">
              <thead className="bg-foreground/5 text-xs uppercase tracking-[0.12em] text-fog">
                <tr>
                  <th className="px-4 py-2.5">{t("errors.code")}</th>
                  <th className="px-4 py-2.5">{t("errors.meaning")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line bg-surface">
                {(["400", "401", "403", "404", "409", "429", "502", "503"] as const).map((c) => (
                  <tr key={c}>
                    <td className="px-4 py-2.5">
                      <code className={code}>{c}</code>
                    </td>
                    <td className="px-4 py-2.5 text-pale-mist">{t(`errors.${c}`)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section id="limits" className="mt-14 scroll-mt-24">
          <h2 className={h2}>{t("limits.title")}</h2>
          <p className={lead}>{t.rich("limits.text", tags)}</p>
        </section>

        <section id="examples" className="mt-14 scroll-mt-24">
          <h2 className={h2}>{t("examples.title")}</h2>
          <p className={lead}>{t("examples.intro")}</p>
          <div className="mt-5">
            <CodeBlock tabs={tabs} />
          </div>
        </section>

        <section id="rarities" className="mt-14 scroll-mt-24">
          <h2 className={h2}>{t("rarities.title")}</h2>
          <p className={lead}>{t("rarities.text")}</p>
          <ul className="mt-4 flex flex-wrap gap-2">
            {RARITIES.map(([short, long]) => (
              <li key={short} className="rounded-lg border border-line bg-surface px-3 py-1.5 text-sm">
                <code className={code}>{short}</code> <span className="text-fog">{long}</span>
              </li>
            ))}
          </ul>
        </section>

        <section id="reference" className="mt-14 scroll-mt-24">
          <h2 className={h2}>{t("reference.title")}</h2>
          <p className={lead}>{t("reference.intro")}</p>
          <div className="mt-6">
            <h3 className="font-display text-2xl font-semibold">{t("health.title")}</h3>
            <div className="mt-3 rounded-xl border border-line bg-surface p-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-md bg-success/15 px-2 py-0.5 text-xs font-bold text-success">GET</span>
                <code className="text-sm font-semibold">/health</code>
                <span className="ml-auto text-xs text-fog">{t("health.noLogin")}</span>
              </div>
              <p className="mt-2 text-sm text-pale-mist">{t("health.text")}</p>
            </div>
          </div>
          <div className="mt-8">
            <ApiReference sections={USER_DOCS} />
          </div>
        </section>
        <p className="sr-only">{tr("reference.sections")}</p>
      </article>

      <aside className="hidden xl:block">
        <div className="sticky top-24">
          <p className="mb-3 text-sm font-bold">{t("toc.title")}</p>
          <DocsToc items={toc} />
          <div className="mt-8 rounded-xl border border-line bg-surface p-4">
            <p className="font-semibold">{t("help.title")}</p>
            <p className="mt-1 text-xs text-pale-mist">{t("help.text")}</p>
            <a href={DISCORD_URL} className="mt-3 block rounded-lg border border-accent/50 px-3 py-2 text-center text-sm font-semibold text-accent hover:bg-accent/15">
              {t("help.cta")}
            </a>
          </div>
        </div>
      </aside>
    </div>
  );
}
