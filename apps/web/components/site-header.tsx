import Image from "next/image";
import { useTranslations } from "next-intl";

const LINKS = [
  { href: "#cards", key: "cards" },
  { href: "#game", key: "game" },
] as const;

// barre posée en haut du panneau d'accueil : pastille du logo, liens en pastilles blanches
// à contour noir, bouton plein à droite
export function SiteHeader() {
  const t = useTranslations("home.header");
  return (
    <header className="fade-up relative z-20 flex items-center justify-between gap-3 p-4 sm:p-6">
      <a
        href="#top"
        aria-label={t("homeLabel")}
        className="flex items-center gap-3 rounded-full border border-black bg-white p-1.5 pr-4 transition-colors hover:bg-(--sunburst)"
      >
        <Image src="/logo.webp" alt="" width={96} height={96} priority className="size-10" />
        <span className="hidden text-base font-bold uppercase tracking-[0.03em] sm:inline">
          Wikideck
        </span>
      </a>

      <nav className="flex items-center gap-2">
        <ul className="hidden items-center gap-2 sm:flex">
          {LINKS.map((l) => (
            <li key={l.href}>
              <a
                href={l.href}
                className="inline-flex rounded-full border border-black bg-white px-5 py-3 text-sm font-bold uppercase tracking-[0.03em] transition-colors hover:bg-(--sunburst)"
              >
                {t(`links.${l.key}`)}
              </a>
            </li>
          ))}
        </ul>
        <a
          href="#login"
          className="rounded-full border border-black bg-black px-5 py-3 text-sm font-bold uppercase tracking-[0.03em] text-white transition-colors hover:bg-(--voltage-violet)"
        >
          {t("signIn")}
        </a>
      </nav>
    </header>
  );
}
