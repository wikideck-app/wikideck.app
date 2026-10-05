"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  IMPORT_BATCH_SIZE,
  IMPORT_MAX_CARDS,
  WIKI_MASTERS_ORIGINS,
  type ImportBatchResponse,
} from "@wikideck/shared";
import { bookmarkletHref } from "@/lib/bookmarklet";
import { apiCall } from "@/lib/tags-api";

type Phase = "idle" | "reading" | "read" | "importing" | "done" | "error";
type Entry = { title: string; lang: string; quantity: number };
type Totals = {
  imported: number;
  alreadyImported: number;
  notFound: number;
  otherLanguage: number;
};

const READ_ERRORS: Record<string, string> = {
  login: "Vous n'êtes pas connecté à Wiki-Masters. Connectez-vous, puis relancez le favori.",
  format: "Wiki-Masters a changé : l'import ne sait plus lire votre collection.",
  down: "Wiki-Masters ne répond pas. Réessayez dans un moment.",
  cancelled: "Import annulé depuis Wiki-Masters.",
};

const QUEUE_RETRY_MS = 4000;
const QUEUE_MAX_TRIES = 20;
const RETRYABLE = [429, 500, 502, 503];
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
const fmt = new Intl.NumberFormat("fr-FR");

export function ImportWizard({ apiUrl }: { apiUrl: string }) {
  const linkRef = useRef<HTMLAnchorElement>(null);
  const entries = useRef(new Map<string, Entry>());
  const [phase, setPhase] = useState<Phase>("idle");
  const [read, setRead] = useState({ cards: 0, total: 0 });
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [totals, setTotals] = useState<Totals>({
    imported: 0,
    alreadyImported: 0,
    notFound: 0,
    otherLanguage: 0,
  });
  const [hint, setHint] = useState(false);
  const [waiting, setWaiting] = useState(false);
  const [counts, setCounts] = useState({ distinct: 0, french: 0 });

  useEffect(() => {
    linkRef.current?.setAttribute("href", bookmarkletHref(location.origin));
  }, []);

  useEffect(() => {
    function onMessage(e: MessageEvent) {
      if (!WIKI_MASTERS_ORIGINS.includes(e.origin)) return;
      const d = e.data as Record<string, unknown> | null;
      if (!d || d.app !== "wikideck" || d.v !== 1) return;

      if (d.type === "hello") {
        (e.source as Window | null)?.postMessage(
          { app: "wikideck", v: 1, type: "ready" },
          e.origin,
        );
      } else if (d.type === "page" && Array.isArray(d.items)) {
        for (const raw of d.items.slice(0, 500)) {
          const item = raw as { t?: unknown; l?: unknown };
          if (typeof item.t !== "string" || typeof item.l !== "string") continue;
          const title = item.t.trim().slice(0, 255);
          if (!title) continue;
          const lang = item.l.toLowerCase().slice(0, 8);
          const key = `${lang}:${title.toLowerCase()}`;
          const known = entries.current.get(key);
          if (known) known.quantity = Math.min(99, known.quantity + 1);
          else entries.current.set(key, { title, lang, quantity: 1 });
        }
        setPhase((p) => (p === "idle" || p === "error" ? "reading" : p));
        setError(null);
        const all = [...entries.current.values()];
        setCounts({ distinct: all.length, french: all.filter((e) => e.lang === "fr").length });
        setRead({ cards: all.length, total: Number(d.total) || 0 });
      } else if (d.type === "done") {
        setPhase("read");
      } else if (d.type === "error") {
        setError(READ_ERRORS[String(d.reason)] ?? READ_ERRORS.down);
        setPhase("error");
      }
    }
    addEventListener("message", onMessage);
    return () => removeEventListener("message", onMessage);
  }, []);

  async function runImport() {
    setPhase("importing");
    setError(null);
    const all = [...entries.current.values()];
    const french = all.filter((e) => e.lang === "fr");
    const sum: Totals = {
      imported: 0,
      alreadyImported: 0,
      notFound: 0,
      otherLanguage: all.length - french.length,
    };
    setTotals({ ...sum });

    const chunks: Entry[][] = [];
    for (let i = 0; i < french.length; i += IMPORT_BATCH_SIZE) {
      chunks.push(french.slice(i, i + IMPORT_BATCH_SIZE));
    }

    let next = 0;
    let finished = 0;
    let stopped = false;
    let limitReached = false;

    async function worker() {
      while (!stopped) {
        const index = next++;
        if (index >= chunks.length) return;
        const items = chunks[index];

        let result = await apiCall<ImportBatchResponse>(apiUrl, "/import/batch", "POST", { items });
        for (let tries = 0; !result.ok && RETRYABLE.includes(result.status ?? 0); tries++) {
          if (tries >= QUEUE_MAX_TRIES || stopped) break;
          setWaiting(true);
          await wait(QUEUE_RETRY_MS);
          result = await apiCall<ImportBatchResponse>(apiUrl, "/import/batch", "POST", { items });
        }
        setWaiting(false);

        if (!result.ok) {
          stopped = true;
          setError(
            result.code === "import_limit"
              ? `Limite de ${fmt.format(IMPORT_MAX_CARDS)} cartes importées atteinte.`
              : result.message,
          );
          setPhase("error");
          return;
        }
        sum.imported += result.data.imported;
        sum.alreadyImported += result.data.alreadyImported;
        sum.notFound += result.data.notFound;
        setTotals({ ...sum });
        finished++;
        setProgress(finished / chunks.length);
        if (result.data.remaining <= 0) {
          limitReached = true;
          stopped = true;
        }
      }
    }
    await Promise.all([worker(), worker()]);
    if (stopped && !limitReached) return;
    setProgress(1);
    setPhase("done");
  }

  const importable = counts.french;

  return (
    <div className="mx-auto mt-10 grid max-w-3xl gap-4">
      <section className="rounded-xl border border-line bg-surface p-7 ">
        <h2 className="text-lg font-bold">Comment faire</h2>
        <ol className="mt-5 space-y-5">
          <li className="flex gap-4">
            <span className="flex size-7 shrink-0 items-center justify-center rounded-full border border-line text-xs font-bold">
              1
            </span>
            <div>
              <p className="font-medium">Ajoutez ce favori à votre navigateur</p>
              <p className="mt-1 text-sm text-pale-mist">
                Glissez le bouton ci-dessous dans votre barre de favoris (ne cliquez pas dessus
                ici).
              </p>
              <a
                ref={linkRef}
                href="#"
                draggable
                onClick={(e) => {
                  e.preventDefault();
                  setHint(true);
                }}
                className="mt-3 inline-flex cursor-grab rounded-[20px] bg-accent px-4.5 py-2.5 text-sm font-bold text-accent-foreground"
              >
                Importer vers Wikideck
              </a>
              {hint && (
                <p className="mt-2 text-xs text-fog">
                  Faites-le glisser dans la barre de favoris plutôt que de cliquer.
                </p>
              )}
            </div>
          </li>
          <li className="flex gap-4">
            <span className="flex size-7 shrink-0 items-center justify-center rounded-full border border-line text-xs font-bold">
              2
            </span>
            <div>
              <p className="font-medium">Lancez-le depuis Wiki-Masters</p>
              <p className="mt-1 text-sm text-pale-mist">
                Ouvrez{" "}
                <a
                  href="https://www.wiki-masters.com/collection"
                  target="_blank"
                  rel="noopener"
                  className="underline hover:text-foreground"
                >
                  wiki-masters.com
                </a>
                , connectez-vous, puis cliquez sur le favori. Autorisez les pop-up si on vous le
                demande.
              </p>
            </div>
          </li>
          <li className="flex gap-4">
            <span className="flex size-7 shrink-0 items-center justify-center rounded-full border border-line text-xs font-bold">
              3
            </span>
            <div>
              <p className="font-medium">Validez ici</p>
              <p className="mt-1 text-sm text-pale-mist">
                Cette page lit votre collection puis vous laisse confirmer l&apos;import.
              </p>
            </div>
          </li>
        </ol>
      </section>

      <section aria-live="polite" className="rounded-xl border border-line bg-surface p-7 ">
        <h2 className="text-lg font-bold">État</h2>

        {phase === "idle" && (
          <p className="mt-3 text-sm text-pale-mist">
            En attente de votre collection Wiki-Masters…
          </p>
        )}

        {phase === "reading" && (
          <p className="mt-3 text-sm text-pale-mist">
            Lecture en cours : {fmt.format(read.cards)} article{read.cards > 1 ? "s" : ""} reçu
            {read.cards > 1 ? "s" : ""}
            {read.total ? ` sur ${fmt.format(read.total)} cartes` : ""}…
          </p>
        )}

        {phase === "read" && (
          <div className="mt-3">
            <p className="text-sm text-pale-mist">
              {fmt.format(counts.distinct)} article{counts.distinct > 1 ? "s" : ""} différent
              {counts.distinct > 1 ? "s" : ""} lu{counts.distinct > 1 ? "s" : ""}, dont{" "}
              <strong className="text-foreground">{fmt.format(importable)}</strong> en français
              importable
              {importable > 1 ? "s" : ""}.
            </p>
            <button
              type="button"
              onClick={runImport}
              disabled={importable === 0}
              className="mt-4 rounded-[20px] bg-accent px-4.5 py-2.5 text-sm font-bold text-accent-foreground transition-colors hover:bg-accent/70 disabled:opacity-40"
            >
              Importer {fmt.format(importable)} carte{importable > 1 ? "s" : ""}
            </button>
          </div>
        )}

        {(phase === "importing" || phase === "done") && (
          <div className="mt-3">
            <div className="h-1 overflow-hidden rounded-full bg-accent/15">
              <div
                className="h-full bg-accent transition-[width] duration-500"
                style={{ width: `${Math.round(progress * 100)}%` }}
              />
            </div>
            <p className="mt-3 text-sm text-pale-mist">
              {phase === "importing" ? "Import en cours… " : "Import terminé. "}
              <strong className="text-foreground">{fmt.format(totals.imported)}</strong> carte
              {totals.imported > 1 ? "s" : ""} ajoutée{totals.imported > 1 ? "s" : ""}
              {totals.alreadyImported > 0 &&
                `, ${fmt.format(totals.alreadyImported)} déjà importée${totals.alreadyImported > 1 ? "s" : ""}`}
              {totals.notFound > 0 &&
                `, ${fmt.format(totals.notFound)} introuvable${totals.notFound > 1 ? "s" : ""}`}
              {totals.otherLanguage > 0 &&
                `, ${fmt.format(totals.otherLanguage)} ignorée${totals.otherLanguage > 1 ? "s" : ""} (autre langue)`}
              .
            </p>
            {waiting && (
              <p role="status" className="mt-2 text-xs text-fog">
                Wikipédia limite le débit : nouvelle tentative dans quelques secondes…
              </p>
            )}
            {phase === "done" && (
              <Link
                href="/collection"
                className="mt-4 inline-flex rounded-[20px] bg-accent px-4.5 py-2.5 text-sm font-bold text-accent-foreground transition-colors hover:bg-accent/70"
              >
                Voir ma collection
              </Link>
            )}
          </div>
        )}

        {phase === "error" && (
          <p role="alert" className="mt-3 text-sm text-danger">
            {error}
          </p>
        )}
      </section>

      <p className="text-xs leading-relaxed text-fog">
        Seuls les articles en français sont importés. La rareté est recalculée avec les vues
        actuelles de Wikipédia, pas reprise de Wiki-Masters. Un article ne peut être importé
        qu&apos;une seule fois, dans la limite de {fmt.format(IMPORT_MAX_CARDS)} cartes par compte.
      </p>
    </div>
  );
}
