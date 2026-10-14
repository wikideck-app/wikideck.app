import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getFormatter, getTranslations } from "next-intl/server";
import { RARITIES, type PackShareDto } from "@wikideck/shared";
import { WikiCard } from "@/components/wiki-card";
import { RARITY_COLOR } from "@/lib/rarity-ui";
import { API_URL } from "@/lib/api";

type Props = { params: Promise<{ id: string }> };

// page publique d'un tirage partagé (lien créé par le bouton « Partager » du récapitulatif)
async function loadShare(id: string): Promise<PackShareDto | null> {
  if (!/^[0-9a-zA-Z]{10}$/.test(id)) return null;
  try {
    const res = await fetch(`${API_URL}/shares/${id}`, { next: { revalidate: 300 } });
    return res.ok ? ((await res.json()) as PackShareDto) : null;
  } catch {
    return null;
  }
}

const counts = (share: PackShareDto) =>
  RARITIES.filter((r) => share.cards.some((c) => c.rarity === r.value))
    .reverse()
    .map((r) => ({ rarity: r.value, count: share.cards.filter((c) => c.rarity === r.value).length }));

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const share = await loadShare(id);
  if (!share) return { title: "Tirage introuvable", robots: { index: false } };
  const [t, tp] = await Promise.all([getTranslations("seoPages.share"), getTranslations("packs.summary")]);
  const title = share.ownerName ? t("title", { name: share.ownerName }) : t("titleAnon");
  const description = [t("count", { count: share.cards.length }), ...counts(share).map((c) => tp(`rarity.${c.rarity}`, { count: c.count }))].join(" · ");
  const image = { url: `${API_URL}/shares/${id}/image`, width: 1600, height: 900, alt: title };
  return {
    title,
    description,
    // contenu partagé par un joueur : utile pour l'aperçu des réseaux sociaux, inutile dans les résultats de recherche
    robots: { index: false, follow: true },
    alternates: { canonical: `/tirage/${id}` },
    openGraph: { type: "website", title, description, url: `/tirage/${id}`, images: [image] },
    twitter: { card: "summary_large_image", title, description, images: [image.url] },
  };
}

export default async function SharePage({ params }: Props) {
  const { id } = await params;
  const share = await loadShare(id);
  if (!share) notFound();
  const [t, tp, format] = await Promise.all([getTranslations("seoPages.share"), getTranslations("packs.summary"), getFormatter()]);

  return (
    <article className="text-center">
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-fog">
        {format.dateTime(new Date(share.createdAt), { dateStyle: "long" })}
      </p>
      <h1 className="mt-3 font-display text-4xl font-semibold sm:text-6xl">
        {share.ownerName ? t("title", { name: share.ownerName }) : t("titleAnon")}
      </h1>
      <p className="prose-serif mt-3 text-lg text-pale-mist">{t("count", { count: share.cards.length })}</p>

      <ul className="mt-10 flex flex-wrap items-start justify-center gap-4 sm:gap-5">
        {share.cards.map((card) => (
          <li key={card.id} className="w-36 sm:w-44 lg:w-44">
            <WikiCard card={card} isNew={card.isNew} />
          </li>
        ))}
      </ul>

      <div className="mx-auto mt-10 flex w-fit flex-wrap items-center justify-center gap-x-5 gap-y-2 rounded-full border border-line bg-surface px-6 py-3 text-sm font-semibold">
        {counts(share).map(({ rarity, count }, i) => (
          <span key={rarity} className={`flex items-center gap-2 ${i > 0 ? "border-l border-line pl-5" : ""}`}>
            <i aria-hidden className="size-3 rounded-full" style={{ background: RARITY_COLOR[rarity] }} />
            {tp(`rarity.${rarity}`, { count })}
          </span>
        ))}
      </div>

      <section className="mx-auto mt-14 max-w-xl rounded-2xl border border-accent/40 bg-accent/10 p-8">
        <p className="prose-serif text-pale-mist">{t("ctaText")}</p>
        <Link
          href="/#login"
          className="mt-5 inline-flex rounded-xl bg-accent px-7 py-3 font-bold text-accent-foreground hover:bg-accent/80"
        >
          {t("cta")}
        </Link>
      </section>
    </article>
  );
}
