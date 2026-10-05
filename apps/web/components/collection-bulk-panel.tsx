"use client";

import { Check, Plus, Recycle, X } from "@/components/icons";
import { useEffect, useState } from "react";
import {
  PROTECTED_WORDS_MAX,
  PROTECTED_WORD_MAX,
  PROTECTED_WORD_MIN,
  RARITIES,
  cleanWord,
  foldText,
  type BulkItem,
  type BulkPreviewResponse,
  type DuplicatesResponse,
  type Rarity,
  type RecycleResponse,
} from "@wikideck/shared";
import { buttonClass, dangerButtonClass } from "@/components/settings/controls";
import { Wikibits } from "@/components/wikibit";
import { RARITY_COLOR } from "@/lib/rarity-ui";
import { useSettings } from "@/lib/settings-context";
import { apiFetch, apiCall } from "@/lib/tags-api";

const num = new Intl.NumberFormat("fr-FR");
const MAX_VIEWS = 100_000;

const toSlider = (views: number) => Math.round((Math.log10(Math.max(1, views)) / 5) * 1000);
const fromSlider = (t: number) => Math.max(1, Math.round(10 ** ((t / 1000) * 5)));

const heading = "text-xs font-bold uppercase tracking-[0.2em] text-fog";

export function CollectionBulkPanel({
  apiUrl,
  pageCardIds,
  onDuplicates,
  onDone,
}: {
  apiUrl: string;
  pageCardIds: string[];
  onDuplicates: () => void;
  onDone: (result: RecycleResponse) => void;
}) {
  const { settings, update, status } = useSettings();
  const words = settings.collection.protectedWords;

  const [scope, setScope] = useState<"page" | "all">("all");
  const [maxViews, setMaxViews] = useState(30);
  const [viewsText, setViewsText] = useState("30");
  const [picked, setPicked] = useState<Set<Rarity>>(new Set(["COMMON", "UNCOMMON"]));
  const [preview, setPreview] = useState<BulkPreviewResponse | null>(null);
  const [draft, setDraft] = useState("");
  const [help, setHelp] = useState(false);
  const [duplicates, setDuplicates] = useState<number | null>(null);
  const [review, setReview] = useState<{ items: BulkItem[]; truncated: boolean } | null>(null);
  const [excluded, setExcluded] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<RecycleResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void apiFetch<DuplicatesResponse>(apiUrl, "/collection/duplicates").then((res) => {
      if (!cancelled && res.ok) setDuplicates(res.data.rarities.reduce((n, r) => n + r.cards, 0));
    });
    return () => {
      cancelled = true;
    };
  }, [apiUrl]);

  const pageKey = pageCardIds.join(",");
  useEffect(() => {
    // le serveur lit les mots protégés dans les réglages enregistrés, on attend la fin de la sauvegarde
    if (status === "saving") return;
    const id = setTimeout(async () => {
      const res = await apiCall<BulkPreviewResponse>(apiUrl, "/collection/bulk-preview", "POST", {
        maxViews,
        ...(scope === "page" && { cardIds: pageKey ? pageKey.split(",") : [] }),
      });
      if (res.ok) {
        setPreview(res.data);
        setError(null);
      } else setError(res.message);
    }, 250);
    return () => clearTimeout(id);
  }, [apiUrl, maxViews, scope, pageKey, status]);

  const resetReview = () => {
    setReview(null);
    setExcluded(new Set());
    setSearch("");
  };
  const setViews = (v: number) => {
    resetReview();
    const clamped = Math.min(MAX_VIEWS, Math.max(1, v));
    setMaxViews(clamped);
    setViewsText(String(clamped));
  };

  const countOf = (rarity: Rarity) =>
    preview?.rarities.find((r) => r.rarity === rarity)?.cards ?? 0;
  const rows = (preview?.rarities ?? []).filter((r) => picked.has(r.rarity));
  const cards = rows.reduce((n, r) => n + r.cards, 0);
  const total = rows.reduce((n, r) => n + r.wikibits, 0);
  const scopeIds = scope === "page" ? { cardIds: pageCardIds } : {};
  const kept = review ? review.items.filter((i) => !excluded.has(i.id)) : [];
  const keptTotal = kept.reduce((n, i) => n + i.wikibits, 0);
  const keptCopies = kept.reduce((n, i) => n + i.quantity, 0);
  const folded = foldText(search);
  const shown = review
    ? review.items.filter((i) => !folded || foldText(i.title).includes(folded))
    : [];

  async function openReview() {
    setBusy(true);
    setError(null);
    setResult(null);
    const res = await apiCall<BulkPreviewResponse>(apiUrl, "/collection/bulk-preview", "POST", {
      maxViews,
      list: true,
      rarities: rows.map((r) => r.rarity),
      ...scopeIds,
    });
    setBusy(false);
    if (!res.ok) return setError(res.message);
    setExcluded(new Set());
    setSearch("");
    setReview({ items: res.data.items ?? [], truncated: res.data.truncated ?? false });
  }

  async function confirm() {
    if (!review) return;
    setBusy(true);
    setError(null);
    const res = await apiCall<RecycleResponse>(apiUrl, "/collection/recycle", "POST", {
      bulk: {
        maxViews,
        rarities: rows.map((r) => r.rarity),
        ...scopeIds,
        ...(excluded.size && { excludeIds: [...excluded] }),
      },
    });
    setBusy(false);
    if (!res.ok) return setError(res.message);
    resetReview();
    setResult(res.data);
    setDuplicates(null);
    onDone(res.data);
  }

  const toggleExcluded = (id: string) =>
    setExcluded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const settled = status !== "saving" && status !== "error";

  const addWords = (raw: string) => {
    const known = new Set(words.map(foldText));
    const fresh: string[] = [];
    for (const part of raw.split(/[,;\n]+/)) {
      const w = cleanWord(part);
      const key = foldText(w);
      if (key.length < PROTECTED_WORD_MIN || w.length > PROTECTED_WORD_MAX || known.has(key))
        continue;
      known.add(key);
      fresh.push(w);
    }
    setDraft("");
    if (!fresh.length) return;
    resetReview();
    update((s) => ({
      ...s,
      collection: {
        ...s.collection,
        protectedWords: [...s.collection.protectedWords, ...fresh].slice(0, PROTECTED_WORDS_MAX),
      },
    }));
  };
  const removeWord = (w: string) => {
    resetReview();
    update((s) => ({
      ...s,
      collection: {
        ...s.collection,
        protectedWords: s.collection.protectedWords.filter((x) => x !== w),
      },
    }));
  };

  return (
    <section
      aria-label="Recyclage groupé"
      className="mt-8 rounded-xl border border-line bg-surface p-5 text-left"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold">Recyclage groupé</h2>
          <p className="mt-0.5 text-sm text-pale-mist">
            Faites le tri parmi vos cartes peu consultées, sans toucher à celles qui comptent.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" className={`${buttonClass} !py-1.5`} onClick={onDuplicates}>
            Doublons{duplicates !== null && ` (${num.format(duplicates)})`}
          </button>
          <button
            type="button"
            aria-expanded={help}
            onClick={() => setHelp((h) => !h)}
            className="text-sm text-pale-mist underline hover:text-foreground"
          >
            Comment ça marche ?
          </button>
        </div>
      </div>

      {help && (
        <p className="prose-serif mt-3 rounded-xl border border-line p-3 text-sm text-pale-mist">
          Chaque carte rapporte des wikibits selon sa rareté (C 1 · PC 2 · R 5 · SR 10 · UR 15 · L
          20) et tous ses exemplaires partent. Le seuil compte les vues de l&apos;article Wikipédia
          sur 30 jours : plus il est bas, plus les cartes visées sont discrètes. Les chiffres des
          raretés comptent les cartes sous le seuil ; cochez celles que vous voulez recycler.
        </p>
      )}

      <h3 className={`${heading} mt-5`}>Cartes peu consultées</h3>
      <p className="mt-1 text-sm text-pale-mist">
        Cartes mises en avant sur votre profil, carte vitrine et cartes d&apos;un échange en attente
        sont toujours conservées.
      </p>

      <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-3">
        <div className="flex items-center gap-2 text-sm">
          <span className="text-fog">Cartes de</span>
          <div className="flex gap-1 rounded-full border border-line p-1" role="group">
            {(
              [
                ["page", "Cette page"],
                ["all", "Toute la collection"],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                aria-pressed={scope === value}
                onClick={() => {
                  resetReview();
                  setScope(value);
                }}
                className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                  scope === value ? "bg-accent text-accent-foreground" : "hover:bg-foreground/10"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex min-w-64 flex-1 items-center gap-3 text-sm">
          <span className="text-fog">sous</span>
          <input
            type="range"
            min={0}
            max={1000}
            value={toSlider(maxViews)}
            onChange={(e) => setViews(fromSlider(Number(e.target.value)))}
            aria-label="Seuil de vues"
            className="min-w-0 flex-1 accent-[var(--accent)]"
          />
          <label className="flex items-center gap-1.5 whitespace-nowrap">
            <input
              type="text"
              inputMode="numeric"
              value={viewsText}
              onChange={(e) => {
                const digits = e.target.value.replace(/\D/g, "").slice(0, 6);
                setViewsText(digits);
                resetReview();
                if (digits) setMaxViews(Math.min(MAX_VIEWS, Math.max(1, Number(digits))));
              }}
              onBlur={() => setViews(Number(viewsText) || 1)}
              aria-label="Nombre de vues"
              className="w-20 rounded-[20px] border border-line bg-transparent px-2.5 py-1 text-right text-sm outline-none focus:border-accent"
            />
            <span className="text-fog">vues sur 30 jours</span>
          </label>
        </div>

        <div className="flex flex-wrap gap-1" role="group" aria-label="Seuils rapides">
          {[10, 30, 100, 300, 1000].map((v) => (
            <button
              key={v}
              type="button"
              aria-pressed={maxViews === v}
              onClick={() => setViews(v)}
              className="rounded-full border border-line px-2.5 py-0.5 text-xs font-semibold tabular-nums hover:bg-foreground/10 aria-pressed:border-accent aria-pressed:bg-accent aria-pressed:text-accent-foreground"
            >
              {num.format(v)}
            </button>
          ))}
        </div>

        <div className="ml-auto flex flex-wrap items-center gap-3">
          <span className="text-sm font-bold">
            {preview ? num.format(cards) : "…"}{" "}
            <span className="font-normal text-fog">
              carte{cards > 1 ? "s" : ""} concernée{cards > 1 ? "s" : ""}
            </span>
          </span>
          <button
            type="button"
            className={dangerButtonClass}
            disabled={cards === 0 || !settled || busy}
            onClick={openReview}
          >
            <Recycle className="size-4" /> Passer en revue {num.format(cards)} carte
            {cards > 1 ? "s" : ""}
            {cards > 0 && (
              <span className="inline-flex items-center gap-1 opacity-90">
                (+
                <Wikibits amount={total} />)
              </span>
            )}
          </button>
        </div>
      </div>
      {error && (
        <p role="alert" className="mt-3 text-sm text-danger">
          {error}
        </p>
      )}
      {status === "error" && (
        <p role="alert" className="mt-3 text-sm text-danger">
          Vos mots protégés n&apos;ont pas pu être enregistrés : le recyclage est suspendu.
          Réessayez en modifiant la liste.
        </p>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div>
          <h3 className={heading}>Toujours garder</h3>
          <p className="mt-1 text-xs leading-relaxed text-pale-mist">
            Un mot du titre ou d&apos;une étiquette suffit : « chanteur » protège aussi « chanteurs
            ».
          </p>
          <form
            className="mt-3 flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              addWords(draft);
            }}
          >
            <input
              value={draft}
              onChange={(e) => {
                const v = e.target.value;
                if (/[,;]$/.test(v)) addWords(v);
                else setDraft(v);
              }}
              onPaste={(e) => {
                const text = e.clipboardData.getData("text");
                if (/[,;\n]/.test(text)) {
                  e.preventDefault();
                  addWords(text);
                }
              }}
              placeholder="Un mot, puis Entrée (ou une liste séparée par des virgules)"
              aria-label="Mot à toujours garder"
              className="min-w-0 flex-1 rounded-[20px] border border-line bg-transparent px-3 py-2 text-sm outline-none focus:border-accent"
            />
            <button
              type="submit"
              className={buttonClass}
              disabled={!foldText(draft) || words.length >= PROTECTED_WORDS_MAX}
            >
              <Plus className="size-4" /> Ajouter
            </button>
          </form>
          {words.length > 0 && (
            <ul className="mt-3 flex flex-wrap gap-1.5">
              {words.map((w) => (
                <li
                  key={w}
                  className="flex items-center gap-1 rounded-full border border-line py-0.5 pl-3 pr-1 text-sm"
                >
                  {w}
                  <button
                    type="button"
                    aria-label={`Ne plus protéger « ${w} »`}
                    onClick={() => removeWord(w)}
                    className="flex size-5 items-center justify-center rounded-full opacity-60 hover:bg-foreground/10 hover:opacity-100"
                  >
                    <X className="size-3" />
                  </button>
                </li>
              ))}
            </ul>
          )}
          {preview && preview.protectedCards > 0 && (
            <p className="mt-3 text-xs text-fog">
              {num.format(preview.protectedCards)} carte{preview.protectedCards > 1 ? "s" : ""} sous
              le seuil {preview.protectedCards > 1 ? "sont épargnées" : "est épargnée"} :{" "}
              {(
                [
                  ["favorite", "favorites"],
                  ["featured", "mises en avant"],
                  ["showcase", "en vitrine"],
                  ["trade", "dans un échange"],
                  ["word", "mot protégé"],
                ] as const
              )
                .filter(([k]) => preview.protectedReasons[k] > 0)
                .map(([k, label]) => `${num.format(preview.protectedReasons[k])} ${label}`)
                .join(", ")}
              .
            </p>
          )}
        </div>

        <div>
          <h3 className={heading}>Raretés à recycler</h3>
          <p className="mt-1 text-xs leading-relaxed text-pale-mist">
            Cochez les raretés concernées. Le chiffre compte les cartes sous le seuil.
          </p>
          <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-6">
            {RARITIES.map((r) => (
              <button
                key={r.value}
                type="button"
                title={r.label}
                aria-pressed={picked.has(r.value)}
                onClick={() => {
                  resetReview();
                  setPicked((prev) => {
                    const next = new Set(prev);
                    if (next.has(r.value)) next.delete(r.value);
                    else next.add(r.value);
                    return next;
                  });
                }}
                style={{ color: RARITY_COLOR[r.value] }}
                className="flex flex-col items-center rounded-xl border-2 border-line px-1 py-2 transition-colors hover:bg-foreground/5 aria-pressed:border-current aria-pressed:bg-foreground/10"
              >
                <strong className="text-base">{r.code}</strong>
                <span className="text-xs tabular-nums text-foreground opacity-80">
                  {num.format(countOf(r.value))}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {result && (
        <div
          role="status"
          className="mt-6 flex items-center gap-3 rounded-xl border border-success/40 bg-success/10 p-4"
        >
          <Check className="size-6 shrink-0 text-success" />
          <p className="text-sm">
            <strong className="inline-flex items-center gap-1 text-base">
              +<Wikibits amount={result.gained} />
            </strong>{" "}
            · {num.format(result.copies)} exemplaire{result.copies > 1 ? "s" : ""} recyclé
            {result.copies > 1 ? "s" : ""}. Nouveau solde : {num.format(result.wikibits)} wikibits.
          </p>
          <button
            type="button"
            aria-label="Fermer"
            onClick={() => setResult(null)}
            className="ml-auto flex size-7 items-center justify-center rounded-full hover:bg-foreground/10"
          >
            <X className="size-4" />
          </button>
        </div>
      )}

      {review && (
        <div className="mt-6 rounded-xl border border-line p-4" aria-label="Revue des cartes">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="font-bold">
                {num.format(kept.length)} carte{kept.length > 1 ? "s" : ""} à recycler
              </h3>
              <p className="text-xs text-fog">
                Retirez celles que vous voulez garder, rien n&apos;est supprimé avant confirmation.
              </p>
            </div>
            <div className="flex items-center gap-2">
              {excluded.size > 0 && (
                <button
                  type="button"
                  className={`${buttonClass} !py-1.5`}
                  onClick={() => setExcluded(new Set())}
                >
                  Tout remettre
                </button>
              )}
              <button type="button" className={`${buttonClass} !py-1.5`} onClick={resetReview}>
                Annuler
              </button>
            </div>
          </div>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Chercher dans la liste"
            aria-label="Chercher dans la liste"
            className="mt-3 w-full max-w-sm rounded-[20px] border border-line bg-transparent px-3 py-1.5 text-sm outline-none focus:border-accent"
          />
          {review.truncated && (
            <p className="mt-2 text-xs text-fog">
              Seules les {num.format(review.items.length)} premières cartes sont listées ; toutes
              celles qui correspondent seront recyclées, sauf celles que vous retirez.
            </p>
          )}
          <ul className="mt-3 max-h-80 divide-y divide-line overflow-y-auto rounded-xl border border-line">
            {shown.map((i) => {
              const info = RARITIES.find((r) => r.value === i.rarity)!;
              const off = excluded.has(i.id);
              return (
                <li
                  key={i.id}
                  className={`flex items-center gap-3 px-3 py-1.5 text-sm ${off ? "opacity-40" : ""}`}
                >
                  <strong className="w-8 shrink-0" style={{ color: RARITY_COLOR[i.rarity] }}>
                    {info.code}
                  </strong>
                  <span className={`min-w-0 flex-1 truncate ${off ? "line-through" : ""}`}>
                    {i.title}
                    {i.quantity > 1 && <span className="text-fog"> ×{i.quantity}</span>}
                  </span>
                  <span className="hidden text-xs tabular-nums text-fog sm:inline">
                    {num.format(i.views)} vues
                  </span>
                  <Wikibits amount={i.wikibits} className="w-16 justify-end text-xs" />
                  <button
                    type="button"
                    aria-label={off ? `Remettre ${i.title}` : `Garder ${i.title}`}
                    onClick={() => toggleExcluded(i.id)}
                    className="rounded-full border border-line px-2 py-0.5 text-xs hover:bg-foreground/10"
                  >
                    {off ? "Remettre" : "Garder"}
                  </button>
                </li>
              );
            })}
            {shown.length === 0 && (
              <li className="px-3 py-4 text-center text-sm text-fog">Aucune carte.</li>
            )}
          </ul>
          {kept.some((i) => ["SUPER_RARE", "ULTRA_RARE", "LEGENDARY"].includes(i.rarity)) && (
            <p className="mt-3 text-xs text-pale-mist">
              La sélection contient des cartes Super rares ou mieux : elles valent souvent bien plus
              aux enchères.
            </p>
          )}
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm font-semibold text-danger">Cette action est irréversible.</p>
            <button
              type="button"
              className={dangerButtonClass}
              disabled={busy || kept.length === 0}
              onClick={confirm}
            >
              <Recycle className="size-4" />{" "}
              {busy
                ? "Recyclage…"
                : `Recycler ${num.format(kept.length)} carte${kept.length > 1 ? "s" : ""} (${num.format(keptCopies)} ex.) contre ${num.format(keptTotal)} wikibits`}
            </button>
          </div>
        </div>
      )}

      <p className="mt-6 text-xs text-fog">
        Idée inspirée de{" "}
        <a
          href="https://github.com/Lypningeuh/WikiRemastered"
          target="_blank"
          rel="noreferrer"
          className="underline hover:text-foreground"
        >
          WikiRemastered
        </a>{" "}
        (MIT).
      </p>
    </section>
  );
}
