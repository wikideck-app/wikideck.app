"use client";

import { ArrowLeft, Ban, Check, Search, ShieldCheck } from "@/components/icons";
import { useFormatter, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import type {
  DeletedAccountRow,
  StaffAlert,
  StaffApiKeyCreated,
  StaffApiKeyRow,
  StaffAuctionRow,
  StaffAuditRow,
  StaffGuildDetail,
  StaffGuildRow,
  StaffMemberDetail,
  StaffMemberRow,
  StaffOverview,
  StaffBugReportRow,
  StaffReportRow,
  StaffRole,
  StaffUserAction,
  TrustLevel,
} from "@wikideck/shared";
import { useConfirm } from "@/components/confirm-dialog";
import { ShopAdmin } from "@/components/staff/shop-admin";
import { buttonClass, dangerButtonClass, primaryButtonClass } from "@/components/settings/controls";
import { Wikibits } from "@/components/wikibit";
import { apiCall, apiFetch } from "@/lib/tags-api";

type Tab =
  "overview" | "members" | "alerts" | "reports" | "bugs" | "auctions" | "guilds" | "deleted" | "audit" | "apiKeys" | "shop";

const panel = "rounded-xl border border-line bg-surface p-5";
const heading = "text-xs font-bold uppercase tracking-[0.2em] text-fog";
const field =
  "rounded-lg border border-line bg-transparent px-3 py-2 text-sm outline-none focus:border-accent";
type Translator = ReturnType<typeof useTranslations<"staff">>;
// libellés d'actions et d'indices : l'API peut en envoyer de nouveaux, on retombe sur l'identifiant brut
const known = (t: Translator, group: "signals" | "actions", key: string) =>
  t.has(`${group}.${key}` as never) ? t(`${group}.${key}` as never) : key;

const TRUST_STYLE: Record<TrustLevel, string> = {
  TRUSTED: "bg-success/15 text-success",
  SUSPECT: "bg-warning/15 text-warning",
  RESTRICTED: "bg-danger/15 text-danger",
};
function Badge({ children, className }: { children: React.ReactNode; className: string }) {
  return (
    <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${className}`}>
      {children}
    </span>
  );
}

function Avatar({
  url,
  name,
  size = "size-9",
}: {
  url: string | null;
  name: string;
  size?: string;
}) {
  return url ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={url} alt="" className={`${size} shrink-0 rounded-full`} />
  ) : (
    <span
      className={`${size} flex shrink-0 items-center justify-center rounded-full bg-accent/15 text-sm font-bold`}
    >
      {name.slice(0, 1).toUpperCase()}
    </span>
  );
}

function Stat({ value, label }: { value: string | number; label: string }) {
  return (
    <div className="rounded-xl border border-line px-4 py-3 text-center">
      <div className="font-display text-2xl font-medium tabular-nums">{value}</div>
      <div className="text-[11px] uppercase tracking-[0.12em] text-fog">{label}</div>
    </div>
  );
}

function describe(row: StaffAuditRow, t: Translator) {
  const d = (row.detail ?? {}) as Record<string, unknown>;
  switch (row.action) {
    case "ban":
    case "delete_user":
      return t("audit.reason", { reason: String(d.reason) });
    case "rename":
      return `${d.from} → ${d.to}`;
    case "wikibits":
      return `${Number(d.amount) > 0 ? "+" : ""}${t("audit.wikibits", { amount: String(d.amount), reason: String(d.reason) })}`;
    case "packs":
      return t("audit.packs", { count: Number(d.count) });
    case "set_role":
      return t("audit.role", {
        from: String(d.from ?? t("audit.noRole")),
        to: String(d.to ?? t("audit.noRole")),
      });
    case "set_trust":
      return String(d.override ?? t("audit.automatic"));
    case "clear_signals":
      return t("audit.signals", { count: Number(d.count) });
    case "cancel_auction": {
      const refund = d.refunded as { to: string; amount: number } | null;
      return `${d.card} · ${d.reason}${refund ? t("audit.refund", { amount: refund.amount, to: refund.to }) : ""}`;
    }
    case "guild_edit": {
      const name = d.name as { from: string; to: string } | undefined;
      return name ? `${name.from} → ${name.to}` : String(d.guild);
    }
    case "guild_kick":
      return String(d.guild);
    case "api_key_create":
    case "api_key_revoke":
    case "shop_create":
    case "shop_update":
    case "shop_delete":
      return t("audit.apiKey", { name: String(d.name) });
    case "guild_dissolve":
      return t("audit.guildDissolve", { guild: String(d.guild), count: Number(d.members) });
    default:
      return "";
  }
}

function AuditList({ rows, onOpen }: { rows: StaffAuditRow[]; onOpen?: (id: string) => void }) {
  const t = useTranslations("staff");
  const format = useFormatter();
  if (!rows.length) return <p className="prose-serif text-pale-mist">{t("audit.none")}</p>;
  return (
    <ul className="flex flex-col gap-2">
      {rows.map((a) => (
        <li key={a.id} className="rounded-xl border border-line px-3.5 py-2.5 text-sm">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
            <strong>{known(t, "actions", a.action)}</strong>
            <span className="text-fog">{t("audit.by", { name: a.actorName })}</span>
            {a.targetName && (
              <button
                type="button"
                className="text-accent hover:underline"
                onClick={() => a.targetId && onOpen?.(a.targetId)}
                disabled={!onOpen}
              >
                → {a.targetName}
              </button>
            )}
            <span className="ml-auto text-xs text-fog">
              {format.dateTime(new Date(a.createdAt), "mediumTime")}
            </span>
          </div>
          {describe(a, t) && (
            <div className="mt-0.5 text-xs text-pale-mist">{describe(a, t)}</div>
          )}
        </li>
      ))}
    </ul>
  );
}

function Overview({ apiUrl }: { apiUrl: string }) {
  const t = useTranslations("staff");
  const tc = useTranslations("common");
  const { number: num } = useFormatter();
  const [data, setData] = useState<StaffOverview | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    void apiFetch<StaffOverview>(apiUrl, "/staff/overview").then((r) =>
      r.ok ? setData(r.data) : setError(r.message),
    );
  }, [apiUrl]);
  if (error) return <p className="mt-6 text-sm text-danger">{error}</p>;
  if (!data) return <p className="mt-6 text-sm text-fog">{tc("loading")}</p>;
  const tiles: [string | number, string][] = [
    [num(data.users), t("overview.members")],
    [num(data.newUsers7d), t("overview.new7d")],
    [num(data.packsOpened24h), t("overview.packs24h")],
    [num(data.battleGames24h), t("overview.battles24h")],
    [num(data.auctionsActive), t("overview.auctions")],
    [num(data.tradesPending), t("overview.trades")],
    [num(data.flagged), t("overview.flagged")],
    [num(data.banned), t("overview.banned")],
    [num(data.staff), t("overview.staff")],
  ];
  return (
    <div className="mt-6 grid gap-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {tiles.map(([v, l]) => (
          <Stat key={l} value={v} label={l} />
        ))}
        <div className="rounded-xl border border-line px-4 py-3 text-center">
          <div className="font-display text-2xl font-medium">
            <Wikibits amount={data.wikibitsTotal} />
          </div>
          <div className="text-[11px] uppercase tracking-[0.12em] text-fog">{t("overview.circulation")}</div>
        </div>
      </div>
    </div>
  );
}

function Members({
  apiUrl,
  openId,
  onOpen,
}: {
  apiUrl: string;
  openId: string | null;
  onOpen: (id: string | null) => void;
}) {
  const t = useTranslations("staff");
  const format = useFormatter();
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState("");
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<{
    users: StaffMemberRow[];
    total: number;
    totalPages: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (openId) return;
    const id = setTimeout(async () => {
      const params = new URLSearchParams({ page: String(page) });
      if (q.trim()) params.set("q", q.trim());
      if (filter) params.set("filter", filter);
      const res = await apiFetch<{ users: StaffMemberRow[]; total: number; totalPages: number }>(
        apiUrl,
        `/staff/users?${params}`,
      );
      if (res.ok) {
        setResult(res.data);
        setError(null);
      } else setError(res.message);
    }, 250);
    return () => clearTimeout(id);
  }, [apiUrl, q, filter, page, openId]);

  if (openId) return null;
  return (
    <div className="mt-6">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-64 flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-fog" />
          <input
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(1);
            }}
            placeholder={t("members.search")}
            className={`${field} w-full pl-9`}
          />
        </div>
        <select
          value={filter}
          onChange={(e) => {
            setFilter(e.target.value);
            setPage(1);
          }}
          className={field}
        >
          <option value="">{t("members.all")}</option>
          <option value="banned">{t("members.bannedFilter")}</option>
          <option value="staff">{t("members.staffFilter")}</option>
        </select>
      </div>
      {error && <p className="mt-3 text-sm text-danger">{error}</p>}
      <ul className="mt-4 flex flex-col gap-2">
        {result?.users.map((u) => (
          <li key={u.id}>
            <button
              type="button"
              onClick={() => onOpen(u.id)}
              className="flex w-full items-center gap-3 rounded-xl border border-line bg-surface px-4 py-2.5 text-left transition-colors hover:border-accent"
            >
              <Avatar url={u.avatarUrl} name={u.username} />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="truncate text-sm font-semibold">{u.username}</span>
                  {u.staff && (
                    <Badge className="bg-accent/15 text-accent">{t(`roles.${u.staff}`)}</Badge>
                  )}
                  {u.banned && (
                    <Badge className="bg-danger/15 text-danger">{t("members.banned")}</Badge>
                  )}
                  <Badge className={TRUST_STYLE[u.trust]}>{t(`trust.${u.trust}`)}</Badge>
                </div>
                <div className="text-xs text-fog">
                  {t("members.joined", {
                    date: format.dateTime(new Date(u.createdAt), "medium"),
                    cards: u.cards,
                  })}
                </div>
              </div>
              <Wikibits amount={u.wikibits} className="shrink-0 text-sm text-fog" />
            </button>
          </li>
        ))}
        {result && !result.users.length && (
          <li className="prose-serif py-6 text-center text-pale-mist">{t("members.none")}</li>
        )}
      </ul>
      {result && result.totalPages > 1 && (
        <div className="mt-4 flex items-center justify-center gap-3 text-sm">
          <button
            type="button"
            className={buttonClass}
            disabled={page <= 1}
            onClick={() => setPage(page - 1)}
          >
            {t("pager.previous")}
          </button>
          <span className="text-fog">
            {t("members.pageInfo", { page, total: result.totalPages, count: result.total })}
          </span>
          <button
            type="button"
            className={buttonClass}
            disabled={page >= result.totalPages}
            onClick={() => setPage(page + 1)}
          >
            {t("pager.next")}
          </button>
        </div>
      )}
    </div>
  );
}

function Member({
  apiUrl,
  id,
  role,
  meId,
  onBack,
  onOpen,
}: {
  apiUrl: string;
  id: string;
  role: StaffRole;
  meId: string;
  onBack: () => void;
  onOpen: (id: string) => void;
}) {
  const t = useTranslations("staff");
  const tm = useTranslations("staff.member");
  const tc = useTranslations("common");
  const format = useFormatter();
  const [m, setM] = useState<StaffMemberDetail | null>(null);
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [reason, setReason] = useState("");
  const [username, setUsername] = useState("");
  const [amount, setAmount] = useState("");
  const [bitsReason, setBitsReason] = useState("");
  const [delReason, setDelReason] = useState("");
  const [delConfirm, setDelConfirm] = useState("");
  const { confirm, dialog: confirmDialog } = useConfirm();
  const [packs, setPacks] = useState("1");

  const load = useCallback(async () => {
    const res = await apiFetch<StaffMemberDetail>(apiUrl, `/staff/users/${id}`);
    if (res.ok) setM(res.data);
    else setNotice({ ok: false, text: res.message });
  }, [apiUrl, id]);
  useEffect(() => {
    let cancelled = false;
    void apiFetch<StaffMemberDetail>(apiUrl, `/staff/users/${id}`).then((res) => {
      if (cancelled) return;
      if (res.ok) setM(res.data);
      else setNotice({ ok: false, text: res.message });
    });
    return () => {
      cancelled = true;
    };
  }, [apiUrl, id]);

  const run = async (body: StaffUserAction, done: string) => {
    setBusy(true);
    setNotice(null);
    const res = await apiCall<StaffMemberRow>(apiUrl, `/staff/users/${id}`, "POST", body);
    setBusy(false);
    if (res.ok) {
      setNotice({ ok: true, text: done });
      await load();
      return true;
    }
    setNotice({ ok: false, text: res.message });
    return false;
  };

  const deleteAccount = async () => {
    if (!m) return;
    const ok = await confirm({
      title: tm("delTitle", { name: m.username }),
      message: tm("delMessage"),
      confirmLabel: tm("delConfirm"),
      danger: true,
    });
    if (!ok) return;
    setBusy(true);
    setNotice(null);
    const res = await apiCall(apiUrl, `/staff/users/${id}`, "POST", {
      action: "delete",
      reason: delReason,
      confirm: delConfirm,
    } satisfies StaffUserAction);
    setBusy(false);
    if (res.ok) onBack();
    else setNotice({ ok: false, text: res.message });
  };

  if (!m)
    return (
      <div className="mt-6">
        <button type="button" className={buttonClass} onClick={onBack}>
          <ArrowLeft className="size-4" /> {t("members.back")}
        </button>
        <p className="mt-4 text-sm text-fog">{notice?.text ?? tc("loading")}</p>
      </div>
    );

  const isAdmin = role === "ADMIN";
  const isSelf = m.id === meId;
  const outranks = !isSelf && (m.staff === null || (role === "ADMIN" && m.staff === "MODERATOR"));

  return (
    <div className="mt-6 flex flex-col gap-5">
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" className={buttonClass} onClick={onBack}>
          <ArrowLeft className="size-4" /> {t("members.back")}
        </button>
        {notice && (
          <span
            role="status"
            className={`flex items-center gap-1.5 text-sm font-semibold ${notice.ok ? "text-success" : "text-danger"}`}
          >
            {notice.ok && <Check className="size-4" />}
            {notice.text}
          </span>
        )}
      </div>

      <section className={`${panel} flex flex-wrap items-center gap-4`}>
        <Avatar url={m.avatarUrl} name={m.username} size="size-16" />
        <div className="min-w-48 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-display text-3xl font-medium">{m.username}</h2>
            {m.staff && <Badge className="bg-accent/15 text-accent">{t(`roles.${m.staff}`)}</Badge>}
            {m.banned && <Badge className="bg-danger/15 text-danger">{t("members.banned")}</Badge>}
            <Badge className={TRUST_STYLE[m.trust]}>{t(`trust.${m.trust}`)}</Badge>
          </div>
          <div className="mt-1 text-xs text-fog">
            {tm("discord", { id: m.discordId })}
            {m.discordCreatedAt &&
              tm("discordCreated", { date: format.dateTime(new Date(m.discordCreatedAt), "medium") })}
            {tm("joinedOn", { date: format.dateTime(new Date(m.createdAt), "medium") })}
          </div>
          {m.banned && (
            <div className="mt-1 text-sm text-danger">
              {tm("bannedOn", {
                when: m.bannedAt
                  ? tm("bannedWhen", { date: format.dateTime(new Date(m.bannedAt), "mediumTime") })
                  : "",
                reason: m.banReason ?? "",
              })}
            </div>
          )}
        </div>
      </section>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <div className="rounded-xl border border-line px-4 py-3 text-center">
          <div className="font-display text-2xl font-medium">
            <Wikibits amount={m.wikibits} />
          </div>
          <div className="text-[11px] uppercase tracking-[0.12em] text-fog">{tm("balance")}</div>
        </div>
        <Stat value={m.packs} label={tm("packs")} />
        <Stat value={m.cards} label={tm("cards")} />
        <Stat value={format.number(m.pulls)} label={tm("pulls")} />
        <Stat value={m.battle.played} label={tm("games")} />
        <Stat value={m.battle.wins} label={tm("wins")} />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <section className={panel}>
          <h3 className={heading}>{tm("trustTitle")}</h3>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <Stat value={m.trustScore} label={tm("trustScore")} />
            <Stat value={m.riskScore} label={tm("riskScore")} />
          </div>
          {m.trustOverride && (
            <p className="mt-3 text-xs text-fog">
              {tm.rich("override", {
                level: t(`trust.${m.trustOverride}`),
                strong: (chunks) => <strong>{chunks}</strong>,
              })}
            </p>
          )}
          <h4 className="mt-4 text-xs font-bold uppercase tracking-[0.14em] text-fog">
            {tm("signals")}
          </h4>
          {m.signals.length ? (
            <ul className="mt-2 flex flex-col gap-1.5 text-sm">
              {m.signals.map((s, i) => (
                <li key={i} className="flex items-center justify-between gap-3">
                  <span>{known(t, "signals", s.type)}</span>
                  <span className="text-xs text-fog">
                    +{s.weight} · {format.dateTime(new Date(s.at), "mediumTime")}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-fog">{tm("noSignals")}</p>
          )}
          {m.linkedAccounts.length > 0 && (
            <>
              <h4 className="mt-4 text-xs font-bold uppercase tracking-[0.14em] text-fog">
                {tm("linked")}
              </h4>
              <div className="mt-2 flex flex-wrap gap-2">
                {m.linkedAccounts.map((l) => (
                  <button
                    key={l.id}
                    type="button"
                    onClick={() => onOpen(l.id)}
                    className="rounded-full border border-line px-3 py-1 text-sm hover:border-accent"
                  >
                    {l.username}
                  </button>
                ))}
              </div>
            </>
          )}
          {outranks && (
            <div className="mt-5 flex flex-wrap items-center gap-3">
              <select
                value={m.trustOverride ?? ""}
                disabled={busy}
                onChange={(e) =>
                  void run(
                    {
                      action: "setTrust",
                      override: (e.target.value || null) as "TRUSTED" | "RESTRICTED" | null,
                    },
                    tm("trustUpdated"),
                  )
                }
                className={field}
                aria-label={tm("overrideLabel")}
              >
                <option value="">{tm("overrideAuto")}</option>
                <option value="TRUSTED">{tm("overrideTrusted")}</option>
                <option value="RESTRICTED">{tm("overrideRestricted")}</option>
              </select>
              <button
                type="button"
                className={buttonClass}
                disabled={busy || !m.signals.length}
                onClick={() => void run({ action: "clearSignals" }, tm("signalsCleared"))}
              >
                {tm("clearSignals")}
              </button>
            </div>
          )}
        </section>

        <section className={panel}>
          <h3 className={heading}>{tm("moderation")}</h3>
          <div className="mt-3 flex flex-col gap-4">
            <form
              className="flex gap-2"
              onSubmit={async (e) => {
                e.preventDefault();
                if (await run({ action: "rename", username }, tm("renamed"))) setUsername("");
              }}
            >
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder={tm("newName")}
                className={`${field} min-w-0 flex-1`}
                disabled={!outranks && !isSelf}
              />
              <button
                type="submit"
                className={buttonClass}
                disabled={busy || !username.trim() || (!outranks && !isSelf)}
              >
                {tm("rename")}
              </button>
            </form>

            {m.banned ? (
              <button
                type="button"
                className={primaryButtonClass}
                disabled={busy}
                onClick={() => void run({ action: "unban" }, tm("reactivated"))}
              >
                <Check className="size-4" /> {tm("reactivate")}
              </button>
            ) : (
              <form
                className="flex flex-col gap-2"
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (await run({ action: "ban", reason }, tm("banned"))) setReason("");
                }}
              >
                <input
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder={tm("banReason")}
                  className={field}
                  disabled={!outranks}
                />
                <button
                  type="submit"
                  className={dangerButtonClass}
                  disabled={busy || reason.trim().length < 3 || !outranks}
                >
                  <Ban className="size-4" /> {tm("ban")}
                </button>
              </form>
            )}
            {!outranks && !isSelf && (
              <p className="text-xs text-fog">
                {tm("outranked")}
              </p>
            )}
          </div>

          {isAdmin && (
            <>
              <h3 className={`${heading} mt-6`}>{tm("economy")}</h3>
              <div className="mt-3 flex flex-col gap-4">
                <form
                  className="flex flex-wrap gap-2"
                  onSubmit={async (e) => {
                    e.preventDefault();
                    const ok = await run(
                      { action: "wikibits", amount: Number(amount), reason: bitsReason },
                      tm("balanceUpdated"),
                    );
                    if (ok) {
                      setAmount("");
                      setBitsReason("");
                    }
                  }}
                >
                  <input
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    inputMode="numeric"
                    placeholder={tm("bitsPlaceholder")}
                    className={`${field} w-28`}
                  />
                  <input
                    value={bitsReason}
                    onChange={(e) => setBitsReason(e.target.value)}
                    placeholder={tm("reason")}
                    className={`${field} min-w-40 flex-1`}
                  />
                  <button
                    type="submit"
                    className={buttonClass}
                    disabled={
                      busy ||
                      !Number.isInteger(Number(amount)) ||
                      !Number(amount) ||
                      bitsReason.trim().length < 3
                    }
                  >
                    {tm("apply")}
                  </button>
                </form>
                <form
                  className="flex gap-2"
                  onSubmit={async (e) => {
                    e.preventDefault();
                    await run({ action: "packs", count: Number(packs) }, tm("packsGiven"));
                  }}
                >
                  <input
                    value={packs}
                    onChange={(e) => setPacks(e.target.value)}
                    inputMode="numeric"
                    className={`${field} w-20`}
                    aria-label={tm("packsCount")}
                  />
                  <button
                    type="submit"
                    className={buttonClass}
                    disabled={busy || !Number.isInteger(Number(packs)) || Number(packs) < 1}
                  >
                    {tm("givePacks")}
                  </button>
                </form>
                {!isSelf && (
                  <label className="flex items-center gap-3 text-sm">
                    <ShieldCheck className="size-4 text-accent" />
                    <span className="text-fog">{tm("role")}</span>
                    <select
                      value={m.staff ?? ""}
                      disabled={busy}
                      onChange={(e) =>
                        void run(
                          { action: "setRole", role: (e.target.value || null) as StaffRole | null },
                          tm("roleUpdated"),
                        )
                      }
                      className={field}
                    >
                      <option value="">{tm("player")}</option>
                      <option value="MODERATOR">{t("roles.MODERATOR")}</option>
                      <option value="ADMIN">{t("roles.ADMIN")}</option>
                    </select>
                  </label>
                )}
              </div>
            </>
          )}
        </section>
      </div>

      {isAdmin && outranks && (
        <section className={`${panel} border-danger/50`}>
          <h3 className={`${heading} text-danger`}>{tm("danger")}</h3>
          <p className="mt-2 text-sm text-pale-mist">
            {tm("dangerText")}
          </p>
          <form
            className="mt-3 flex flex-col gap-2 sm:max-w-md"
            onSubmit={(e) => {
              e.preventDefault();
              void deleteAccount();
            }}
          >
            <input
              value={delReason}
              onChange={(e) => setDelReason(e.target.value)}
              placeholder={tm("reason")}
              className={field}
            />
            <input
              value={delConfirm}
              onChange={(e) => setDelConfirm(e.target.value)}
              placeholder={tm("typeName", { name: m.username })}
              className={field}
            />
            <button
              type="submit"
              className={dangerButtonClass}
              disabled={busy || delReason.trim().length < 3 || delConfirm !== m.username}
            >
              {tm("delConfirm")}
            </button>
          </form>
        </section>
      )}
      {confirmDialog}

      <section className={panel}>
        <h3 className={heading}>{tm("actionsOn")}</h3>
        <div className="mt-3">
          <AuditList rows={m.actions} />
        </div>
      </section>
    </div>
  );
}

function Alerts({ apiUrl, onOpen }: { apiUrl: string; onOpen: (id: string) => void }) {
  const t = useTranslations("staff");
  const tc = useTranslations("common");
  const router = useRouter();
  const [alerts, setAlerts] = useState<StaffAlert[] | null>(null);
  const markRead = async (body: { userId: string } | { all: true }) => {
    const res = await apiCall(apiUrl, "/staff/alerts", "POST", body);
    if (!res.ok) return;
    setAlerts((prev) =>
      prev && ("all" in body ? [] : prev.filter((a) => a.id !== body.userId)),
    );
    router.refresh();
  };
  useEffect(() => {
    void apiFetch<{ alerts: StaffAlert[] }>(apiUrl, "/staff/alerts").then(
      (r) => r.ok && setAlerts(r.data.alerts),
    );
  }, [apiUrl]);
  if (!alerts) return <p className="mt-6 text-sm text-fog">{tc("loading")}</p>;
  return (
    <div className="mt-6">
      <p className="prose-serif text-pale-mist">
        {t("alerts.intro")}
      </p>
      {alerts.length > 0 && (
        <button
          type="button"
          className={`${buttonClass} mt-3`}
          onClick={() => void markRead({ all: true })}
        >
          {t("alerts.markAllRead")}
        </button>
      )}
      <ul className="mt-4 flex flex-col gap-2">
        {alerts.map((a) => (
          <li key={a.id} className="flex items-stretch gap-2">
            <button
              type="button"
              onClick={() => onOpen(a.id)}
              className="flex min-w-0 flex-1 items-center gap-3 rounded-xl border border-line bg-surface px-4 py-3 text-left hover:border-accent"
            >
              <Avatar url={a.avatarUrl} name={a.username} />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-semibold">{a.username}</span>
                  <Badge className={TRUST_STYLE[a.level]}>{t(`trust.${a.level}`)}</Badge>
                </div>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {a.signals.map((s) => (
                    <span
                      key={s}
                      className="rounded-full bg-foreground/10 px-2 py-0.5 text-[11px] text-fog"
                    >
                      {known(t, "signals", s)}
                    </span>
                  ))}
                </div>
              </div>
              <span className="shrink-0 font-display text-2xl tabular-nums text-danger">
                {a.riskScore}
              </span>
            </button>
            <button
              type="button"
              className={buttonClass}
              onClick={() => void markRead({ userId: a.id })}
            >
              {t("alerts.markRead")}
            </button>
          </li>
        ))}
        {!alerts.length && (
          <li className="prose-serif py-6 text-center text-pale-mist">{t("alerts.none")}</li>
        )}
      </ul>
    </div>
  );
}

function Pager({
  page,
  totalPages,
  onPage,
}: {
  page: number;
  totalPages: number;
  onPage: (p: number) => void;
}) {
  const t = useTranslations("staff.pager");
  if (totalPages <= 1) return null;
  return (
    <div className="mt-4 flex items-center justify-center gap-3 text-sm">
      <button
        type="button"
        className={buttonClass}
        disabled={page <= 1}
        onClick={() => onPage(page - 1)}
      >
        {t("previous")}
      </button>
      <span className="text-fog">{t("page", { page, total: totalPages })}</span>
      <button
        type="button"
        className={buttonClass}
        disabled={page >= totalPages}
        onClick={() => onPage(page + 1)}
      >
        {t("next")}
      </button>
    </div>
  );
}

function Reports({ apiUrl, onOpen }: { apiUrl: string; onOpen: (id: string) => void }) {
  const t = useTranslations("staff.reports");
  const tc = useTranslations("common");
  const format = useFormatter();
  const [all, setAll] = useState(false);
  const [page, setPage] = useState(1);
  const [reload, setReload] = useState(0);
  const [data, setData] = useState<{ reports: StaffReportRow[]; totalPages: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void apiFetch<{ reports: StaffReportRow[]; totalPages: number }>(
      apiUrl,
      `/staff/reports?page=${page}${all ? "&status=all" : ""}`,
    ).then((res) => {
      if (cancelled) return;
      if (res.ok) setData(res.data);
      else setError(res.message);
    });
    return () => {
      cancelled = true;
    };
  }, [apiUrl, page, all, reload]);

  const handle = async (id: string, action: "dismiss" | "deleteMessage") => {
    const res = await apiCall(apiUrl, `/staff/reports/${id}`, "POST", { action });
    setError(res.ok ? null : res.message);
    setReload((n) => n + 1);
  };

  if (!data) return <p className="mt-6 text-sm text-fog">{error ?? tc("loading")}</p>;
  return (
    <div className="mt-6">
      <p className="prose-serif text-pale-mist">
        {t("intro")}
      </p>
      <label className="mt-3 flex items-center gap-2 text-sm text-fog">
        <input
          type="checkbox"
          checked={all}
          onChange={(e) => {
            setAll(e.target.checked);
            setPage(1);
          }}
        />
        {t("showAll")}
      </label>
      {error && <p className="mt-3 text-sm text-danger">{error}</p>}
      <ul className="mt-4 flex flex-col gap-3">
        {data.reports.map((r) => (
          <li key={r.id} className={`${panel} flex flex-col gap-3`}>
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <button
                type="button"
                className="font-semibold text-accent hover:underline"
                onClick={() => onOpen(r.sender.id)}
              >
                {r.sender.username}
              </button>
              <span className="text-fog">{t("reportedBy", { name: r.reporter.username })}</span>
              <span className="ml-auto text-xs text-fog">
                {format.dateTime(new Date(r.createdAt), "mediumTime")}
              </span>
              {r.status !== "OPEN" && (
                <Badge className="bg-foreground/10 text-fog">
                  {r.status === "DELETED" ? t("deleted") : t("dismissed")}
                  {r.handledBy && ` · ${r.handledBy}`}
                </Badge>
              )}
            </div>
            <div className="flex flex-col gap-1.5 rounded-xl border border-line p-3 text-sm">
              {r.context.map((c, i) => (
                <div key={i} className={c.from === "sender" ? "" : "text-right text-fog"}>
                  <span className="mr-1.5 text-[11px] text-fog">
                    {c.from === "sender" ? r.sender.username : r.reporter.username}
                  </span>
                  {c.body}
                </div>
              ))}
              <div className="rounded-lg bg-danger/10 px-2.5 py-1.5 font-semibold">{r.body}</div>
            </div>
            {r.status === "OPEN" && (
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className={dangerButtonClass}
                  onClick={() => void handle(r.id, "deleteMessage")}
                >
                  {t("deleteMessage")}
                </button>
                <button
                  type="button"
                  className={buttonClass}
                  onClick={() => void handle(r.id, "dismiss")}
                >
                  {t("dismiss")}
                </button>
                <button type="button" className={buttonClass} onClick={() => onOpen(r.sender.id)}>
                  {t("viewAuthor")}
                </button>
              </div>
            )}
          </li>
        ))}
        {!data.reports.length && (
          <li className="prose-serif py-6 text-center text-pale-mist">{t("none")}</li>
        )}
      </ul>
      <Pager page={page} totalPages={data.totalPages} onPage={setPage} />
    </div>
  );
}

function Bugs({ apiUrl, onOpen }: { apiUrl: string; onOpen: (id: string) => void }) {
  const t = useTranslations("staff.bugs");
  const tr = useTranslations("staff.reports");
  const tc = useTranslations("common");
  const format = useFormatter();
  const [all, setAll] = useState(false);
  const [page, setPage] = useState(1);
  const [reload, setReload] = useState(0);
  const [data, setData] = useState<{ reports: StaffBugReportRow[]; totalPages: number } | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void apiFetch<{ reports: StaffBugReportRow[]; totalPages: number }>(
      apiUrl,
      `/staff/bug-reports?page=${page}${all ? "&status=all" : ""}`,
    ).then((res) => {
      if (cancelled) return;
      if (res.ok) setData(res.data);
      else setError(res.message);
    });
    return () => {
      cancelled = true;
    };
  }, [apiUrl, page, all, reload]);

  const handle = async (id: string, action: "resolve" | "dismiss") => {
    const res = await apiCall(apiUrl, `/staff/bug-reports/${id}`, "POST", { action });
    setError(res.ok ? null : res.message);
    setReload((n) => n + 1);
  };

  if (!data) return <p className="mt-6 text-sm text-fog">{error ?? tc("loading")}</p>;
  return (
    <div className="mt-6">
      <p className="prose-serif text-pale-mist">{t("intro")}</p>
      <label className="mt-3 flex items-center gap-2 text-sm text-fog">
        <input
          type="checkbox"
          checked={all}
          onChange={(e) => {
            setAll(e.target.checked);
            setPage(1);
          }}
        />
        {t("showAll")}
      </label>
      {error && <p className="mt-3 text-sm text-danger">{error}</p>}
      <ul className="mt-4 flex flex-col gap-3">
        {data.reports.map((r) => (
          <li key={r.id} className={`${panel} flex flex-col gap-3`}>
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <button
                type="button"
                className="font-semibold text-accent hover:underline"
                onClick={() => onOpen(r.reporter.id)}
              >
                {r.reporter.username}
              </button>
              {r.page && <span className="text-fog">{t("onPage", { page: r.page })}</span>}
              <span className="ml-auto text-xs text-fog">
                {format.dateTime(new Date(r.createdAt), "mediumTime")}
              </span>
              {r.status !== "OPEN" && (
                <Badge className="bg-foreground/10 text-fog">
                  {r.status === "RESOLVED" ? t("resolved") : tr("dismissed")}
                  {r.handledBy && ` · ${r.handledBy}`}
                </Badge>
              )}
            </div>
            <p className="whitespace-pre-wrap break-words rounded-xl border border-line p-3 text-sm">
              {r.message}
            </p>
            {r.userAgent && <p className="break-all text-[11px] text-fog">{r.userAgent}</p>}
            {r.status === "OPEN" && (
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className={primaryButtonClass}
                  onClick={() => void handle(r.id, "resolve")}
                >
                  {t("resolve")}
                </button>
                <button
                  type="button"
                  className={buttonClass}
                  onClick={() => void handle(r.id, "dismiss")}
                >
                  {tr("dismiss")}
                </button>
              </div>
            )}
          </li>
        ))}
        {!data.reports.length && (
          <li className="prose-serif py-6 text-center text-pale-mist">{t("none")}</li>
        )}
      </ul>
      <Pager page={page} totalPages={data.totalPages} onPage={setPage} />
    </div>
  );
}

function Auctions({ apiUrl, onOpen }: { apiUrl: string; onOpen: (id: string) => void }) {
  const t = useTranslations("staff");
  const ta = useTranslations("staff.auctions");
  const format = useFormatter();
  const [q, setQ] = useState("");
  const [all, setAll] = useState(false);
  const [page, setPage] = useState(1);
  const [reload, setReload] = useState(0);
  const [data, setData] = useState<{ auctions: StaffAuctionRow[]; totalPages: number } | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState<string | null>(null);
  const [reason, setReason] = useState("");

  useEffect(() => {
    const id = setTimeout(async () => {
      const params = new URLSearchParams({ page: String(page) });
      if (q.trim()) params.set("q", q.trim());
      if (all) params.set("status", "all");
      const res = await apiFetch<{ auctions: StaffAuctionRow[]; totalPages: number }>(
        apiUrl,
        `/staff/auctions?${params}`,
      );
      if (res.ok) setData(res.data);
      else setError(res.message);
    }, 250);
    return () => clearTimeout(id);
  }, [apiUrl, q, all, page, reload]);

  const cancel = async (id: string) => {
    const res = await apiCall(apiUrl, `/staff/auctions/${id}`, "POST", {
      action: "cancel",
      reason,
    });
    if (res.ok) {
      setError(null);
      setCancelling(null);
      setReason("");
      setReload((n) => n + 1);
    } else setError(res.message);
  };

  return (
    <div className="mt-6">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-64 flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-fog" />
          <input
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(1);
            }}
            placeholder={ta("search")}
            className={`${field} w-full pl-9`}
          />
        </div>
        <label className="flex items-center gap-2 text-sm text-fog">
          <input
            type="checkbox"
            checked={all}
            onChange={(e) => {
              setAll(e.target.checked);
              setPage(1);
            }}
          />
          {ta("includeEnded")}
        </label>
      </div>
      {error && <p className="mt-3 text-sm text-danger">{error}</p>}
      <ul className="mt-4 flex flex-col gap-2">
        {data?.auctions.map((a) => (
          <li key={a.id} className="rounded-xl border border-line bg-surface px-4 py-3">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <strong className="text-sm">{a.card.title}</strong>
              <Badge className="bg-foreground/10 text-fog">{t(`auctionStatus.${a.status}`)}</Badge>
              <span className="text-sm text-fog">
                {ta.rich("seller", {
                  name: () => (
                    <button
                      type="button"
                      className="text-accent hover:underline"
                      onClick={() => onOpen(a.seller.id)}
                    >
                      {a.seller.username}
                    </button>
                  ),
                })}
              </span>
              <span className="ml-auto text-sm tabular-nums">
                <Wikibits amount={a.currentBid ?? a.startPrice} /> · {ta("bids", { count: a.bidCount })}
              </span>
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-x-3 text-xs text-fog">
              <span>{ta("endsOn", { date: format.dateTime(new Date(a.endsAt), "mediumTime") })}</span>
              {a.leader && (
                <span>
                  {ta.rich("leader", {
                    name: () => (
                      <button
                        type="button"
                        className="text-accent hover:underline"
                        onClick={() => onOpen(a.leader!.id)}
                      >
                        {a.leader!.username}
                      </button>
                    ),
                  })}
                </span>
              )}
            </div>
            {a.status === "ACTIVE" &&
              (cancelling === a.id ? (
                <form
                  className="mt-3 flex flex-wrap gap-2"
                  onSubmit={(e) => {
                    e.preventDefault();
                    void cancel(a.id);
                  }}
                >
                  <input
                    autoFocus
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder={ta("reasonPlaceholder")}
                    className={`${field} min-w-40 flex-1`}
                  />
                  <button
                    type="submit"
                    className={dangerButtonClass}
                    disabled={reason.trim().length < 3}
                  >
                    {ta("confirmCancel")}
                  </button>
                  <button type="button" className={buttonClass} onClick={() => setCancelling(null)}>
                    {ta("back")}
                  </button>
                </form>
              ) : (
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <button type="button" className={buttonClass} onClick={() => setCancelling(a.id)}>
                    {ta("cancelSale")}
                  </button>
                  <span className="text-xs text-fog">
                    {ta("returns", {
                      refund: a.leader
                        ? ta("refund", { amount: a.currentBid ?? 0, name: a.leader.username })
                        : "",
                    })}
                  </span>
                </div>
              ))}
          </li>
        ))}
        {data && !data.auctions.length && (
          <li className="prose-serif py-6 text-center text-pale-mist">{ta("none")}</li>
        )}
      </ul>
      {data && <Pager page={page} totalPages={data.totalPages} onPage={setPage} />}
    </div>
  );
}

function Guilds({
  apiUrl,
  role,
  onOpen,
}: {
  apiUrl: string;
  role: StaffRole;
  onOpen: (id: string) => void;
}) {
  const t = useTranslations("staff.guilds");
  const tc = useTranslations("common");
  const format = useFormatter();
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [list, setList] = useState<{ guilds: StaffGuildRow[]; totalPages: number } | null>(null);
  const [selected, setSelected] = useState<StaffGuildDetail | null>(null);
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [confirm, setConfirm] = useState("");
  const [reload, setReload] = useState(0);

  useEffect(() => {
    if (selected) return;
    const id = setTimeout(async () => {
      const params = new URLSearchParams({ page: String(page) });
      if (q.trim()) params.set("q", q.trim());
      const res = await apiFetch<{ guilds: StaffGuildRow[]; totalPages: number }>(
        apiUrl,
        `/staff/guilds?${params}`,
      );
      if (res.ok) setList(res.data);
    }, 250);
    return () => clearTimeout(id);
  }, [apiUrl, q, page, selected, reload]);

  const open = async (id: string) => {
    const res = await apiFetch<StaffGuildDetail>(apiUrl, `/staff/guilds/${id}`);
    if (res.ok) {
      setSelected(res.data);
      setName(res.data.name);
      setDescription(res.data.description ?? "");
      setNotice(null);
      setConfirm("");
    }
  };

  const run = async (body: object, done: string) => {
    if (!selected) return;
    const res = await apiCall<StaffGuildDetail | { deleted: true }>(
      apiUrl,
      `/staff/guilds/${selected.id}`,
      "POST",
      body,
    );
    if (!res.ok) return setNotice({ ok: false, text: res.message });
    if ("deleted" in res.data) {
      setSelected(null);
      setReload((n) => n + 1);
      return;
    }
    setSelected(res.data);
    setNotice({ ok: true, text: done });
  };

  if (selected)
    return (
      <div className="mt-6 flex flex-col gap-5">
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            className={buttonClass}
            onClick={() => {
              setSelected(null);
              setReload((n) => n + 1);
            }}
          >
            <ArrowLeft className="size-4" /> {t("back")}
          </button>
          {notice && (
            <span className={`text-sm font-semibold ${notice.ok ? "text-success" : "text-danger"}`}>
              {notice.text}
            </span>
          )}
        </div>
        <section className={panel}>
          <h2 className="font-display text-3xl font-medium">{selected.name}</h2>
          <p className="mt-1 text-sm text-pale-mist">
            {selected.description ?? t("noDescription")}
          </p>
          <p className="mt-1 text-xs text-fog">
            {t("createdOn", {
              date: format.dateTime(new Date(selected.createdAt), "medium"),
              count: selected.openWishes,
            })}
          </p>
          <form
            className="mt-4 grid gap-2 sm:grid-cols-[1fr_1.5fr_auto]"
            onSubmit={(e) => {
              e.preventDefault();
              void run({ action: "edit", name, description }, t("edited"));
            }}
          >
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={field}
              aria-label={t("nameLabel")}
            />
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t("descriptionPlaceholder")}
              className={field}
              aria-label={t("descriptionLabel")}
            />
            <button type="submit" className={buttonClass}>
              {tc("save")}
            </button>
          </form>
        </section>
        <section className={panel}>
          <h3 className={heading}>{t("members", { count: selected.members })}</h3>
          <ul className="mt-3 flex flex-col gap-2">
            {selected.memberList.map((m) => (
              <li
                key={m.id}
                className="flex items-center gap-3 rounded-xl border border-line px-3.5 py-2 text-sm"
              >
                <button
                  type="button"
                  className="font-semibold text-accent hover:underline"
                  onClick={() => onOpen(m.id)}
                >
                  {m.username}
                </button>
                {m.role === "OWNER" && <Badge className="bg-accent/15 text-accent">{t("owner")}</Badge>}
                <span className="ml-auto text-xs text-fog">
                  {t("since", { date: format.dateTime(new Date(m.joinedAt), "medium") })}
                </span>
                <button
                  type="button"
                  className={buttonClass}
                  onClick={() =>
                    void run({ action: "kick", userId: m.id }, t("kicked", { name: m.username }))
                  }
                >
                  {t("kick")}
                </button>
              </li>
            ))}
          </ul>
        </section>
        {role === "ADMIN" && (
          <section className={panel}>
            <h3 className={heading}>{t("dissolveTitle")}</h3>
            <p className="mt-2 text-sm text-pale-mist">
              {t("dissolveText")}
            </p>
            <form
              className="mt-3 flex flex-wrap gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                void run({ action: "dissolve", confirmName: confirm }, t("dissolved"));
              }}
            >
              <input
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder={selected.name}
                className={`${field} min-w-40 flex-1`}
              />
              <button
                type="submit"
                className={dangerButtonClass}
                disabled={confirm !== selected.name}
              >
                {t("dissolve")}
              </button>
            </form>
          </section>
        )}
      </div>
    );

  return (
    <div className="mt-6">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-fog" />
        <input
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setPage(1);
          }}
          placeholder={t("search")}
          className={`${field} w-full pl-9`}
        />
      </div>
      <ul className="mt-4 flex flex-col gap-2">
        {list?.guilds.map((g) => (
          <li key={g.id}>
            <button
              type="button"
              onClick={() => void open(g.id)}
              className="flex w-full items-center gap-3 rounded-xl border border-line bg-surface px-4 py-3 text-left hover:border-accent"
            >
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold">{g.name}</div>
                <div className="truncate text-xs text-fog">
                  {g.description ?? t("noDescriptionList")}
                </div>
              </div>
              <span className="shrink-0 text-xs text-fog">
                {t("summary", { count: g.members })}
                {g.owner && t("ownerName", { name: g.owner })}
              </span>
            </button>
          </li>
        ))}
        {list && !list.guilds.length && (
          <li className="prose-serif py-6 text-center text-pale-mist">{t("none")}</li>
        )}
      </ul>
      {list && <Pager page={page} totalPages={list.totalPages} onPage={setPage} />}
    </div>
  );
}

function Deleted({ apiUrl }: { apiUrl: string }) {
  const t = useTranslations("staff.deleted");
  const tp = useTranslations("staff.pager");
  const tc = useTranslations("common");
  const format = useFormatter();
  const [page, setPage] = useState(1);
  const [data, setData] = useState<{
    accounts: DeletedAccountRow[];
    total: number;
    totalPages: number;
  } | null>(null);
  useEffect(() => {
    void apiFetch<{ accounts: DeletedAccountRow[]; total: number; totalPages: number }>(
      apiUrl,
      `/staff/deleted?page=${page}`,
    ).then((r) => r.ok && setData(r.data));
  }, [apiUrl, page]);
  if (!data) return <p className="mt-6 text-sm text-fog">{tc("loading")}</p>;
  if (data.accounts.length === 0)
    return <p className="mt-6 text-sm text-fog">{t("none")}</p>;
  return (
    <div className="mt-6">
      <p className="text-sm text-fog">{t("count", { count: data.total })}</p>
      <ul className="mt-3 divide-y divide-line rounded-xl border border-line bg-surface">
        {data.accounts.map((a) => (
          <li key={a.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 text-sm">
            <strong className="min-w-32 flex-1 truncate">{a.username}</strong>
            <span className="text-fog">
              {a.by ? t("by", { name: a.by }) : t("byPlayer")}
              {a.reason && t("reason", { reason: a.reason })}
            </span>
            {a.discordId && (
              <span className="font-mono text-xs text-fog">{t("discord", { id: a.discordId })}</span>
            )}
            <time className="text-xs text-fog" dateTime={a.at}>
              {format.dateTime(new Date(a.at), "mediumTime")}
            </time>
          </li>
        ))}
      </ul>
      {data.totalPages > 1 && (
        <div className="mt-4 flex items-center justify-center gap-3 text-sm">
          <button
            type="button"
            className={buttonClass}
            disabled={page <= 1}
            onClick={() => setPage(page - 1)}
          >
            {tp("newer")}
          </button>
          <span className="text-fog">{tp("page", { page, total: data.totalPages })}</span>
          <button
            type="button"
            className={buttonClass}
            disabled={page >= data.totalPages}
            onClick={() => setPage(page + 1)}
          >
            {tp("older")}
          </button>
        </div>
      )}
    </div>
  );
}

function Audit({ apiUrl, onOpen }: { apiUrl: string; onOpen: (id: string) => void }) {
  const tp = useTranslations("staff.pager");
  const tc = useTranslations("common");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<{ actions: StaffAuditRow[]; totalPages: number } | null>(null);
  useEffect(() => {
    void apiFetch<{ actions: StaffAuditRow[]; totalPages: number }>(
      apiUrl,
      `/staff/audit?page=${page}`,
    ).then((r) => r.ok && setData(r.data));
  }, [apiUrl, page]);
  if (!data) return <p className="mt-6 text-sm text-fog">{tc("loading")}</p>;
  return (
    <div className="mt-6">
      <AuditList rows={data.actions} onOpen={onOpen} />
      {data.totalPages > 1 && (
        <div className="mt-4 flex items-center justify-center gap-3 text-sm">
          <button
            type="button"
            className={buttonClass}
            disabled={page <= 1}
            onClick={() => setPage(page - 1)}
          >
            {tp("newer")}
          </button>
          <span className="text-fog">{tp("page", { page, total: data.totalPages })}</span>
          <button
            type="button"
            className={buttonClass}
            disabled={page >= data.totalPages}
            onClick={() => setPage(page + 1)}
          >
            {tp("older")}
          </button>
        </div>
      )}
    </div>
  );
}

function ApiKeys({ apiUrl }: { apiUrl: string }) {
  const t = useTranslations("staff.apiKeys");
  const tc = useTranslations("common");
  const format = useFormatter();
  const { confirm, dialog: confirmDialog } = useConfirm();
  const [keys, setKeys] = useState<StaffApiKeyRow[] | null>(null);
  const [name, setName] = useState("");
  const [fresh, setFresh] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await apiFetch<{ keys: StaffApiKeyRow[] }>(apiUrl, "/staff/api-keys");
    if (res.ok) setKeys(res.data.keys);
    else setError(res.message);
  }, [apiUrl]);
  useEffect(() => {
    void apiFetch<{ keys: StaffApiKeyRow[] }>(apiUrl, "/staff/api-keys").then(
      (r) => r.ok && setKeys(r.data.keys),
    );
  }, [apiUrl]);

  const create = async () => {
    setBusy(true);
    setError(null);
    const res = await apiCall<StaffApiKeyCreated>(apiUrl, "/staff/api-keys", "POST", { name });
    setBusy(false);
    if (!res.ok) return setError(res.message);
    setName("");
    setCopied(false);
    setFresh(res.data.key);
    void load();
  };

  const revoke = async (k: StaffApiKeyRow) => {
    const ok = await confirm({
      title: t("revokeTitle", { name: k.name }),
      message: t("revokeMessage"),
      confirmLabel: t("revokeConfirm"),
      danger: true,
    });
    if (!ok) return;
    const res = await apiCall(apiUrl, `/staff/api-keys/${k.id}`, "DELETE");
    if (!res.ok) return setError(res.message);
    void load();
  };

  const copy = async () => {
    if (!fresh) return;
    try {
      await navigator.clipboard.writeText(fresh);
      setCopied(true);
    } catch {
      /* le champ reste sélectionnable à la main */
    }
  };

  return (
    <div className="mt-6">
      <p className="prose-serif text-sm text-pale-mist">{t("intro")}</p>

      <form
        className="mt-4 flex flex-wrap items-end gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          void create();
        }}
      >
        <label className="flex min-w-40 flex-1 flex-col gap-1 text-xs text-fog">
          {t("nameLabel")}
          <input
            className={field}
            value={name}
            maxLength={40}
            placeholder={t("namePlaceholder")}
            onChange={(e) => setName(e.target.value)}
          />
        </label>
        <button type="submit" className={primaryButtonClass} disabled={busy || !name.trim()}>
          {t("create")}
        </button>
      </form>
      {error && <p className="mt-3 text-sm text-danger">{error}</p>}

      {fresh && (
        <div className={`${panel} mt-4 border-accent`} role="status">
          <p className="text-sm font-semibold">{t("created")}</p>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <input
              readOnly
              className={`${field} min-w-40 flex-1 font-mono text-xs`}
              value={fresh}
              onFocus={(e) => e.currentTarget.select()}
            />
            <button type="button" className={buttonClass} onClick={() => void copy()}>
              {copied ? t("copied") : t("copy")}
            </button>
          </div>
        </div>
      )}

      {!keys ? (
        <p className="mt-6 text-sm text-fog">{tc("loading")}</p>
      ) : keys.length === 0 ? (
        <p className="mt-6 text-sm text-fog">{t("none")}</p>
      ) : (
        <ul className="mt-6 divide-y divide-line rounded-xl border border-line bg-surface">
          {keys.map((k) => (
            <li key={k.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 text-sm">
              <strong className="min-w-32 flex-1 truncate">{k.name}</strong>
              <span className="font-mono text-xs text-fog">{k.prefix}…</span>
              <span className="text-xs text-fog">{t("owner", { name: k.ownerName })}</span>
              <span className="text-xs text-fog">
                {t("createdAt", { date: format.dateTime(new Date(k.createdAt), "mediumTime") })}
              </span>
              <span className="text-xs text-fog">
                {k.lastUsedAt
                  ? t("usedAt", { date: format.dateTime(new Date(k.lastUsedAt), "mediumTime") })
                  : t("neverUsed")}
              </span>
              <button type="button" className={dangerButtonClass} onClick={() => void revoke(k)}>
                {t("revoke")}
              </button>
            </li>
          ))}
        </ul>
      )}
      {confirmDialog}
    </div>
  );
}

export function StaffView({
  apiUrl,
  role,
  meId,
}: {
  apiUrl: string;
  role: StaffRole;
  meId: string;
}) {
  const t = useTranslations("staff");
  const [tab, setTab] = useState<Tab>("overview");
  const [memberId, setMemberId] = useState<string | null>(null);

  const open = (id: string) => {
    setMemberId(id);
    setTab("members");
  };
  const tabs: Tab[] = [
    "overview",
    "members",
    "alerts",
    "reports",
    "bugs",
    "auctions",
    "guilds",
    "deleted",
    "audit",
    ...(role === "ADMIN" ? (["shop", "apiKeys"] as const) : []),
  ];

  return (
    <div className="mt-6">
      <div className="flex flex-wrap items-center justify-center gap-3">
        <div
          className="flex flex-wrap justify-center gap-1 rounded-2xl border border-line p-1"
          role="tablist"
        >
          {tabs.map((value) => (
            <button
              key={value}
              type="button"
              role="tab"
              aria-selected={tab === value}
              onClick={() => {
                setTab(value);
                if (value !== "members") setMemberId(null);
              }}
              className={`rounded-full px-5 py-1.5 text-sm font-semibold transition-colors ${
                tab === value ? "bg-accent text-accent-foreground" : "hover:bg-foreground/10"
              }`}
            >
              {t(`tabs.${value}`)}
            </button>
          ))}
        </div>
        <Badge className="bg-accent/15 text-accent">{t(`roles.${role}`)}</Badge>
      </div>

      {tab === "overview" && <Overview apiUrl={apiUrl} />}
      {tab === "members" &&
        (memberId ? (
          <Member
            key={memberId}
            apiUrl={apiUrl}
            id={memberId}
            role={role}
            meId={meId}
            onBack={() => setMemberId(null)}
            onOpen={open}
          />
        ) : (
          <Members apiUrl={apiUrl} openId={memberId} onOpen={setMemberId} />
        ))}
      {tab === "alerts" && <Alerts apiUrl={apiUrl} onOpen={open} />}
      {tab === "reports" && <Reports apiUrl={apiUrl} onOpen={open} />}
      {tab === "bugs" && <Bugs apiUrl={apiUrl} onOpen={open} />}
      {tab === "auctions" && <Auctions apiUrl={apiUrl} onOpen={open} />}
      {tab === "guilds" && <Guilds apiUrl={apiUrl} role={role} onOpen={open} />}
      {tab === "deleted" && <Deleted apiUrl={apiUrl} />}
      {tab === "audit" && <Audit apiUrl={apiUrl} onOpen={open} />}
      {tab === "apiKeys" && <ApiKeys apiUrl={apiUrl} />}
      {tab === "shop" && <ShopAdmin apiUrl={apiUrl} />}
    </div>
  );
}
