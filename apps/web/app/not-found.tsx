import Link from "next/link";
import { buttonClass } from "@/components/settings/controls";

export const metadata = { title: "Page introuvable — Wikideck" };

export default function NotFound() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
      <p className="font-display text-8xl font-medium text-accent">404</p>
      <h1 className="font-display text-3xl font-medium">Cette page n&apos;existe pas</h1>
      <div className="mt-2 flex flex-wrap justify-center gap-3">
        <Link href="/" className={buttonClass}>
          Retour à l&apos;accueil
        </Link>
        <Link href="/cards" className={buttonClass}>
          Parcourir les cartes
        </Link>
      </div>
    </main>
  );
}
