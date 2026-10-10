"use client";

import { Search, Users } from "@/components/icons";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  GUILD_DESCRIPTION_MAX,
  GUILD_MAX_MEMBERS,
  GUILD_NAME_MAX,
  type GuildsResponse,
  type GuildSummary,
} from "@wikideck/shared";
import { buttonClass, primaryButtonClass } from "@/components/settings/controls";
import { apiCall, apiFetch } from "@/lib/tags-api";

export function NoGuild({ apiUrl }: { apiUrl: string }) {
  const t = useTranslations("guild.noGuild");
  const tc = useTranslations("common");
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [query, setQuery] = useState("");
  const [guilds, setGuilds] = useState<GuildSummary[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestId = useRef(0);

  useEffect(() => {
    const id = ++requestId.current;
    const timer = setTimeout(
      async () => {
        const r = await apiFetch<GuildsResponse>(
          apiUrl,
          `/guilds?q=${encodeURIComponent(query.trim())}`,
        );
        if (id === requestId.current && r.ok) setGuilds(r.data.guilds);
      },
      query ? 250 : 0,
    );
    return () => clearTimeout(timer);
  }, [apiUrl, query]);

  async function create() {
    setBusy(true);
    setError(null);
    const r = await apiCall(apiUrl, "/guilds", "POST", { name, description });
    setBusy(false);
    if (!r.ok) return setError(r.message);
    router.refresh();
  }

  async function join(id: string) {
    setError(null);
    const r = await apiCall(apiUrl, `/guilds/${id}/join`, "POST");
    if (!r.ok) return setError(r.message);
    router.refresh();
  }

  return (
    <div className="mt-10 grid gap-8 lg:grid-cols-2">
      <section className="rounded-xl border border-line p-6 bg-surface">
        <h2 className="text-lg font-bold">{t("found")}</h2>
        <p className="mt-1 text-sm text-pale-mist">
          {t("foundText", { max: GUILD_MAX_MEMBERS })}
        </p>
        <form
          className="mt-5 space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            void create();
          }}
        >
          <label className="block">
            <span className="text-xs font-bold uppercase tracking-[0.15em] text-fog">{t("name")}</span>
            <input
              value={name}
              maxLength={GUILD_NAME_MAX}
              onChange={(e) => setName(e.target.value)}
              className="mt-2 w-full rounded-lg border border-line bg-transparent px-3 py-2 text-sm outline-none focus:border-accent"
            />
          </label>
          <label className="block">
            <span className="text-xs font-bold uppercase tracking-[0.15em] text-fog">
              {t("description")}
            </span>
            <textarea
              value={description}
              maxLength={GUILD_DESCRIPTION_MAX}
              rows={2}
              onChange={(e) => setDescription(e.target.value)}
              className="mt-2 w-full resize-none rounded-lg border border-line bg-transparent px-3 py-2 text-sm outline-none focus:border-accent"
            />
          </label>
          <button
            type="submit"
            disabled={busy || name.trim().length < 3}
            className={primaryButtonClass}
          >
            {busy ? t("creating") : t("create")}
          </button>
        </form>
      </section>

      <section className="rounded-xl border border-line p-6 bg-surface">
        <h2 className="text-lg font-bold">{t("join")}</h2>
        <div className="relative mt-4">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 opacity-50" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("search")}
            aria-label={t("searchLabel")}
            className="w-full rounded-lg border border-line bg-transparent py-2 pl-9 pr-3 text-sm outline-none focus:border-accent"
          />
        </div>
        {guilds === null ? (
          <p className="py-8 text-center text-sm text-fog">{tc("loading")}</p>
        ) : guilds.length === 0 ? (
          <p className="py-8 text-center text-sm text-fog">{t("empty")}</p>
        ) : (
          <ul className="mt-4 divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface">
            {guilds.map((g) => (
              <li key={g.id} className="flex items-center justify-between gap-3 p-4">
                <div className="min-w-0">
                  <p className="truncate font-bold">{g.name}</p>
                  <p className="mt-0.5 flex items-center gap-1.5 text-xs text-fog">
                    <Users className="size-3.5" />
                    {t("membersOf", { members: g.members, max: GUILD_MAX_MEMBERS, owner: g.owner })}
                  </p>
                  {g.description && (
                    <p className="mt-1 truncate text-xs text-pale-mist">{g.description}</p>
                  )}
                </div>
                <button
                  type="button"
                  disabled={g.members >= GUILD_MAX_MEMBERS}
                  onClick={() => join(g.id)}
                  className={buttonClass}
                >
                  {g.members >= GUILD_MAX_MEMBERS ? t("full") : t("joinButton")}
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
      {error && (
        <p role="alert" className="text-sm text-danger lg:col-span-2">
          {error}
        </p>
      )}
    </div>
  );
}
