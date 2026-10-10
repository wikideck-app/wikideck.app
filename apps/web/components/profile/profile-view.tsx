"use client";

import {
  ArrowLeftRight,
  BookBookmark,
  Castle,
  ChevronLeft,
  ChevronRight,
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
import { useFormatter, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  ACHIEVEMENTS,
  FEATURED_MAX,
  NO_TITLE,
  PROFILE_ALBUMS_MAX,
  RARITIES,
  type CardDto,
  type ProfileDto,
  type ReferralInfo,
} from "@wikideck/shared";
import { AlbumTile } from "@/components/albums/album-tile";
import { ChosenTitleBadge, PlayerTitleBadge, PlayerTitleProgress } from "@/components/player-title";
import { TitlePicker } from "@/components/profile/title-picker";
import { ReferralCard } from "@/components/referral-card";
import { ProfileAlbumsPicker } from "@/components/profile/profile-albums-picker";
import { useConfirm } from "@/components/confirm-dialog";
import { ACHIEVEMENT_ICONS } from "@/components/achievements/achievements-view";
import { CardDetail } from "@/components/card-detail";
import { buttonClass, primaryButtonClass } from "@/components/settings/controls";
import { ShowcasePicker } from "@/components/settings/showcase-picker";
import { WikiCard } from "@/components/wiki-card";
import { achievementKey, useRarityLabel } from "@/lib/labels";
import { RARITY_COLOR } from "@/lib/rarity-ui";
import { apiCall } from "@/lib/tags-api";

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

export function ProfileView({
  profile,
  apiUrl,
  referral,
  siteUrl,
}: {
  profile: ProfileDto;
  apiUrl: string;
  /** lien de parrainage, seulement sur son propre profil */
  referral?: ReferralInfo | null;
  siteUrl?: string;
}) {
  const t = useTranslations("profile");
  const tc = useTranslations("common");
  const tAch = useTranslations("achievements");
  const format = useFormatter();
  const rarityLabel = useRarityLabel();
  const percentLabel = (value: number) =>
    value > 0 && value < 0.001
      ? t("lessThan", { value: format.number(0.00001, "percent3") })
      : format.number(value / 100, "percent3");
  const router = useRouter();
  const { confirm, dialog: confirmDialog } = useConfirm();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [picking, setPicking] = useState(false);
  const [pickingShowcase, setPickingShowcase] = useState(false);
  const [pickingAlbums, setPickingAlbums] = useState(false);
  const [pickingTitle, setPickingTitle] = useState(false);
  const [detail, setDetail] = useState<(CardDto & { quantity: number }) | null>(null);
  const { player, stats } = profile;

  async function act(call: () => Promise<{ ok: boolean; message?: string }>) {
    setBusy(true);
    setError(null);
    const r = await call();
    setBusy(false);
    if (!r.ok) return setError(r.message ?? tc("errors.generic"));
    router.refresh();
  }

  // retirer la dernière carte = n'en afficher aucune (et non revenir aux plus rares)
  const saveFeatured = (ids: string[]) =>
    act(() =>
      apiCall(
        apiUrl,
        "/me",
        "PATCH",
        ids.length ? { featuredCardIds: ids } : { featuredMode: "none" },
      ),
    );
  const setFeaturedMode = (mode: "auto" | "none") =>
    act(() => apiCall(apiUrl, "/me", "PATCH", { featuredMode: mode }));
  const saveShowcase = (id: string | null) =>
    act(() => apiCall(apiUrl, "/me", "PATCH", { showcaseCardId: id }));
  // ordre local pendant un glisser-déposer (puis conservé : il est identique à celui enregistré)
  const [draftIds, setDraftIds] = useState<string[] | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const featuredList = (() => {
    if (!draftIds) return profile.featured;
    const byId = new Map(profile.featured.map((c) => [c.id, c]));
    return [
      ...draftIds.flatMap((id) => byId.get(id) ?? []),
      ...profile.featured.filter((c) => !draftIds.includes(c.id)),
    ];
  })();
  const featuredIds = featuredList.map((c) => c.id);
  const canReorder = profile.isSelf && featuredList.length > 1;

  const moveBefore = (ids: string[], id: string, target: number) => {
    const from = ids.indexOf(id);
    if (from < 0 || from === target) return ids;
    const next = [...ids];
    next.splice(from, 1);
    next.splice(target, 0, id);
    return next;
  };
  const shift = (id: string, by: -1 | 1) => {
    const at = featuredIds.indexOf(id);
    const to = at + by;
    if (to < 0 || to >= featuredIds.length) return;
    const next = moveBefore(featuredIds, id, to);
    setDraftIds(next);
    void saveFeatured(next);
  };

  const add = () => act(() => apiCall(apiUrl, "/friends", "POST", { userId: player.id }));
  const accept = () =>
    act(() => apiCall(apiUrl, `/friends/${profile.friendshipId}/accept`, "POST"));
  const remove = () => act(() => apiCall(apiUrl, `/friends/${profile.friendshipId}`, "DELETE"));

  return (
    <div className="mx-auto max-w-5xl">
      {confirmDialog}
      <section
        className={`${panel} flex flex-col items-center gap-4 p-6 text-center sm:flex-row sm:flex-wrap sm:gap-6 sm:text-left`}
      >
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
        <div className="w-full min-w-0 sm:w-auto sm:flex-1">
          <h1 className="font-display break-words text-3xl sm:truncate sm:text-4xl">{player.username}</h1>
          <div className="mt-3 flex flex-wrap items-center justify-center gap-2 text-xs font-semibold text-pale-mist sm:justify-start">
            {profile.stats &&
              profile.displayedTitle !== NO_TITLE &&
              (profile.displayedTitle ? (
                <ChosenTitleBadge id={profile.displayedTitle} />
              ) : (
                <>
                  <PlayerTitleBadge cards={profile.stats.wikipediaCards} />
                  {profile.stats.animeCards > 0 && (
                    <PlayerTitleBadge cards={profile.stats.animeCards} kind="anime" />
                  )}
                </>
              ))}
            {profile.isSelf && profile.stats && (
              <button
                type="button"
                onClick={() => setPickingTitle(true)}
                className="text-xs text-fog underline hover:text-foreground"
              >
                {t("chooseTitle")}
              </button>
            )}
            <span className="rounded-full border border-line px-3 py-1">
              {t("memberSince", { date: format.dateTime(new Date(profile.createdAt), "monthYear") })}
            </span>
            {profile.guild && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-1">
                <Castle className="size-3.5" />
                {profile.guild.name}
                {profile.guild.role === "OWNER" && t("owner")}
              </span>
            )}
            <span className="inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-1">
              {player.isPublic ? (
                t("public")
              ) : (
                <>
                  <Lock className="size-3.5" /> {t("private")}
                </>
              )}
            </span>
            {profile.relation === "friend" && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-accent px-3 py-1 text-accent-foreground">
                <UserCheck className="size-3.5" /> {t("friend")}
              </span>
            )}
          </div>
          {profile.isSelf && profile.stats && (
            <div className="mx-auto mt-3 flex max-w-md flex-col gap-3 text-xs text-pale-mist sm:mx-0">
              <PlayerTitleProgress cards={profile.stats.wikipediaCards} />
              <PlayerTitleProgress cards={profile.stats.animeCards} kind="anime" />
            </div>
          )}
        </div>

        <div className="flex w-full flex-wrap items-center justify-center gap-2 sm:w-auto sm:justify-start">
          {profile.isSelf ? (
            <Link href="/settings" className={buttonClass}>
              <Pencil className="size-4" /> {t("edit")}
            </Link>
          ) : (
            <>
              <Link href={`/trades?to=${player.id}`} className={buttonClass}>
                <ArrowLeftRight className="size-4" /> {t("trade")}
              </Link>
              {profile.relation === "none" && (
                <button type="button" disabled={busy} onClick={add} className={primaryButtonClass}>
                  <UserPlus className="size-4" /> {t("addFriend")}
                </button>
              )}
              {profile.relation === "outgoing" && (
                <button type="button" disabled={busy} onClick={remove} className={buttonClass}>
                  <X className="size-4" /> {t("cancelRequest")}
                </button>
              )}
              {profile.relation === "incoming" && (
                <>
                  <button type="button" disabled={busy} onClick={remove} className={buttonClass}>
                    {t("refuse")}
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={accept}
                    className={primaryButtonClass}
                  >
                    {t("acceptRequest")}
                  </button>
                </>
              )}
              {profile.relation === "friend" && (
                <>
                  <Link href={`/messages?with=${player.id}`} className={primaryButtonClass}>
                    <MessageCircle className="size-4" /> {t("message")}
                  </Link>
                  <button
                    type="button"
                    disabled={busy}
                    aria-label={t("removeFriend")}
                    title={t("removeFriend")}
                    onClick={async () => {
                      const ok = await confirm({
                        title: t("removeTitle", { name: player.username }),
                        confirmLabel: t("remove"),
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

      {profile.isSelf && referral && siteUrl && <ReferralCard info={referral} siteUrl={siteUrl} />}

      {!profile.visible || !stats ? (
        <section className={`${panel} mt-6 flex items-center gap-4`}>
          <Lock className="size-6 shrink-0 text-fog" />
          <p className="text-sm text-pale-mist">
            {t("privateNotice", { name: player.username })}
          </p>
        </section>
      ) : (
        <>
          <div className="mt-6 grid gap-6 md:grid-cols-[16rem_1fr]">
            <section>
              <h2 className={heading}>{t("showcase")}</h2>
              {profile.showcase ? (
                <div className="mx-auto mt-3 w-64 md:mx-0">
                  <WikiCard card={profile.showcase} />
                </div>
              ) : profile.isSelf ? (
                <button
                  type="button"
                  onClick={() => setPickingShowcase(true)}
                  className="mx-auto mt-3 flex aspect-250/370 w-64 items-center justify-center rounded-[9.6%/6.5%] border-2 border-dashed border-line px-6 text-center text-sm text-fog transition-colors hover:border-accent hover:text-foreground md:mx-0"
                >
                  {t("pickShowcase")}
                </button>
              ) : (
                <div className="mx-auto mt-3 flex aspect-250/370 w-64 items-center justify-center rounded-[9.6%/6.5%] border-2 border-dashed border-line px-6 text-center text-sm text-fog md:mx-0">
                  {t("noShowcase")}
                </div>
              )}
              {profile.isSelf && profile.showcase && (
                <div className="mx-auto mt-3 flex w-64 flex-wrap gap-2 md:mx-0">
                  <button
                    type="button"
                    disabled={busy}
                    className={buttonClass}
                    onClick={() => setPickingShowcase(true)}
                  >
                    {t("changeShowcase")}
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    className={buttonClass}
                    onClick={() => void saveShowcase(null)}
                  >
                    {t("removeShowcase")}
                  </button>
                </div>
              )}
            </section>

            <section>
              <h2 className={heading}>{t("stats")}</h2>
              <div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-3">
                <Stat
                  label={t("distinct")}
                  note={t("ofCatalog", { percent: percentLabel(stats.completion) })}
                >
                  {format.number(stats.cards)}
                </Stat>
                <Stat label={t("copies")}>{format.number(stats.copies)}</Stat>
                <Stat label={t("packs")}>{format.number(stats.packs)}</Stat>
                <Stat label={t("trades")}>{format.number(stats.trades)}</Stat>
                <Stat label={t("auctions")}>
                  {format.number(stats.auctionsSold)}
                  <span className="text-sm font-medium text-fog">{t("sold")}</span>
                  {" · "}
                  {format.number(stats.auctionsWon)}
                  <span className="text-sm font-medium text-fog">{t("won")}</span>
                </Stat>
                <Stat label={t("friends")}>{format.number(stats.friends)}</Stat>
              </div>

              <h3 className="mt-5 text-[11px] font-bold uppercase tracking-[0.15em] text-fog">
                {t("byRarity")}
              </h3>
              <ul className="mt-2 flex flex-wrap gap-2">
                {[...RARITIES].reverse().map((r) => (
                  <li
                    key={r.value}
                    title={rarityLabel(r.value)}
                    className="flex items-center gap-2 rounded-full border border-line px-3.5 py-1.5 text-sm"
                  >
                    <strong style={{ color: RARITY_COLOR[r.value] }}>{r.code}</strong>
                    <span className="font-bold tabular-nums">
                      {format.number(stats.byRarity[r.value])}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          </div>

          {(profile.isSelf || profile.featured.length > 0) && (
            <section className="mt-10">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 className={heading}>{t("featured")}</h2>
                {profile.isSelf && (
                  <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 text-xs text-fog">
                    <p>
                      {profile.featuredHidden
                        ? t("featuredHidden")
                        : profile.featuredAuto
                          ? t("featuredAuto")
                          : t("featuredCount", { count: profile.featured.length, max: FEATURED_MAX })}
                    </p>
                    {!profile.featuredHidden && (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void setFeaturedMode("none")}
                        className="underline hover:text-foreground disabled:opacity-50"
                      >
                        {t("featuredHideAll")}
                      </button>
                    )}
                    {!profile.featuredAuto && (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void setFeaturedMode("auto")}
                        className="underline hover:text-foreground disabled:opacity-50"
                      >
                        {t("featuredUseAuto")}
                      </button>
                    )}
                  </div>
                )}
              </div>
              {canReorder && <p className="mt-1 text-xs text-fog">{t("dragHint")}</p>}
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
                {featuredList.map((card, index) => (
                  <div
                    key={card.id}
                    draggable={canReorder}
                    onDragStart={(e) => {
                      if (!canReorder) return;
                      e.dataTransfer.effectAllowed = "move";
                      e.dataTransfer.setData("text/plain", card.id);
                      setDragId(card.id);
                      setDraftIds(featuredIds);
                    }}
                    onDragEnter={() => {
                      if (dragId && dragId !== card.id)
                        setDraftIds((prev) => moveBefore(prev ?? featuredIds, dragId, index));
                    }}
                    onDragOver={(e) => dragId && e.preventDefault()}
                    onDrop={(e) => e.preventDefault()}
                    onDragEnd={() => {
                      const moved = dragId !== null && draftIds !== null;
                      setDragId(null);
                      if (moved && draftIds!.join() !== profile.featured.map((c) => c.id).join())
                        void saveFeatured(draftIds!);
                    }}
                    className={`group relative transition-opacity ${canReorder ? "cursor-grab active:cursor-grabbing" : ""} ${
                      dragId === card.id ? "opacity-40" : ""
                    }`}
                  >
                    <button
                      type="button"
                      aria-label={t("view", { title: card.title })}
                      onClick={() => setDetail(card)}
                      className="block w-full rounded-[9.6%/6.5%] outline-none transition hover:-translate-y-1 focus-visible:ring-2 focus-visible:ring-accent"
                    >
                      <WikiCard card={card} quantity={card.quantity} compact />
                    </button>
                    {canReorder && (
                      <div className="absolute inset-x-0 bottom-1 z-10 hidden justify-center gap-1 group-focus-within:flex [@media(pointer:coarse)]:flex">
                        <button
                          type="button"
                          disabled={busy || index === 0}
                          aria-label={t("moveLeft", { title: card.title })}
                          onClick={() => shift(card.id, -1)}
                          className="flex size-7 items-center justify-center rounded-full bg-black/70 text-white shadow disabled:opacity-30"
                        >
                          <ChevronLeft className="size-4" />
                        </button>
                        <button
                          type="button"
                          disabled={busy || index === featuredList.length - 1}
                          aria-label={t("moveRight", { title: card.title })}
                          onClick={() => shift(card.id, 1)}
                          className="flex size-7 items-center justify-center rounded-full bg-black/70 text-white shadow disabled:opacity-30"
                        >
                          <ChevronRight className="size-4" />
                        </button>
                      </div>
                    )}
                    {profile.isSelf && (
                      <button
                        type="button"
                        disabled={busy}
                        aria-label={t("unfeature", { title: card.title })}
                        title={t("unfeatureShort")}
                        onClick={() => saveFeatured(featuredIds.filter((id) => id !== card.id))}
                        className="absolute -right-2 -top-2 z-10 flex size-7 items-center justify-center rounded-full bg-accent text-accent-foreground shadow-md transition-transform hover:scale-110 disabled:opacity-50"
                      >
                        <X className="size-4" />
                      </button>
                    )}
                  </div>
                ))}
                {profile.isSelf &&
                  Array.from({ length: Math.max(0, FEATURED_MAX - featuredList.length) }).map(
                    (_, i) => (
                      <button
                        key={`slot-${i}`}
                        type="button"
                        disabled={busy}
                        onClick={() => setPicking(true)}
                        aria-label={t("addFeatured")}
                        className="flex aspect-250/370 w-full flex-col items-center justify-center gap-2 rounded-[9.6%/6.5%] border-2 border-dashed border-line text-sm font-semibold text-fog transition-colors hover:border-accent hover:text-foreground disabled:opacity-50"
                      >
                        <Plus className="size-6" />
                        {t("addSlot")}
                      </button>
                    ),
                  )}
              </div>
            </section>
          )}

          {(profile.isSelf || profile.albums.length > 0) && (
            <section className="mt-10">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 className={`${heading} flex items-center gap-2`}>
                  <BookBookmark className="size-3.5" />{" "}
                  {t("albums", { count: profile.albums.length, max: PROFILE_ALBUMS_MAX })}
                </h2>
                {profile.isSelf && (
                  <button
                    type="button"
                    onClick={() => setPickingAlbums(true)}
                    className="text-xs text-fog underline hover:text-foreground"
                  >
                    {t("manageAlbums")}
                  </button>
                )}
              </div>
              {profile.albums.length === 0 ? (
                <p className="mt-3 text-sm text-fog">{t(profile.isSelf ? "noAlbumsSelf" : "noAlbums")}</p>
              ) : (
                <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {profile.albums.map((album) => (
                    <AlbumTile key={album.id} album={album} />
                  ))}
                </div>
              )}
            </section>
          )}

          {(profile.isSelf || profile.wishlist.length > 0) && (
            <section className="mt-10">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 className={`${heading} flex items-center gap-2`}>
                  <Heart className="size-3.5" />{" "}
                  {t("wishlist", { count: profile.wishlist.length, max: profile.wishlistMax })}
                </h2>
                {profile.isSelf && (
                  <Link
                    href="/wishlist"
                    className="text-xs text-fog underline hover:text-foreground"
                  >
                    {t("manageWishlist")}
                  </Link>
                )}
              </div>
              {profile.wishlist.length === 0 ? (
                <p className="mt-3 text-sm text-fog">
                  {t("noWishes")}
                </p>
              ) : (
                <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
                  {profile.wishlist.map((card) => (
                    <button
                      key={card.id}
                      type="button"
                      aria-label={t("view", { title: card.title })}
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
              <Trophy className="size-3.5" />{" "}
              {t("achievements", { count: profile.achievements.length, total: ACHIEVEMENTS.length })}
            </h2>
            {profile.achievements.length === 0 ? (
              <p className="mt-3 text-sm text-fog">{t("noAchievements")}</p>
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
                        <span className="block truncate text-sm font-bold">{tAch(`items.${achievementKey(a.key)}.name`)}</span>
                        <span className="block text-xs text-fog">{tAch(`items.${achievementKey(a.key)}.description`)}</span>
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </>
      )}

      {pickingShowcase && (
        <ShowcasePicker
          apiUrl={apiUrl}
          onSelect={(card) => void saveShowcase(card.id)}
          onClose={() => setPickingShowcase(false)}
        />
      )}

      {picking && (
        <ShowcasePicker
          apiUrl={apiUrl}
          title={t("pickerTitle")}
          description={t("pickerDescription", { max: FEATURED_MAX })}
          onSelect={(card) => {
            if (!featuredIds.includes(card.id) && featuredIds.length < FEATURED_MAX)
              void saveFeatured([...featuredIds, card.id]);
          }}
          onClose={() => setPicking(false)}
        />
      )}

      {pickingTitle && profile.stats && (
        <TitlePicker
          apiUrl={apiUrl}
          wikipediaCards={profile.stats.wikipediaCards}
          animeCards={profile.stats.animeCards}
          current={profile.displayedTitle}
          onClose={(changed) => {
            setPickingTitle(false);
            if (changed) router.refresh();
          }}
        />
      )}

      {pickingAlbums && (
        <ProfileAlbumsPicker
          apiUrl={apiUrl}
          onClose={() => {
            setPickingAlbums(false);
            router.refresh();
          }}
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
