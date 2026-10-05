"use client";

import { useConfirm } from "@/components/confirm-dialog";
import { Crown, Gift, LogOut, Plus, Trophy, X } from "@/components/icons";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  GUILD_IP_POINTS,
  GUILD_MAX_MEMBERS,
  GUILD_PARTICIPATION_REWARD,
  GUILD_REWARDS,
  RARITIES,
  type CatalogCard,
  type GuildHome,
  type RankingResponse,
  type WishesResponse,
} from "@wikideck/shared";
import { Countdown } from "@/components/market/countdown";
import { buttonClass, primaryButtonClass } from "@/components/settings/controls";
import { WikiCard } from "@/components/wiki-card";
import { Wikibits } from "@/components/wikibit";
import { apiCall, apiFetch } from "@/lib/tags-api";
import { CatalogPicker } from "./catalog-picker";

type Tab = "home" | "wishes" | "ranking";
const TABS: { tab: Tab; label: string }[] = [
  { tab: "home", label: "Accueil" },
  { tab: "wishes", label: "Liste de souhaits" },
  { tab: "ranking", label: "Classement" },
];

const fmt = new Intl.NumberFormat("fr-FR");
const panel = "rounded-xl border border-line p-5 bg-surface";
const heading = "text-xs font-bold uppercase tracking-[0.2em] text-fog";

function Avatar({ name, url }: { name: string; url: string | null }) {
  return url ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={url} alt="" className="size-7 rounded-full" />
  ) : (
    <span className="flex size-7 items-center justify-center rounded-full bg-accent/10 text-xs font-bold">
      {name.slice(0, 1).toUpperCase()}
    </span>
  );
}

function Stat({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-line px-4 py-3 bg-surface">
      <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-fog">{label}</p>
      <p className="mt-1 text-xl font-bold tabular-nums">{children}</p>
    </div>
  );
}

