import { getTranslations } from "next-intl/server";
import type { DocSection, Endpoint, Method } from "@/lib/api-docs";

const METHOD_STYLE: Record<Method, string> = {
  GET: "bg-success/15 text-success",
  POST: "bg-accent/15 text-accent",
  PUT: "bg-warning/15 text-warning",
  PATCH: "bg-warning/15 text-warning",
  DELETE: "bg-danger/15 text-danger",
};

type DocsTranslator = Awaited<ReturnType<typeof getTranslations<"docs">>>;

// les noms de champs viennent de la structure (api-docs.ts) : le test i18n vérifie que chacun a un texte
const fieldText = (t: DocsTranslator, key: Endpoint["key"], group: "query" | "body", name: string) =>
  t(`endpoints.${key}.${group}.${name}` as never);

function Fields({
  title,
  names,
  describe,
}: {
  title: string;
  names: string[];
  describe: (name: string) => string;
}) {
  return (
    <div className="mt-3">
      <p className="text-xs font-bold uppercase tracking-[0.15em] text-fog">{title}</p>
      <dl className="mt-1.5 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
        {names.map((name) => (
          <div key={name} className="contents">
            <dt>
              <code className="rounded bg-foreground/10 px-1.5 py-0.5 text-xs">{name}</code>
            </dt>
            <dd className="min-w-0 text-pale-mist">{describe(name)}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function EndpointCard({ endpoint, id, t }: { endpoint: Endpoint; id: string; t: DocsTranslator }) {
  return (
    <li id={id} className="scroll-mt-20 rounded-xl border border-line bg-surface p-4">
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={`rounded-md px-2 py-0.5 text-xs font-bold ${METHOD_STYLE[endpoint.method]}`}
        >
          {endpoint.method}
        </span>
        <code className="min-w-0 break-all text-sm font-semibold">{endpoint.path}</code>
        {endpoint.limit && (
          <span className="ml-auto text-xs tabular-nums text-fog">
            {t("reference.limit", { max: endpoint.limit.max, minutes: endpoint.limit.minutes })}
          </span>
        )}
      </div>
      <p className="mt-2 text-sm text-pale-mist">{t(`endpoints.${endpoint.key}.summary`)}</p>
      {endpoint.query && (
        <Fields
          title={t("reference.query")}
          names={endpoint.query}
          describe={(name) => fieldText(t, endpoint.key, "query", name)}
        />
      )}
      {endpoint.body && (
        <Fields
          title={t("reference.body")}
          names={endpoint.body}
          describe={(name) => fieldText(t, endpoint.key, "body", name)}
        />
      )}
      {endpoint.returns && (
        <p className="mt-3 text-sm">
          <span className="text-xs font-bold uppercase tracking-[0.15em] text-fog">
            {t("reference.response")}{" "}
          </span>
          <code className="rounded bg-foreground/10 px-1.5 py-0.5 text-xs">{endpoint.returns}</code>
        </p>
      )}
      {endpoint.errors && (
        <p className="mt-3 flex flex-wrap items-center gap-1.5 text-sm">
          <span className="text-xs font-bold uppercase tracking-[0.15em] text-fog">
            {t("reference.errors")}
          </span>
          {endpoint.errors.map((e) => (
            <code key={e} className="rounded bg-foreground/10 px-1.5 py-0.5 text-xs">
              {e}
            </code>
          ))}
        </p>
      )}
    </li>
  );
}

export async function ApiReference({ sections }: { sections: DocSection[] }) {
  const t = await getTranslations("docs");
  return (
    <>
      <nav aria-label={t("reference.sections")} className="mt-8 flex flex-wrap gap-2">
        {sections.map((s) => (
          <a
            key={s.id}
            href={`#${s.id}`}
            className="rounded-full border border-line px-3 py-1 text-xs font-semibold text-pale-mist hover:border-accent hover:text-foreground"
          >
            {t(`sections.${s.id}.title`)}
          </a>
        ))}
      </nav>
      {sections.map((section) => (
        <section key={section.id} id={section.id} className="mt-12 scroll-mt-20">
          <h2 className="font-display text-3xl font-medium">{t(`sections.${section.id}.title`)}</h2>
          {t.has(`sections.${section.id}.intro` as never) && (
            <p className="prose-serif mt-2 text-pale-mist">
              {t(`sections.${section.id}.intro` as never)}
            </p>
          )}
          <ul className="mt-5 flex flex-col gap-3">
            {section.endpoints.map((e) => (
              <EndpointCard
                key={e.key}
                endpoint={e}
                t={t}
                id={`${section.id}-${e.method.toLowerCase()}-${e.path.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "")}`}
              />
            ))}
          </ul>
        </section>
      ))}
    </>
  );
}
