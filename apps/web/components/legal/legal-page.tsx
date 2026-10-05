import { LEGAL, TODO } from "@/lib/legal";

export function LegalHeader({ title, intro }: { title: string; intro?: string }) {
  return (
    <header>
      <h1 className="font-display text-4xl font-medium sm:text-5xl">{title}</h1>
      <p className="mt-3 text-xs text-fog">Dernière mise à jour : {LEGAL.updatedAt}</p>
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

export function Fill({ value }: { value: string }) {
  return value === TODO ? (
    <mark className="rounded bg-accent/15 px-1.5 py-0.5 text-xs font-bold not-italic text-foreground">
      [{TODO}]
    </mark>
  ) : (
    <>{value}</>
  );
}