function HomeTab({ home, apiUrl }: { home: GuildHome; apiUrl: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const isOwner = home.role === "OWNER";
  const { confirm, dialog: confirmDialog } = useConfirm();

  async function leave() {
    const ok = await confirm({
      title: "Quitter la guilde ?",
      message:
        "Vous pourrez en rejoindre une autre, ou la rejoindre à nouveau si elle est ouverte.",
      confirmLabel: "Quitter",
      danger: true,
    });
    if (!ok) return;
    const r = await apiCall(apiUrl, "/guild/leave", "POST");
    if (!r.ok) return setError(r.message);
    router.refresh();
  }
  async function kick(userId: string, name: string) {
    const ok = await confirm({
      title: `Exclure ${name} de la guilde ?`,
      confirmLabel: "Exclure",
      danger: true,
    });
    if (!ok) return;
    const r = await apiCall(apiUrl, `/guild/members/${userId}`, "DELETE");
    if (!r.ok) return setError(r.message);
    router.refresh();
  }

  return (
    <div className="space-y-6">
      {confirmDialog}
      <p className="text-sm text-pale-mist">
        L&apos;accueil résume la performance de votre guilde au classement hebdomadaire et votre
        contribution personnelle.
      </p>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Rang cette semaine">
          {home.rank === null ? "—" : `${home.rank}`}
          <span className="text-sm font-medium text-fog">
            {home.rank === null ? "" : ` / ${home.guilds}`}
          </span>
        </Stat>
        <Stat label="Points de la guilde">{fmt.format(home.points)}</Stat>
        <Stat label="Ma contribution (semaine)">{fmt.format(home.me.ipWeek)} pts</Stat>
        <Stat label="Total à vie">{fmt.format(home.me.ipTotal)} pts</Stat>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <section className={panel}>
          <h2 className={heading}>
            Membres · {home.members.length} / {GUILD_MAX_MEMBERS}
          </h2>
          <ul className="mt-4 divide-y divide-line">
            {home.members.map((m) => (
              <li key={m.player.id} className="flex items-center gap-3 py-3">
                <Avatar name={m.player.username} url={m.player.avatarUrl} />
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-2 truncate text-sm font-bold">
                    <Link href={`/profile/${m.player.id}`} className="hover:underline">
                      {m.player.username}
                    </Link>
                    {m.role === "OWNER" && (
                      <Crown className="size-3.5 text-pale-mist" aria-label="Chef" />
                    )}
                  </p>
                  <p className="text-xs text-fog">
                    {fmt.format(m.ipWeek)} pts cette semaine · {fmt.format(m.ipTotal)} à vie
                  </p>
                </div>
                {isOwner && m.role !== "OWNER" && (
                  <button
                    type="button"
                    aria-label={`Exclure ${m.player.username}`}
                    onClick={() => kick(m.player.id, m.player.username)}
                    className="opacity-50 hover:opacity-100"
                  >
                    <X className="size-4" />
                  </button>
                )}
              </li>
            ))}
          </ul>
        </section>

        <div className="space-y-6">
          <section className={panel}>
            <h2 className={heading}>Score de la semaine</h2>
            <dl className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-pale-mist">Solidarité</dt>
                <dd className="font-bold tabular-nums">{fmt.format(home.influence)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-pale-mist">Enchères</dt>
                <dd className="font-bold tabular-nums">{fmt.format(home.auctions)}</dd>
              </div>
            </dl>
            <p className="mt-4 border-t border-line pt-3 text-xs text-fog">
              Fin de la semaine dans{" "}
              <Countdown endsAt={home.weekEndsAt} className="font-bold text-foreground" />
            </p>
          </section>
          {home.lastWeek && (
            <section className={panel}>
              <h2 className={heading}>Semaine dernière</h2>
              <p className="mt-3 text-sm">
                {home.lastWeek.rank}
                <sup>{home.lastWeek.rank === 1 ? "re" : "e"}</sup> avec{" "}
                <span className="font-bold">{fmt.format(home.lastWeek.points)}</span> points
              </p>
              {home.lastWeek.reward > 0 && (
                <p className="mt-1 text-xs text-fog">
                  Récompense versée à chaque membre :{" "}
                  <Wikibits amount={home.lastWeek.reward} className="font-bold text-foreground" />
                </p>
              )}
            </section>
          )}
        </div>
      </div>

      <section className={panel}>
        <h2 className={heading}>Solidarité</h2>
        <p className="mt-3 max-w-3xl text-sm leading-relaxed text-pale-mist">
          Solidarité entre camarades de guilde : gagnée quand un membre offre une carte de la liste
          de souhaits. Les points de solidarité comptent dans le score hebdomadaire de la guilde, au
          même titre que les enchères. Le total cumulé à vie est hors classement ; le classement des
          donateurs ne compte que la semaine en cours.
        </p>
        <ul className="mt-4 grid gap-2 sm:grid-cols-3 lg:grid-cols-6">
          {RARITIES.map((r) => (
            <li
              key={r.value}
              className="rounded-xl border border-line px-3 py-2 text-sm bg-surface"
            >
              <span className="block text-xs text-fog">{r.label}</span>
              <span className="font-bold tabular-nums">
                +{fmt.format(GUILD_IP_POINTS[r.value])} pts
              </span>
            </li>
          ))}
        </ul>
      </section>

      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
      <button type="button" onClick={leave} className={`${buttonClass} text-pale-mist`}>
        <LogOut className="size-4" /> Quitter la guilde
      </button>
    </div>
  );
}

function WishesTab({ apiUrl }: { apiUrl: string }) {
  const router = useRouter();
  const [data, setData] = useState<WishesResponse | null>(null);
  const [picking, setPicking] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    const r = await apiFetch<WishesResponse>(apiUrl, "/guild/wishes");
    if (r.ok) setData(r.data);
    else setError(r.message);
  }, [apiUrl]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  async function wish(card: CatalogCard) {
    setError(null);
    const r = await apiCall(apiUrl, "/guild/wishes", "POST", { cardId: card.id });
    if (!r.ok) setError(r.message);
    await load();
  }

  async function cancel(id: string) {
    setBusyId(id);
    const r = await apiCall(apiUrl, `/guild/wishes/${id}`, "DELETE");
    if (!r.ok) setError(r.message);
    setBusyId(null);
    await load();
  }

  async function gift(id: string) {
    setBusyId(id);
    setError(null);
    setNotice(null);
    const r = await apiCall<{ points: number }>(apiUrl, `/guild/wishes/${id}/gift`, "POST");
    if (!r.ok) setError(r.message);
    else
      setNotice(
        `Carte offerte : +${fmt.format(r.data.points)} points de solidarité pour la guilde.`,
      );
    setBusyId(null);
    await load();
    router.refresh();
  }

  if (!data) {
    return <p className="py-10 text-center text-sm text-fog">{error ?? "Chargement…"}</p>;
  }

  return (
    <div className="space-y-6">
      <p className="max-w-3xl text-sm text-pale-mist">
        Chaque membre peut demander une carte du catalogue. Si un camarade la possède, il peut vous
        l&apos;offrir gratuitement. Chaque membre ne peut recevoir qu&apos;une carte par jour
        (minuit UTC).
      </p>

      <section className={panel}>
        <h2 className={heading}>Mon souhait</h2>
        {data.mine ? (
          <div className="mt-4 flex items-center gap-5">
            <div className="w-28 shrink-0">
              <WikiCard card={data.mine.card} compact />
            </div>
            <div>
              <p className="font-bold">{data.mine.card.title}</p>
              <p className="mt-1 text-sm text-pale-mist">
                En attente d&apos;un camarade qui la possède.
              </p>
              <button
                type="button"
                disabled={busyId === data.mine.id}
                onClick={() => cancel(data.mine!.id)}
                className={`${buttonClass} mt-3`}
              >
                Retirer mon souhait
              </button>
            </div>
          </div>
        ) : (
          <div className="mt-3">
            <p className="text-sm text-pale-mist">Vous n&apos;avez aucun souhait en cours.</p>
            <button
              type="button"
              className={`${primaryButtonClass} mt-3`}
              onClick={() => setPicking(true)}
            >
              <Plus className="size-4" /> Souhaiter une carte
            </button>
          </div>
        )}
        {data.receivedToday && (
          <p className="mt-4 text-xs text-fog">
            Vous avez déjà reçu une carte aujourd&apos;hui : prochain don possible dans{" "}
            <Countdown endsAt={data.resetsAt} className="font-bold text-foreground" />.
          </p>
        )}
      </section>

      <section>
        <h2 className={heading}>Souhaits de vos camarades</h2>
        {data.wishes.length === 0 ? (
          <p className="mt-4 text-sm text-fog">Aucun souhait en attente dans la guilde.</p>
        ) : (
          <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {data.wishes.map((w) => (
              <li key={w.id} className={`${panel} flex gap-4`}>
                <div className="w-24 shrink-0">
                  <WikiCard card={w.card} compact />
                </div>
                <div className="flex min-w-0 flex-col">
                  <p className="truncate text-sm font-bold">{w.card.title}</p>
                  <p className="mt-0.5 flex items-center gap-1.5 text-xs text-fog">
                    <Avatar name={w.player.username} url={w.player.avatarUrl} />
                    {w.player.username}
                  </p>
                  <p className="mt-2 text-xs text-pale-mist">
                    +{fmt.format(GUILD_IP_POINTS[w.card.rarity])} pts de solidarité
                  </p>
                  <div className="mt-auto pt-3">
                    {w.canGift ? (
                      <button
                        type="button"
                        disabled={busyId === w.id}
                        onClick={() => gift(w.id)}
                        className={primaryButtonClass}
                      >
                        <Gift className="size-4" /> Offrir
                      </button>
                    ) : (
                      <span className="text-xs text-fog">Vous ne la possédez pas</span>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {notice && <p className="text-sm text-pale-mist">{notice}</p>}
      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
      {picking && (
        <CatalogPicker apiUrl={apiUrl} onSelect={wish} onClose={() => setPicking(false)} />
      )}
    </div>
  );
}

function RankingTab({ apiUrl }: { apiUrl: string }) {
  const [data, setData] = useState<RankingResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    void apiFetch<RankingResponse>(apiUrl, "/guild/ranking").then((r) =>
      r.ok ? setData(r.data) : setError(r.message),
    );
  }, [apiUrl]);

  if (!data) return <p className="py-10 text-center text-sm text-fog">{error ?? "Chargement…"}</p>;

  const row = (e: RankingResponse["entries"][number]) => (
    <li
      key={e.guildId}
      className={`flex items-center gap-4 px-4 py-3 text-sm ${e.isMine ? "bg-accent/[0.06]" : ""}`}
    >
      <span className="w-8 text-center font-bold tabular-nums text-pale-mist">{e.rank}</span>
      <span className="min-w-0 flex-1 truncate font-bold">
        {e.name}
        {e.isMine && <span className="ml-2 text-xs font-normal text-fog">votre guilde</span>}
      </span>
      <span className="hidden text-xs text-fog sm:inline">{e.members} membres</span>
      <span className="w-24 text-right font-bold tabular-nums">{fmt.format(e.points)} pts</span>
    </li>
  );

  return (
    <div className="space-y-6">
      <p className="text-sm text-pale-mist">
        Classement inter-guildes de la semaine : solidarité (cartes offertes) et enchères. Il se
        termine dans <Countdown endsAt={data.weekEndsAt} className="font-bold text-foreground" />{" "}
        (lundi 00:00 UTC), et les récompenses sont versées à chaque membre.
      </p>

      <div className="grid gap-6 lg:grid-cols-[1fr_18rem]">
        <section>
          <h2 className={heading}>Cette semaine</h2>
          {data.entries.length === 0 ? (
            <p className="mt-4 text-sm text-fog">Aucune guilde n&apos;a encore marqué de points.</p>
          ) : (
            <ul className="mt-4 divide-y divide-line rounded-xl border border-line bg-surface">
              {data.entries.map(row)}
              {data.mine && <li className="px-4 py-1 text-center text-fog">…</li>}
              {data.mine && row(data.mine)}
            </ul>
          )}
        </section>

        <div className="space-y-6">
          <section className={panel}>
            <h2 className={heading}>Récompenses du lundi</h2>
            <ul className="mt-4 space-y-2 text-sm">
              {GUILD_REWARDS.map((r) => (
                <li key={r.rank} className="flex justify-between">
                  <span className="text-pale-mist">{r.label}</span>
                  <Wikibits amount={r.wikibits} className="font-bold" />
                </li>
              ))}
              <li className="flex justify-between border-t border-line pt-2">
                <span className="text-pale-mist">Autres guildes actives</span>
                <Wikibits amount={GUILD_PARTICIPATION_REWARD} className="font-bold" />
              </li>
            </ul>
            <p className="mt-3 text-xs text-fog">Par membre, en wikibits.</p>
          </section>
          <section className={panel}>
            <h2 className={`${heading} flex items-center gap-2`}>
              <Trophy className="size-3.5" /> Semaine dernière
            </h2>
            {data.lastWeek.entries.length === 0 ? (
              <p className="mt-3 text-sm text-fog">Pas encore de résultats.</p>
            ) : (
              <ol className="mt-3 space-y-2 text-sm">
                {data.lastWeek.entries.map((e) => (
                  <li key={e.rank} className="flex items-baseline justify-between gap-3">
                    <span className="truncate">
                      <span className="mr-2 font-bold tabular-nums text-pale-mist">{e.rank}</span>
                      {e.name}
                    </span>
                    <span className="text-xs tabular-nums text-fog">
                      {fmt.format(e.points)} pts
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

export function GuildView({ home, apiUrl }: { home: GuildHome; apiUrl: string }) {
  const [tab, setTab] = useState<Tab>("home");
  const tablist = useRef<HTMLDivElement>(null);

  return (
    <div>
      <div className="mt-8 text-center">
        <h2 className="font-display text-3xl font-medium">{home.guild.name}</h2>
        {home.guild.description && (
          <p className="prose-serif mt-1 text-pale-mist">{home.guild.description}</p>
        )}
      </div>
      <div ref={tablist} role="tablist" className="mt-8 flex gap-2 border-b border-line">
        {TABS.map((t) => (
          <button
            key={t.tab}
            role="tab"
            aria-selected={tab === t.tab}
            onClick={() => setTab(t.tab)}
            className={`-mb-px border-b-2 px-4 py-2 text-sm font-bold transition-colors ${
              tab === t.tab
                ? "border-accent text-foreground"
                : "border-transparent text-fog hover:text-foreground"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="mt-6">
        {tab === "home" && <HomeTab home={home} apiUrl={apiUrl} />}
        {tab === "wishes" && <WishesTab apiUrl={apiUrl} />}
        {tab === "ranking" && <RankingTab apiUrl={apiUrl} />}
      </div>
    </div>
  );
}
