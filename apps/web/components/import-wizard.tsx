"use client";

import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import {
  IMPORT_BATCH_SIZE,
  IMPORT_MAX_CARDS,
  WIKI_MASTERS_ORIGINS,
  type ImportBatchResponse,
} from "@wikideck/shared";
import { BOOKMARKLET_KEYS, bookmarkletHref, type BookmarkletStrings } from "@/lib/bookmarklet";
import { apiCall } from "@/lib/tags-api";

type Phase = "idle" | "reading" | "read" | "importing" | "done" | "error";
type Entry = { title: string; lang: string; quantity: number };
type Totals = {
  imported: number;
  alreadyImported: number;
  notFound: number;
  otherLanguage: number;
};

const READ_ERROR_KEYS = ["login", "format", "down", "cancelled"] as const;
type ReadError = (typeof READ_ERROR_KEYS)[number];
const readError = (reason: string): ReadError =>
  (READ_ERROR_KEYS as readonly string[]).includes(reason) ? (reason as ReadError) : "down";

const QUEUE_RETRY_MS = 4000;
const QUEUE_MAX_TRIES = 20;
const RETRYABLE = [429, 500, 502, 503];
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function ImportWizard({ apiUrl }: { apiUrl: string }) {
  const t = useTranslations("importer");
  const locale = useLocale();
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
  const [errorKey, setErrorKey] = useState<ReadError | null>(null);
  const [counts, setCounts] = useState({ distinct: 0, french: 0 });

  useEffect(() => {
    // les textes du favori sont traduits ici : le script les reçoit tout faits
    const strings = Object.fromEntries(
      BOOKMARKLET_KEYS.map((key) => [
        key,
        t(`bookmarklet.${key}`, { total: "{total}", read: "{read}", max: "{max}" }),
      ]),
    ) as BookmarkletStrings;
    linkRef.current?.setAttribute("href", bookmarkletHref(location.origin, strings, locale));
  }, [t, locale]);

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
        setErrorKey(null);
        const all = [...entries.current.values()];
        setCounts({ distinct: all.length, french: all.filter((e) => e.lang === "fr").length });
        setRead({ cards: all.length, total: Number(d.total) || 0 });
      } else if (d.type === "done") {
        setPhase("read");
      } else if (d.type === "error") {
        setErrorKey(readError(String(d.reason)));
        setError(null);
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
              ? t("limit", { max: IMPORT_MAX_CARDS })
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
        <h2 className="text-lg font-bold">{t("howTo")}</h2>
        <ol className="mt-5 space-y-5">
          <li className="flex gap-4">
            <span className="flex size-7 shrink-0 items-center justify-center rounded-full border border-line text-xs font-bold">
              1
            </span>
            <div>
              <p className="font-medium">{t("step1.title")}</p>
              <p className="mt-1 text-sm text-pale-mist">
                {t("step1.text")}
              </p>
              <a
                ref={linkRef}
                href="#"
                draggable
                onClick={(e) => {
                  e.preventDefault();
                  setHint(true);
                }}
                className="mt-3 inline-flex cursor-grab rounded-full border border-accent bg-accent px-4.5 py-2.5 text-sm font-bold text-accent-foreground"
              >
                {t("step1.button")}
              </a>
              {hint && (
                <p className="mt-2 text-xs text-fog">
                  {t("step1.hint")}
                </p>
              )}
            </div>
          </li>
          <li className="flex gap-4">
            <span className="flex size-7 shrink-0 items-center justify-center rounded-full border border-line text-xs font-bold">
              2
            </span>
            <div>
              <p className="font-medium">{t("step2.title")}</p>
              <p className="mt-1 text-sm text-pale-mist">
                {t.rich("step2.text", {
                  link: (chunks) => (
                    <a
                      href="https://www.wiki-masters.com/collection"
                      target="_blank"
                      rel="noopener"
                      className="underline hover:text-foreground"
                    >
                      {chunks}
                    </a>
                  ),
                })}
              </p>
            </div>
          </li>
          <li className="flex gap-4">
            <span className="flex size-7 shrink-0 items-center justify-center rounded-full border border-line text-xs font-bold">
              3
            </span>
            <div>
              <p className="font-medium">{t("step3.title")}</p>
              <p className="mt-1 text-sm text-pale-mist">
                {t("step3.text")}
              </p>
            </div>
          </li>
        </ol>
      </section>

      <section aria-live="polite" className="rounded-xl border border-line bg-surface p-7 ">
        <h2 className="text-lg font-bold">{t("state")}</h2>

        {phase === "idle" && (
          <p className="mt-3 text-sm text-pale-mist">
            {t("idle")}
          </p>
        )}

        {phase === "reading" && (
          <p className="mt-3 text-sm text-pale-mist">
            {t("reading", { count: read.cards, total: read.total })}
          </p>
        )}

        {phase === "read" && (
          <div className="mt-3">
            <p className="text-sm text-pale-mist">
              {t.rich("read", {
                distinct: counts.distinct,
                french: importable,
                strong: (chunks) => <strong className="text-foreground">{chunks}</strong>,
              })}
            </p>
            <button
              type="button"
              onClick={runImport}
              disabled={importable === 0}
              className="mt-4 rounded-full border border-accent bg-accent px-4.5 py-2.5 text-sm font-bold text-accent-foreground transition-colors hover:bg-(--voltage-violet) hover:text-white disabled:opacity-40"
            >
              {t("importCount", { count: importable })}
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
              {phase === "importing" ? t("progress.running") : t("progress.finished")}{" "}
              {t.rich("progress.imported", {
                count: totals.imported,
                strong: (chunks) => <strong className="text-foreground">{chunks}</strong>,
              })}
              {totals.alreadyImported > 0 && t("progress.already", { count: totals.alreadyImported })}
              {totals.notFound > 0 && t("progress.notFound", { count: totals.notFound })}
              {totals.otherLanguage > 0 &&
                t("progress.otherLanguage", { count: totals.otherLanguage })}
              .
            </p>
            {waiting && (
              <p role="status" className="mt-2 text-xs text-fog">
                {t("waiting")}
              </p>
            )}
            {phase === "done" && (
              <Link
                href="/collection"
                className="mt-4 inline-flex rounded-full border border-accent bg-accent px-4.5 py-2.5 text-sm font-bold text-accent-foreground transition-colors hover:bg-(--voltage-violet) hover:text-white"
              >
                {t("viewCollection")}
              </Link>
            )}
          </div>
        )}

        {phase === "error" && (
          <p role="alert" className="mt-3 text-sm text-danger">
            {errorKey ? t(`readErrors.${errorKey}`) : error}
          </p>
        )}
      </section>

      <p className="text-xs leading-relaxed text-fog">
        {t("footnote", { max: IMPORT_MAX_CARDS })}
      </p>
    </div>
  );
}
