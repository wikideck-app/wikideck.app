import { ChevronDown } from "@/components/icons";
import { Reveal } from "@/components/reveal";

export type FaqItem = { q: string; a: string };

// questions fréquentes : le contenu est visible (et repris tel quel dans les données structurées FAQPage)
export function Faq({ items }: { items: FaqItem[] }) {
  return (
    <div className="mx-auto mt-12 grid max-w-3xl gap-3">
      {items.map((item, i) => (
        <Reveal key={item.q} delay={(i % 4) * 60}>
          <details className="group rounded-xl border border-line bg-surface open:border-accent">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 text-left font-semibold [&::-webkit-details-marker]:hidden">
              <h3 className="text-base font-semibold">{item.q}</h3>
              <ChevronDown className="size-5 shrink-0 transition-transform group-open:rotate-180" aria-hidden />
            </summary>
            <p className="prose-serif px-5 pb-5 text-pale-mist">{item.a}</p>
          </details>
        </Reveal>
      ))}
    </div>
  );
}
