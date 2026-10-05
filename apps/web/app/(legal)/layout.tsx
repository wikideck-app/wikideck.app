import Image from "next/image";
import Link from "next/link";
import { LegalLinks } from "@/components/legal/legal-links";

export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <header className="border-b border-line">
        <div className="mx-auto flex h-16 w-full max-w-3xl items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-3" aria-label="Wikideck, accueil">
            <Image src="/logo.webp" alt="" width={96} height={96} className="size-9" />
            <span className="text-lg font-bold tracking-tight">Wikideck</span>
          </Link>
          <Link href="/" className="text-xs text-pale-mist hover:text-foreground">
            Retour au site
          </Link>
        </div>
      </header>
      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-12">{children}</main>
      <footer className="border-t border-line">
        <div className="mx-auto w-full max-w-3xl px-6 py-6 text-xs text-fog">
          <LegalLinks />
        </div>
      </footer>
    </div>
  );
}
