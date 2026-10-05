import Link from "next/link";
import { LEGAL_LINKS } from "@/lib/legal";

export function LegalLinks({ className = "" }: { className?: string }) {
  return (
    <nav
      aria-label="Informations légales"
      className={`flex flex-wrap gap-x-4 gap-y-1 ${className}`}
    >
      {LEGAL_LINKS.map((l) => (
        <Link
          key={l.href}
          href={l.href}
          className="underline-offset-2 hover:text-foreground hover:underline"
        >
          {l.label}
        </Link>
      ))}
    </nav>
  );
}
