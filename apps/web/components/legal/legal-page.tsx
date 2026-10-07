import Link from "next/link";
import type { ReactNode } from "react";
import { getFormatter, getTranslations } from "next-intl/server";
import { LEGAL, TODO } from "@/lib/legal";

export async function LegalHeader({ title, intro }: { title: string; intro?: string }) {
  const [t, format] = await Promise.all([getTranslations("legal"), getFormatter()]);
  return (
    <header>
      <h1 className="font-display text-4xl font-medium sm:text-5xl">{title}</h1>
      <p className="mt-3 text-xs text-fog">
        {t("updatedAt", { date: format.dateTime(new Date(LEGAL.updatedAt), "long") })}
      </p>
      {intro && <p className="prose-serif mt-6 text-pale-mist">{intro}</p>}
    </header>
  );
}

export function Section({
  id,
  title,
  children,
}: {
  id?: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="mt-10 scroll-mt-24">
      <h2 className="text-lg font-bold">{title}</h2>
      <div className="prose-serif mt-3 space-y-3 text-pale-mist [&_a]:text-foreground [&_a]:underline [&_li]:ml-5 [&_li]:list-disc [&_strong]:text-foreground">
        {children}
      </div>
    </section>
  );
}

export async function Fill({ value }: { value: string }) {
  if (value !== TODO) return <>{value}</>;
  const t = await getTranslations("legal");
  return (
    <mark className="rounded bg-accent/15 px-1.5 py-0.5 text-xs font-bold not-italic text-foreground">
      [{t("todo")}]
    </mark>
  );
}

// balises communes des textes juridiques (t.rich)
export const legalTags = {
  strong: (chunks: ReactNode) => <strong>{chunks}</strong>,
  notice: (chunks: ReactNode) => <Link href="/legal-notice">{chunks}</Link>,
  privacy: (chunks: ReactNode) => <Link href="/privacy">{chunks}</Link>,
  terms: (chunks: ReactNode) => <Link href="/terms">{chunks}</Link>,
  cnil: (chunks: ReactNode) => (
    <a href="https://www.cnil.fr/fr/plaintes" target="_blank" rel="noreferrer">
      {chunks}
    </a>
  ),
  license: (chunks: ReactNode) => (
    <a
      href="https://creativecommons.org/licenses/by-sa/4.0/deed.fr"
      target="_blank"
      rel="noreferrer"
    >
      {chunks}
    </a>
  ),
};
