import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { ApiReference } from "@/components/docs/api-reference";
import { getCurrentUser } from "@/lib/api";
import { STAFF_DOCS } from "@/lib/api-docs";
import { pageMetadata } from "@/i18n/metadata";

export async function generateMetadata() {
  return { ...(await pageMetadata("docsStaff")()), robots: { index: false } };
}

const code = "rounded bg-foreground/10 px-1.5 py-0.5 text-xs";
const tags = {
  code: (chunks: React.ReactNode) => <code className={code}>{chunks}</code>,
  strong: (chunks: React.ReactNode) => <strong className="text-foreground">{chunks}</strong>,
};

export default async function StaffDocsPage() {
  const me = await getCurrentUser();
  if (!me?.staff) notFound();
  const t = await getTranslations("docs.staff");
  return (
    <div className="mx-auto max-w-4xl py-8">
      <h1 className="font-display text-5xl font-semibold">{t("title")}</h1>
      <p className="prose-serif mt-3 text-pale-mist">{t.rich("intro", tags)}</p>
      <div className="mt-6 rounded-xl border border-line bg-surface p-4 text-sm text-pale-mist">
        <p>{t.rich("access", tags)}</p>
        <p className="mt-2">{t.rich("journal", tags)}</p>
        <p className="mt-2">{t.rich("roles", tags)}</p>
      </div>
      <div className="mt-8">
        <ApiReference sections={STAFF_DOCS} />
      </div>
    </div>
  );
}
