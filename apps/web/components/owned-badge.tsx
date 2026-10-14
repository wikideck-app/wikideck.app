import { Check } from "@/components/icons";

// pastille « déjà possédée » (marché)
export function OwnedPill({ label, className = "" }: { label: string; className?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full bg-black/75 px-2 py-0.5 text-[10px] font-bold text-success ring-1 ring-success/60 ${className}`}
    >
      <Check className="size-3" strokeWidth={3} aria-hidden />
      {label}
    </span>
  );
}

// petite pastille ronde dans le coin d'une carte miniature (sélecteur d'échange) : le texte est dans l'infobulle
export function OwnedDot({ label }: { label: string }) {
  return (
    <span
      title={label}
      role="img"
      aria-label={label}
      className="pointer-events-none absolute right-1 top-1 z-10 flex size-5 items-center justify-center rounded-full bg-success text-black shadow ring-2 ring-black/40"
    >
      <Check className="size-3" strokeWidth={3.5} aria-hidden />
    </span>
  );
}

// bandeau sous une carte (lignes d'échange) : « l'autre joueur la possède déjà », ou « vous l'avez déjà »
export function OwnedBar({ label }: { label: string }) {
  return (
    <span className="mt-2 flex items-center justify-center gap-1.5 rounded-lg bg-success/15 px-2 py-1 text-xs font-bold text-success ring-1 ring-success/40">
      <Check className="size-3.5 shrink-0" strokeWidth={3} aria-hidden />
      <span className="truncate">{label}</span>
    </span>
  );
}
