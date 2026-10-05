import { TICKER_TITLES } from "@/lib/showcase";

export function Ticker() {
  return (
    <div
      aria-hidden
      className="relative z-10 overflow-hidden border-y border-line py-4 [mask-image:linear-gradient(to_right,transparent,#000_12%,#000_88%,transparent)]"
    >
      <div className="animate-ticker flex w-max">
        {[0, 1].map((copy) => (
          <ul key={copy} className="flex shrink-0 items-center">
            {TICKER_TITLES.map((title) => (
              <li
                key={title}
                className="flex items-center text-xs font-medium uppercase tracking-[0.2em] text-fog"
              >
                <span className="px-6">{title}</span>
                <span className="text-line">·</span>
              </li>
            ))}
          </ul>
        ))}
      </div>
    </div>
  );
}
