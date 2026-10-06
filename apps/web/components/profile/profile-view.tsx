"use client";

import {
  ArrowLeftRight,
  Castle,
  Heart,
  Lock,
  MessageCircle,
  Pencil,
  Plus,
  Trophy,
  UserCheck,
  UserMinus,
  UserPlus,
  X,
} from "@/components/icons";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  ACHIEVEMENTS,
  FEATURED_MAX,
  RARITIES,
  WISHLIST_MAX,
  type CardDto,
  type ProfileDto,
} from "@wikideck/shared";
import { useConfirm } from "@/components/confirm-dialog";
import { ACHIEVEMENT_ICONS } from "@/components/achievements/achievements-view";
import { CardDetail } from "@/components/card-detail";
import { buttonClass, primaryButtonClass } from "@/components/settings/controls";
import { ShowcasePicker } from "@/components/settings/showcase-picker";
import { WikiCard } from "@/components/wiki-card";
import { RARITY_COLOR } from "@/lib/rarity-ui";
import { apiCall } from "@/lib/tags-api";

const fmt = new Intl.NumberFormat("fr-FR");
const percentLabel = (value: number) =>
  value > 0 && value < 0.001 ? "< 0,001 %" : `${value.toFixed(3).replace(".", ",")} %`;
const monthFmt = new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric" });
const panel = "rounded-xl border border-line bg-surface p-5";
const heading = "text-xs font-bold uppercase tracking-[0.2em] text-fog";

function Stat({
  label,
  children,
  note,
}: {
  label: string;
  children: React.ReactNode;
  note?: string;
}) {
  return (
    <div className="rounded-xl border border-line px-4 py-3">
      <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-fog">{label}</p>
      <p className="mt-1 text-xl font-bold tabular-nums">{children}</p>
      {note && <p className="mt-0.5 text-[11px] text-fog">{note}</p>}
    </div>
  );
}

