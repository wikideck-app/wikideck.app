import { notFound } from "next/navigation";
import { NAV } from "@/lib/nav";

export const dynamicParams = false;

export function generateStaticParams() {
  return NAV.filter(
    (item) =>
      ![
        "packs",
        "collection",
        "settings",
        "trades",
        "cards",
        "market",
        "guild",
        "friends",
        "messages",
        "achievements",
        "profile",
        "battle",
      ].includes(item.slug),
  ).map(({ slug }) => ({ section: slug }));
}

export default async function SectionPage({ params }: PageProps<"/[section]">) {
  const { section } = await params;
  const item = NAV.find((n) => n.slug === section);
  if (!item) notFound();

  return (
    <div className="mx-auto max-w-xl text-center">
      <h1 className="font-display text-5xl font-medium">{item.label}</h1>
      <p className="prose-serif mt-2 text-pale-mist">Bientôt disponible.</p>
    </div>
  );
}
