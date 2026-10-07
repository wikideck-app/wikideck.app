import { useTranslations } from "next-intl";
import { BookOpen, Castle, Gavel, Handshake, Puzzle, Swords } from "@/components/icons";
import { Reveal } from "@/components/reveal";

const FEATURES = [
  { key: "packs", icon: Puzzle },
  { key: "album", icon: BookOpen },
  { key: "battle", icon: Swords },
  { key: "trades", icon: Handshake },
  { key: "auctions", icon: Gavel },
  { key: "guild", icon: Castle },
] as const;

export function Features() {
  const t = useTranslations("home.features");
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {FEATURES.map(({ key, icon: Icon }, i) => (
        <Reveal key={key} delay={(i % 3) * 120}>
          <article className="group h-full rounded-xl border border-line bg-surface p-7 transition-colors duration-300 hover:border-accent">
            <div className="flex items-start justify-between">
              <Icon className="size-6 transition-transform duration-500 group-hover:-translate-y-1" />
            </div>
            <h3 className="mt-6 text-lg font-bold">{t(`${key}.title`)}</h3>
            <p className="prose-serif mt-2 text-pale-mist">{t(`${key}.text`)}</p>
          </article>
        </Reveal>
      ))}
    </div>
  );
}