export function ProfileView({ profile, apiUrl }: { profile: ProfileDto; apiUrl: string }) {
  const router = useRouter();
  const { confirm, dialog: confirmDialog } = useConfirm();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [picking, setPicking] = useState(false);
  const [detail, setDetail] = useState<(CardDto & { quantity: number }) | null>(null);
  const { player, stats } = profile;

  async function act(call: () => Promise<{ ok: boolean; message?: string }>) {
    setBusy(true);
    setError(null);
    const r = await call();
    setBusy(false);
    if (!r.ok) return setError(r.message ?? "Une erreur est survenue.");
    router.refresh();
  }

  const saveFeatured = (ids: string[]) =>
    act(() => apiCall(apiUrl, "/me", "PATCH", { featuredCardIds: ids }));
  const featuredIds = profile.featured.map((c) => c.id);

  const add = () => act(() => apiCall(apiUrl, "/friends", "POST", { userId: player.id }));
  const accept = () =>
    act(() => apiCall(apiUrl, `/friends/${profile.friendshipId}/accept`, "POST"));
  const remove = () => act(() => apiCall(apiUrl, `/friends/${profile.friendshipId}`, "DELETE"));

  return (
    <div className="mx-auto max-w-5xl">
      {confirmDialog}
      <section className={`${panel} flex flex-wrap items-center gap-6 p-6`}>
        {player.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={player.avatarUrl}
            alt=""
            className="size-24 rounded-full ring-4 ring-accent/30"
          />
        ) : (
          <span className="flex size-24 items-center justify-center rounded-full border-2 border-line text-4xl font-bold">
            {player.username.slice(0, 1).toUpperCase()}
          </span>
        )}
        <div className="min-w-0 flex-1">
          <h1 className="font-display truncate text-4xl">{player.username}</h1>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs font-semibold text-pale-mist">
            <span className="rounded-full border border-line px-3 py-1">
              Membre depuis {monthFmt.format(new Date(profile.createdAt))}
            </span>
            {profile.guild && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-1">
                <Castle className="size-3.5" />
                {profile.guild.name}
                {profile.guild.role === "OWNER" && " · chef"}
              </span>
            )}
            <span className="inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-1">
              {player.isPublic ? (
                "Profil public"
              ) : (
                <>
                  <Lock className="size-3.5" /> Profil privé
                </>
              )}
            </span>
            {profile.relation === "friend" && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-accent px-3 py-1 text-accent-foreground">
                <UserCheck className="size-3.5" /> Ami
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {profile.isSelf ? (
            <Link href="/settings" className={buttonClass}>
              <Pencil className="size-4" /> Modifier mon profil
            </Link>
          ) : (
            <>
              <Link href={`/trades?to=${player.id}`} className={buttonClass}>
                <ArrowLeftRight className="size-4" /> Échanger
              </Link>
              {profile.relation === "none" && (
                <button type="button" disabled={busy} onClick={add} className={primaryButtonClass}>
                  <UserPlus className="size-4" /> Ajouter en ami
                </button>
              )}
              {profile.relation === "outgoing" && (
                <button type="button" disabled={busy} onClick={remove} className={buttonClass}>
                  <X className="size-4" /> Annuler la demande
                </button>
              )}
              {profile.relation === "incoming" && (
                <>
                  <button type="button" disabled={busy} onClick={remove} className={buttonClass}>
                    Refuser
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={accept}
                    className={primaryButtonClass}
                  >
                    Accepter la demande
                  </button>
                </>
              )}
              {profile.relation === "friend" && (
                <>
                  <Link href={`/messages?with=${player.id}`} className={primaryButtonClass}>
                    <MessageCircle className="size-4" /> Message
                  </Link>
                  <button
                    type="button"
                    disabled={busy}
                    aria-label="Retirer de mes amis"
                    title="Retirer de mes amis"
                    onClick={async () => {
                      const ok = await confirm({
                        title: `Retirer ${player.username} de vos amis ?`,
                        confirmLabel: "Retirer",
                        danger: true,
                      });
                      if (ok) void remove();
                    }}
                    className={`${buttonClass} px-3`}
                  >
                    <UserMinus className="size-4" />
                  </button>
                </>
              )}
            </>
          )}
        </div>
        {error && (
          <p role="alert" className="w-full text-sm text-danger">
            {error}
          </p>
        )}
      </section>

      {!profile.visible || !stats ? (
        <section className={`${panel} mt-6 flex items-center gap-4`}>
          <Lock className="size-6 shrink-0 text-fog" />
          <p className="text-sm text-pale-mist">
            {player.username} a choisi un profil privé : sa collection, ses statistiques et ses
            succès ne sont pas visibles. Vous pouvez tout de même lui proposer un échange.
          </p>
        </section>
      ) : (
        <>
          <div className="mt-6 grid gap-6 md:grid-cols-[16rem_1fr]">
            <section>
              <h2 className={heading}>Carte vitrine</h2>
              {profile.showcase ? (
                <div className="mt-3 w-64">
                  <WikiCard card={profile.showcase} />
                </div>
              ) : (
                <div className="mt-3 flex aspect-250/370 w-64 items-center justify-center rounded-[9.6%/6.5%] border-2 border-dashed border-line px-6 text-center text-sm text-fog">
                  {profile.isSelf
                    ? "Choisissez une carte vitrine dans les paramètres."
                    : "Pas de carte vitrine."}
                </div>
              )}
            </section>

            <section>
              <h2 className={heading}>Statistiques</h2>
              <div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-3">
                <Stat
                  label="Cartes différentes"
                  note={`${percentLabel(stats.completion)} du catalogue`}
                >
                  {fmt.format(stats.cards)}
                </Stat>
                <Stat label="Exemplaires">{fmt.format(stats.copies)}</Stat>
                <Stat label="Paquets ouverts">{fmt.format(stats.packs)}</Stat>
                <Stat label="Échanges conclus">{fmt.format(stats.trades)}</Stat>
                <Stat label="Enchères">
                  {fmt.format(stats.auctionsSold)}
                  <span className="text-sm font-medium text-fog"> vendues</span>
                  {" · "}
                  {fmt.format(stats.auctionsWon)}
                  <span className="text-sm font-medium text-fog"> gagnées</span>
                </Stat>
                <Stat label="Amis">{fmt.format(stats.friends)}</Stat>
              </div>

              <h3 className="mt-5 text-[11px] font-bold uppercase tracking-[0.15em] text-fog">
                Cartes par rareté
              </h3>
              <ul className="mt-2 flex flex-wrap gap-2">
                {[...RARITIES].reverse().map((r) => (
                  <li
                    key={r.value}
                    title={r.label}
                    className="flex items-center gap-2 rounded-full border border-line px-3.5 py-1.5 text-sm"
                  >
                    <strong style={{ color: RARITY_COLOR[r.value] }}>{r.code}</strong>
                    <span className="font-bold tabular-nums">
                      {fmt.format(stats.byRarity[r.value])}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          </div>

          {(profile.isSelf || profile.featured.length > 0) && (
            <section className="mt-10">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 className={heading}>Cartes en vedette</h2>
                {profile.isSelf && (
                  <p className="text-xs text-fog">
                    {profile.featuredAuto
                      ? "Vos plus rares par défaut : choisissez les vôtres."
                      : `${profile.featured.length} / ${FEATURED_MAX} choisies`}
                  </p>
                )}
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
                {profile.featured.map((card) => (
                  <div key={card.id} className="relative">
                    <button
                      type="button"
                      aria-label={`Voir ${card.title}`}
                      onClick={() => setDetail(card)}
                      className="block w-full rounded-[9.6%/6.5%] outline-none transition hover:-translate-y-1 focus-visible:ring-2 focus-visible:ring-accent"
                    >
                      <WikiCard card={card} quantity={card.quantity} compact />
                    </button>
                    {profile.isSelf && (
                      <button
                        type="button"
                        disabled={busy}
                        aria-label={`Retirer ${card.title} des cartes en vedette`}
                        title="Retirer"
                        onClick={() => saveFeatured(featuredIds.filter((id) => id !== card.id))}
                        className="absolute -right-2 -top-2 z-10 flex size-7 items-center justify-center rounded-full bg-accent text-accent-foreground shadow-md transition-transform hover:scale-110 disabled:opacity-50"
                      >
                        <X className="size-4" />
                      </button>
                    )}
                  </div>
                ))}
                {profile.isSelf &&
                  Array.from({ length: Math.max(0, FEATURED_MAX - profile.featured.length) }).map(
                    (_, i) => (
                      <button
                        key={`slot-${i}`}
                        type="button"
                        disabled={busy}
                        onClick={() => setPicking(true)}
                        aria-label="Ajouter une carte en vedette"
                        className="flex aspect-250/370 w-full flex-col items-center justify-center gap-2 rounded-[9.6%/6.5%] border-2 border-dashed border-line text-sm font-semibold text-fog transition-colors hover:border-accent hover:text-foreground disabled:opacity-50"
                      >
                        <Plus className="size-6" />
                        Ajouter
                      </button>
                    ),
                  )}
              </div>
            </section>
          )}

          {(profile.isSelf || profile.wishlist.length > 0) && (
            <section className="mt-10">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 className={`${heading} flex items-center gap-2`}>
                  <Heart className="size-3.5" /> Envies · {profile.wishlist.length} / {WISHLIST_MAX}
                </h2>
                {profile.isSelf && (
                  <Link
                    href="/wishlist"
                    className="text-xs text-fog underline hover:text-foreground"
                  >
                    Gérer mes envies
                  </Link>
                )}
              </div>
              {profile.wishlist.length === 0 ? (
                <p className="mt-3 text-sm text-fog">
                  Aucune envie pour l&apos;instant : ajoutez-en depuis la fiche d&apos;une carte.
                </p>
              ) : (
                <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
                  {profile.wishlist.map((card) => (
                    <button
                      key={card.id}
                      type="button"
                      aria-label={`Voir ${card.title}`}
                      onClick={() => setDetail({ ...card, quantity: 0 })}
                      className="block w-full rounded-[9.6%/6.5%] outline-none transition hover:-translate-y-1 focus-visible:ring-2 focus-visible:ring-accent"
                    >
                      <WikiCard card={card} compact />
                    </button>
                  ))}
                </div>
              )}
            </section>
          )}

          <section className="mt-10">
            <h2 className={`${heading} flex items-center gap-2`}>
              <Trophy className="size-3.5" /> Succès · {profile.achievements.length} /{" "}
              {ACHIEVEMENTS.length}
            </h2>
            {profile.achievements.length === 0 ? (
              <p className="mt-3 text-sm text-fog">Aucun succès débloqué pour l&apos;instant.</p>
            ) : (
              <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {ACHIEVEMENTS.filter((a) => profile.achievements.includes(a.key)).map((a) => {
                  const Icon = ACHIEVEMENT_ICONS[a.icon] ?? Trophy;
                  return (
                    <li
                      key={a.key}
                      className="flex items-center gap-3 rounded-xl border border-line bg-surface p-3.5"
                    >
                      <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground">
                        <Icon className="size-5" />
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-bold">{a.name}</span>
                        <span className="block text-xs text-fog">{a.description}</span>
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </>
      )}

      {picking && (
        <ShowcasePicker
          apiUrl={apiUrl}
          title="Ajouter une carte en vedette"
          description={`Jusqu'à ${FEATURED_MAX} cartes de votre collection, mises en avant sur votre profil.`}
          onSelect={(card) => {
            if (!featuredIds.includes(card.id) && featuredIds.length < FEATURED_MAX)
              void saveFeatured([...featuredIds, card.id]);
          }}
          onClose={() => setPicking(false)}
        />
      )}

      {detail && (
        <CardDetail
          card={detail}
          quantity={detail.quantity}
          apiUrl={apiUrl}
          onClose={() => setDetail(null)}
        />
      )}
    </div>
  );
}
