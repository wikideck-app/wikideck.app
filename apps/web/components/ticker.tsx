import { TICKER_TITLES } from "@/lib/showcase";

// bandeau d'annonce tout en haut : lavande, capitales, défile en boucle
export function Ticker() {
  return (
    <div
      aria-hidden
      className="relative z-30 overflow-hidden border-b border-black bg-(--lavender) py-2.5 text-black"
    >
      <div className="animate-ticker flex w-max">
        {[0, 1].map((copy) => (
          <ul key={copy} className="flex shrink-0 items-center">
            {TICKER_TITLES.map((title) => (
              <li key={title} className="flex items-center text-xs font-bold uppercase tracking-[0.04em]">
                <span className="px-6">{title}</span>
                <span className="opacity-40">·</span>
              </li>
            ))}
          </ul>
        ))}
      </div>
    </div>
  );
}
