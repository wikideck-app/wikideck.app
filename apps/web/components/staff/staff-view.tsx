"use client";

import { ArrowLeft, Ban, Check, Search, ShieldCheck } from "@/components/icons";
import { useCallback, useEffect, useState } from "react";
import type {
  AuctionStatus,
  DeletedAccountRow,
  StaffAlert,
  StaffAuctionRow,
  StaffAuditRow,
  StaffGuildDetail,
  StaffGuildRow,
  StaffMemberDetail,
  StaffMemberRow,
  StaffOverview,
  StaffReportRow,
  StaffRole,
  StaffUserAction,
  TrustLevel,
} from "@wikideck/shared";
import { useConfirm } from "@/components/confirm-dialog";
import { buttonClass, dangerButtonClass, primaryButtonClass } from "@/components/settings/controls";
import { Wikibits } from "@/components/wikibit";
import { apiCall, apiFetch } from "@/lib/tags-api";

type Tab =
  "overview" | "members" | "alerts" | "reports" | "auctions" | "guilds" | "deleted" | "audit";

const panel = "rounded-xl border border-line bg-surface p-5";
const heading = "text-xs font-bold uppercase tracking-[0.2em] text-fog";
const field =
  "rounded-lg border border-line bg-transparent px-3 py-2 text-sm outline-none focus:border-accent";
const dateFmt = new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short" });
const dayFmt = new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium" });
const num = new Intl.NumberFormat("fr-FR");

const ROLE_LABEL: Record<StaffRole, string> = { MODERATOR: "Modérateur", ADMIN: "Administrateur" };
const TRUST_LABEL: Record<TrustLevel, string> = {
  TRUSTED: "Fiable",
  SUSPECT: "Suspect",
  RESTRICTED: "Restreint",
};
const TRUST_STYLE: Record<TrustLevel, string> = {
  TRUSTED: "bg-success/15 text-success",
  SUSPECT: "bg-warning/15 text-warning",
  RESTRICTED: "bg-danger/15 text-danger",
};
const SIGNAL_LABEL: Record<string, string> = {
  SHARED_DEVICE: "Navigateur partagé",
  YOUNG_DISCORD: "Compte Discord récent",
  FUNNEL: "Transfert de valeur",
  BATTLE_PAIR: "Manches répétées",
};
const ACTION_LABEL: Record<string, string> = {
  ban: "Suspension",
  unban: "Réactivation",
  delete_user: "Compte supprimé",
  self_delete: "Compte supprimé par le joueur",
  rename: "Changement de pseudo",
  wikibits: "Wikibits",
  packs: "Paquets offerts",
  set_role: "Rôle",
  set_trust: "Niveau de confiance",
  clear_signals: "Indices effacés",
  cancel_auction: "Enchère annulée",
  guild_edit: "Guilde modifiée",
  guild_kick: "Membre exclu d'une guilde",
  guild_dissolve: "Guilde dissoute",
  report_dismiss: "Signalement classé",
  report_delete: "Message supprimé",
};
const AUCTION_STATUS: Record<AuctionStatus, string> = {
  ACTIVE: "En cours",
  SOLD: "Vendue",
  UNSOLD: "Invendue",
  CANCELLED: "Annulée",
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

function describe(row: StaffAuditRow) {
  const d = (row.detail ?? {}) as Record<string, unknown>;
  switch (row.action) {
    case "ban":
    case "delete_user":
      return `motif : ${d.reason}`;
    case "rename":
      return `${d.from} → ${d.to}`;
    case "wikibits":
      return `${Number(d.amount) > 0 ? "+" : ""}${d.amount} (${d.reason})`;
    case "packs":
      return `+${d.count}`;
    case "set_role":
      return `${d.from ?? "aucun"} → ${d.to ?? "aucun"}`;
    case "set_trust":
      return String(d.override ?? "automatique");
    case "clear_signals":
      return `${d.count} indice(s)`;
    case "cancel_auction": {
      const refund = d.refunded as { to: string; amount: number } | null;
      return `${d.card} · ${d.reason}${refund ? ` · ${refund.amount} wikibits remboursés à ${refund.to}` : ""}`;
    }
    case "guild_edit": {
      const name = d.name as { from: string; to: string } | undefined;
      return name ? `${name.from} → ${name.to}` : String(d.guild);
    }
    case "guild_kick":
      return String(d.guild);
    case "guild_dissolve":
      return `${d.guild} (${d.members} membre(s))`;
    default:
      return "";
  }
}

function AuditList({ rows, onOpen }: { rows: StaffAuditRow[]; onOpen?: (id: string) => void }) {
  if (!rows.length)
    return <p className="prose-serif text-pale-mist">Aucune action pour le moment.</p>;
  return (
    <ul className="flex flex-col gap-2">
      {rows.map((a) => (
        <li key={a.id} className="rounded-xl border border-line px-3.5 py-2.5 text-sm">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
            <strong>{ACTION_LABEL[a.action] ?? a.action}</strong>
            <span className="text-fog">par {a.actorName}</span>
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
              {dateFmt.format(new Date(a.createdAt))}
            </span>
          </div>
          {describe(a) && <div className="mt-0.5 text-xs text-pale-mist">{describe(a)}</div>}
        </li>
      ))}
    </ul>
  );
}

function Overview({ apiUrl }: { apiUrl: string }) {
  const [data, setData] = useState<StaffOverview | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    void apiFetch<StaffOverview>(apiUrl, "/staff/overview").then((r) =>
      r.ok ? setData(r.data) : setError(r.message),
    );
  }, [apiUrl]);
  if (error) return <p className="mt-6 text-sm text-danger">{error}</p>;
  if (!data) return <p className="mt-6 text-sm text-fog">Chargement…</p>;
  const tiles: [string | number, string][] = [
    [num.format(data.users), "membres"],
    [num.format(data.newUsers7d), "nouveaux (7 j)"],
    [num.format(data.packsOpened24h), "paquets ouverts (24 h)"],
    [num.format(data.battleGames24h), "parties de Bataille (24 h)"],
    [num.format(data.auctionsActive), "enchères en cours"],
    [num.format(data.tradesPending), "échanges en attente"],
    [num.format(data.flagged), "comptes signalés"],
    [num.format(data.banned), "comptes suspendus"],
    [num.format(data.staff), "membres du staff"],
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
          <div className="text-[11px] uppercase tracking-[0.12em] text-fog">en circulation</div>
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
            placeholder="Pseudo ou identifiant Discord"
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
          <option value="">Tous les membres</option>
          <option value="banned">Suspendus</option>
          <option value="staff">Équipe</option>
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
                    <Badge className="bg-accent/15 text-accent">{ROLE_LABEL[u.staff]}</Badge>
                  )}
                  {u.banned && <Badge className="bg-danger/15 text-danger">Suspendu</Badge>}
                  <Badge className={TRUST_STYLE[u.trust]}>{TRUST_LABEL[u.trust]}</Badge>
                </div>
                <div className="text-xs text-fog">
                  Inscrit le {dayFmt.format(new Date(u.createdAt))} · {u.cards} carte
                  {u.cards > 1 ? "s" : ""}
                </div>
              </div>
              <Wikibits amount={u.wikibits} className="shrink-0 text-sm text-fog" />
            </button>
          </li>
        ))}
        {result && !result.users.length && (
          <li className="prose-serif py-6 text-center text-pale-mist">Aucun membre trouvé.</li>
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
            Précédent
          </button>
          <span className="text-fog">
            Page {page} / {result.totalPages} · {num.format(result.total)} membres
          </span>
          <button
            type="button"
            className={buttonClass}
            disabled={page >= result.totalPages}
            onClick={() => setPage(page + 1)}
          >
            Suivant
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
      title: `Supprimer définitivement ${m.username} ?`,
      message:
        "Le compte, ses cartes, ses messages et ses amis sont effacés. Cette action est irréversible.",
      confirmLabel: "Supprimer le compte",
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
          <ArrowLeft className="size-4" /> Retour
        </button>
        <p className="mt-4 text-sm text-fog">{notice?.text ?? "Chargement…"}</p>
      </div>
    );

  const isAdmin = role === "ADMIN";
  const isSelf = m.id === meId;
  const outranks = !isSelf && (m.staff === null || (role === "ADMIN" && m.staff === "MODERATOR"));

  return (
    <div className="mt-6 flex flex-col gap-5">
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" className={buttonClass} onClick={onBack}>
          <ArrowLeft className="size-4" /> Retour
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
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-display text-3xl font-medium">{m.username}</h2>
            {m.staff && <Badge className="bg-accent/15 text-accent">{ROLE_LABEL[m.staff]}</Badge>}
            {m.banned && <Badge className="bg-danger/15 text-danger">Suspendu</Badge>}
            <Badge className={TRUST_STYLE[m.trust]}>{TRUST_LABEL[m.trust]}</Badge>
          </div>
          <div className="mt-1 text-xs text-fog">
            Discord {m.discordId}
            {m.discordCreatedAt &&
              ` · compte créé le ${dayFmt.format(new Date(m.discordCreatedAt))}`}
            {` · inscrit le ${dayFmt.format(new Date(m.createdAt))}`}
          </div>
          {m.banned && (
            <div className="mt-1 text-sm text-danger">
              Suspendu{m.bannedAt ? ` le ${dateFmt.format(new Date(m.bannedAt))}` : ""} :{" "}
              {m.banReason}
            </div>
          )}
        </div>
      </section>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <div className="rounded-xl border border-line px-4 py-3 text-center">
          <div className="font-display text-2xl font-medium">
            <Wikibits amount={m.wikibits} />
          </div>
          <div className="text-[11px] uppercase tracking-[0.12em] text-fog">solde</div>
        </div>
        <Stat value={m.packs} label="paquets" />
        <Stat value={m.cards} label="cartes" />
        <Stat value={num.format(m.pulls)} label="tirages" />
        <Stat value={m.battle.played} label="parties" />
        <Stat value={m.battle.wins} label="victoires" />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <section className={panel}>
          <h3 className={heading}>Confiance</h3>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <Stat value={m.trustScore} label="confiance /100" />
            <Stat value={m.riskScore} label="risque /100" />
          </div>
          {m.trustOverride && (
            <p className="mt-3 text-xs text-fog">
              Niveau imposé par le staff : <strong>{TRUST_LABEL[m.trustOverride]}</strong>
            </p>
          )}
          <h4 className="mt-4 text-xs font-bold uppercase tracking-[0.14em] text-fog">
            Indices (30 j)
          </h4>
          {m.signals.length ? (
            <ul className="mt-2 flex flex-col gap-1.5 text-sm">
              {m.signals.map((s, i) => (
                <li key={i} className="flex items-center justify-between gap-3">
                  <span>{SIGNAL_LABEL[s.type] ?? s.type}</span>
                  <span className="text-xs text-fog">
                    +{s.weight} · {dateFmt.format(new Date(s.at))}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-fog">Aucun indice.</p>
          )}
          {m.linkedAccounts.length > 0 && (
            <>
              <h4 className="mt-4 text-xs font-bold uppercase tracking-[0.14em] text-fog">
                Comptes sur le même navigateur
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
                    "Niveau de confiance mis à jour.",
                  )
                }
                className={field}
                aria-label="Niveau imposé"
              >
                <option value="">Niveau automatique</option>
                <option value="TRUSTED">Imposer « Fiable »</option>
                <option value="RESTRICTED">Imposer « Restreint »</option>
              </select>
              <button
                type="button"
                className={buttonClass}
                disabled={busy || !m.signals.length}
                onClick={() => void run({ action: "clearSignals" }, "Indices effacés.")}
              >
                Effacer les indices
              </button>
            </div>
          )}
        </section>

        <section className={panel}>
          <h3 className={heading}>Modération</h3>
          <div className="mt-3 flex flex-col gap-4">
            <form
              className="flex gap-2"
              onSubmit={async (e) => {
                e.preventDefault();
                if (await run({ action: "rename", username }, "Pseudo modifié.")) setUsername("");
              }}
            >
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Nouveau pseudo"
                className={`${field} min-w-0 flex-1`}
                disabled={!outranks && !isSelf}
              />
              <button
                type="submit"
                className={buttonClass}
                disabled={busy || !username.trim() || (!outranks && !isSelf)}
              >
                Renommer
              </button>
            </form>

            {m.banned ? (
              <button
                type="button"
                className={primaryButtonClass}
                disabled={busy}
                onClick={() => void run({ action: "unban" }, "Compte réactivé.")}
              >
                <Check className="size-4" /> Réactiver le compte
              </button>
            ) : (
              <form
                className="flex flex-col gap-2"
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (await run({ action: "ban", reason }, "Compte suspendu.")) setReason("");
                }}
              >
                <input
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Motif de la suspension (obligatoire)"
                  className={field}
                  disabled={!outranks}
                />
                <button
                  type="submit"
                  className={dangerButtonClass}
                  disabled={busy || reason.trim().length < 3 || !outranks}
                >
                  <Ban className="size-4" /> Suspendre le compte
                </button>
              </form>
            )}
            {!outranks && !isSelf && (
              <p className="text-xs text-fog">
                Ce compte a un rang égal ou supérieur au vôtre : seules ses informations sont
                consultables.
              </p>
            )}
          </div>

          {isAdmin && (
            <>
              <h3 className={`${heading} mt-6`}>Économie et rôles</h3>
              <div className="mt-3 flex flex-col gap-4">
                <form
                  className="flex flex-wrap gap-2"
                  onSubmit={async (e) => {
                    e.preventDefault();
                    const ok = await run(
                      { action: "wikibits", amount: Number(amount), reason: bitsReason },
                      "Solde modifié.",
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
                    placeholder="± wikibits"
                    className={`${field} w-28`}
                  />
                  <input
                    value={bitsReason}
                    onChange={(e) => setBitsReason(e.target.value)}
                    placeholder="Motif (obligatoire)"
                    className={`${field} min-w-0 flex-1`}
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
                    Appliquer
                  </button>
                </form>
                <form
                  className="flex gap-2"
                  onSubmit={async (e) => {
                    e.preventDefault();
                    await run({ action: "packs", count: Number(packs) }, "Paquets offerts.");
                  }}
                >
                  <input
                    value={packs}
                    onChange={(e) => setPacks(e.target.value)}
                    inputMode="numeric"
                    className={`${field} w-20`}
                    aria-label="Nombre de paquets"
                  />
                  <button
                    type="submit"
                    className={buttonClass}
                    disabled={busy || !Number.isInteger(Number(packs)) || Number(packs) < 1}
                  >
                    Offrir des paquets
                  </button>
                </form>
                {!isSelf && (
                  <label className="flex items-center gap-3 text-sm">
                    <ShieldCheck className="size-4 text-accent" />
                    <span className="text-fog">Rôle</span>
                    <select
                      value={m.staff ?? ""}
                      disabled={busy}
                      onChange={(e) =>
                        void run(
                          { action: "setRole", role: (e.target.value || null) as StaffRole | null },
                          "Rôle mis à jour.",
                        )
                      }
                      className={field}
                    >
                      <option value="">Joueur</option>
                      <option value="MODERATOR">Modérateur</option>
                      <option value="ADMIN">Administrateur</option>
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
          <h3 className={`${heading} text-danger`}>Zone dangereuse</h3>
          <p className="mt-2 text-sm text-pale-mist">
            Supprime définitivement le compte et ses données, sans retour possible. Si le joueur a
            des enchères en cours, annulez-les d&apos;abord. Pour une simple sanction, préférez la
            suspension.
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
              placeholder="Motif (obligatoire)"
              className={field}
            />
            <input
              value={delConfirm}
              onChange={(e) => setDelConfirm(e.target.value)}
              placeholder={`Tapez « ${m.username} » pour confirmer`}
              className={field}
            />
            <button
              type="submit"
              className={dangerButtonClass}
              disabled={busy || delReason.trim().length < 3 || delConfirm !== m.username}
            >
              Supprimer le compte
            </button>
          </form>
        </section>
      )}
      {confirmDialog}

      <section className={panel}>
        <h3 className={heading}>Actions du staff sur ce compte</h3>
        <div className="mt-3">
          <AuditList rows={m.actions} />
        </div>
      </section>
    </div>
  );
}

function Alerts({ apiUrl, onOpen }: { apiUrl: string; onOpen: (id: string) => void }) {
  const [alerts, setAlerts] = useState<StaffAlert[] | null>(null);
  useEffect(() => {
    void apiFetch<{ alerts: StaffAlert[] }>(apiUrl, "/staff/alerts").then(
      (r) => r.ok && setAlerts(r.data.alerts),
    );
  }, [apiUrl]);
  if (!alerts) return <p className="mt-6 text-sm text-fog">Chargement…</p>;
  return (
    <div className="mt-6">
      <p className="prose-serif text-pale-mist">
        Comptes dont les indices d&apos;abus des 30 derniers jours totalisent au moins 30. Un indice
        seul ne restreint jamais un compte : vérifiez avant d&apos;agir.
      </p>
      <ul className="mt-4 flex flex-col gap-2">
        {alerts.map((a) => (
          <li key={a.id}>
            <button
              type="button"
              onClick={() => onOpen(a.id)}
              className="flex w-full items-center gap-3 rounded-xl border border-line bg-surface px-4 py-3 text-left hover:border-accent"
            >
              <Avatar url={a.avatarUrl} name={a.username} />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-semibold">{a.username}</span>
                  <Badge className={TRUST_STYLE[a.level]}>{TRUST_LABEL[a.level]}</Badge>
                </div>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {a.signals.map((s) => (
                    <span
                      key={s}
                      className="rounded-full bg-foreground/10 px-2 py-0.5 text-[11px] text-fog"
                    >
                      {SIGNAL_LABEL[s] ?? s}
                    </span>
                  ))}
                </div>
              </div>
              <span className="shrink-0 font-display text-2xl tabular-nums text-danger">
                {a.riskScore}
              </span>
            </button>
          </li>
        ))}
        {!alerts.length && (
          <li className="prose-serif py-6 text-center text-pale-mist">Aucune alerte. 🎉</li>
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
  if (totalPages <= 1) return null;
  return (
    <div className="mt-4 flex items-center justify-center gap-3 text-sm">
      <button
        type="button"
        className={buttonClass}
        disabled={page <= 1}
        onClick={() => onPage(page - 1)}
      >
        Précédent
      </button>
      <span className="text-fog">
        Page {page} / {totalPages}
      </span>
      <button
        type="button"
        className={buttonClass}
        disabled={page >= totalPages}
        onClick={() => onPage(page + 1)}
      >
        Suivant
      </button>
    </div>
  );
}

function Reports({ apiUrl, onOpen }: { apiUrl: string; onOpen: (id: string) => void }) {
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

  if (!data) return <p className="mt-6 text-sm text-fog">{error ?? "Chargement…"}</p>;
  return (
    <div className="mt-6">
      <p className="prose-serif text-pale-mist">
        Messages signalés par leur destinataire. Seuls le message et les cinq qui le précèdent sont
        visibles : le staff ne peut pas lire les autres conversations.
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
        Afficher aussi les signalements traités
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
              <span className="text-fog">signalé par {r.reporter.username}</span>
              <span className="ml-auto text-xs text-fog">
                {dateFmt.format(new Date(r.createdAt))}
              </span>
              {r.status !== "OPEN" && (
                <Badge className="bg-foreground/10 text-fog">
                  {r.status === "DELETED" ? "Message supprimé" : "Classé sans suite"}
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
                  Supprimer le message
                </button>
                <button
                  type="button"
                  className={buttonClass}
                  onClick={() => void handle(r.id, "dismiss")}
                >
                  Classer sans suite
                </button>
                <button type="button" className={buttonClass} onClick={() => onOpen(r.sender.id)}>
                  Voir l&apos;auteur
                </button>
              </div>
            )}
          </li>
        ))}
        {!data.reports.length && (
          <li className="prose-serif py-6 text-center text-pale-mist">Aucun signalement.</li>
        )}
      </ul>
      <Pager page={page} totalPages={data.totalPages} onPage={setPage} />
    </div>
  );
}

function Auctions({ apiUrl, onOpen }: { apiUrl: string; onOpen: (id: string) => void }) {
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
            placeholder="Carte ou vendeur"
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
          Inclure les enchères terminées
        </label>
      </div>
      {error && <p className="mt-3 text-sm text-danger">{error}</p>}
      <ul className="mt-4 flex flex-col gap-2">
        {data?.auctions.map((a) => (
          <li key={a.id} className="rounded-xl border border-line bg-surface px-4 py-3">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <strong className="text-sm">{a.card.title}</strong>
              <Badge className="bg-foreground/10 text-fog">{AUCTION_STATUS[a.status]}</Badge>
              <span className="text-sm text-fog">
                vendeur{" "}
                <button
                  type="button"
                  className="text-accent hover:underline"
                  onClick={() => onOpen(a.seller.id)}
                >
                  {a.seller.username}
                </button>
              </span>
              <span className="ml-auto text-sm tabular-nums">
                <Wikibits amount={a.currentBid ?? a.startPrice} /> · {a.bidCount} mise
                {a.bidCount > 1 ? "s" : ""}
              </span>
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-x-3 text-xs text-fog">
              <span>Fin le {dateFmt.format(new Date(a.endsAt))}</span>
              {a.leader && (
                <span>
                  meneur{" "}
                  <button
                    type="button"
                    className="text-accent hover:underline"
                    onClick={() => onOpen(a.leader!.id)}
                  >
                    {a.leader.username}
                  </button>
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
                    placeholder="Motif (obligatoire)"
                    className={`${field} min-w-0 flex-1`}
                  />
                  <button
                    type="submit"
                    className={dangerButtonClass}
                    disabled={reason.trim().length < 3}
                  >
                    Confirmer l&apos;annulation
                  </button>
                  <button type="button" className={buttonClass} onClick={() => setCancelling(null)}>
                    Retour
                  </button>
                </form>
              ) : (
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <button type="button" className={buttonClass} onClick={() => setCancelling(a.id)}>
                    Annuler la vente
                  </button>
                  <span className="text-xs text-fog">
                    La carte retourne au vendeur
                    {a.leader
                      ? ` et ${a.currentBid} wikibits sont rendus à ${a.leader.username}`
                      : ""}
                    .
                  </span>
                </div>
              ))}
          </li>
        ))}
        {data && !data.auctions.length && (
          <li className="prose-serif py-6 text-center text-pale-mist">Aucune enchère.</li>
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
            <ArrowLeft className="size-4" /> Retour
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
            {selected.description ?? "Pas de description."}
          </p>
          <p className="mt-1 text-xs text-fog">
            Créée le {dayFmt.format(new Date(selected.createdAt))} · {selected.openWishes} souhait
            {selected.openWishes > 1 ? "s" : ""} ouvert{selected.openWishes > 1 ? "s" : ""}
          </p>
          <form
            className="mt-4 grid gap-2 sm:grid-cols-[1fr_1.5fr_auto]"
            onSubmit={(e) => {
              e.preventDefault();
              void run({ action: "edit", name, description }, "Guilde modifiée.");
            }}
          >
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={field}
              aria-label="Nom"
            />
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Description (vide pour l'effacer)"
              className={field}
              aria-label="Description"
            />
            <button type="submit" className={buttonClass}>
              Enregistrer
            </button>
          </form>
        </section>
        <section className={panel}>
          <h3 className={heading}>Membres ({selected.members})</h3>
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
                {m.role === "OWNER" && <Badge className="bg-accent/15 text-accent">Chef</Badge>}
                <span className="ml-auto text-xs text-fog">
                  depuis le {dayFmt.format(new Date(m.joinedAt))}
                </span>
                <button
                  type="button"
                  className={buttonClass}
                  onClick={() =>
                    void run({ action: "kick", userId: m.id }, `${m.username} a été exclu.`)
                  }
                >
                  Exclure
                </button>
              </li>
            ))}
          </ul>
        </section>
        {role === "ADMIN" && (
          <section className={panel}>
            <h3 className={heading}>Dissoudre la guilde</h3>
            <p className="mt-2 text-sm text-pale-mist">
              Supprime la guilde : ses membres sont libérés et son historique de points disparaît.
              Saisissez son nom exact pour confirmer.
            </p>
            <form
              className="mt-3 flex flex-wrap gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                void run({ action: "dissolve", confirmName: confirm }, "Guilde dissoute.");
              }}
            >
              <input
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder={selected.name}
                className={`${field} min-w-0 flex-1`}
              />
              <button
                type="submit"
                className={dangerButtonClass}
                disabled={confirm !== selected.name}
              >
                Dissoudre
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
          placeholder="Nom de la guilde"
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
                  {g.description ?? "Pas de description"}
                </div>
              </div>
              <span className="shrink-0 text-xs text-fog">
                {g.members} membre{g.members > 1 ? "s" : ""}
                {g.owner && ` · chef ${g.owner}`}
              </span>
            </button>
          </li>
        ))}
        {list && !list.guilds.length && (
          <li className="prose-serif py-6 text-center text-pale-mist">Aucune guilde.</li>
        )}
      </ul>
      {list && <Pager page={page} totalPages={list.totalPages} onPage={setPage} />}
    </div>
  );
}

function Deleted({ apiUrl }: { apiUrl: string }) {
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
  if (!data) return <p className="mt-6 text-sm text-fog">Chargement…</p>;
  if (data.accounts.length === 0)
    return (
      <p className="mt-6 text-sm text-fog">
        Aucun compte supprimé depuis la mise en place du suivi.
      </p>
    );
  return (
    <div className="mt-6">
      <p className="text-sm text-fog">{data.total} compte(s) supprimé(s)</p>
      <ul className="mt-3 divide-y divide-line rounded-xl border border-line bg-surface">
        {data.accounts.map((a) => (
          <li key={a.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 text-sm">
            <strong className="min-w-0 flex-1 truncate">{a.username}</strong>
            <span className="text-fog">
              {a.by ? `supprimé par ${a.by}` : "supprimé par le joueur lui-même"}
              {a.reason && ` · motif : ${a.reason}`}
            </span>
            {a.discordId && (
              <span className="font-mono text-xs text-fog">Discord {a.discordId}</span>
            )}
            <time className="text-xs text-fog" dateTime={a.at}>
              {new Date(a.at).toLocaleString("fr-FR", { dateStyle: "medium", timeStyle: "short" })}
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
            Plus récent
          </button>
          <span className="text-fog">
            Page {page} / {data.totalPages}
          </span>
          <button
            type="button"
            className={buttonClass}
            disabled={page >= data.totalPages}
            onClick={() => setPage(page + 1)}
          >
            Plus ancien
          </button>
        </div>
      )}
    </div>
  );
}

function Audit({ apiUrl, onOpen }: { apiUrl: string; onOpen: (id: string) => void }) {
  const [page, setPage] = useState(1);
  const [data, setData] = useState<{ actions: StaffAuditRow[]; totalPages: number } | null>(null);
  useEffect(() => {
    void apiFetch<{ actions: StaffAuditRow[]; totalPages: number }>(
      apiUrl,
      `/staff/audit?page=${page}`,
    ).then((r) => r.ok && setData(r.data));
  }, [apiUrl, page]);
  if (!data) return <p className="mt-6 text-sm text-fog">Chargement…</p>;
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
            Plus récent
          </button>
          <span className="text-fog">
            Page {page} / {data.totalPages}
          </span>
          <button
            type="button"
            className={buttonClass}
            disabled={page >= data.totalPages}
            onClick={() => setPage(page + 1)}
          >
            Plus ancien
          </button>
        </div>
      )}
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
  const [tab, setTab] = useState<Tab>("overview");
  const [memberId, setMemberId] = useState<string | null>(null);

  const open = (id: string) => {
    setMemberId(id);
    setTab("members");
  };
  const tabs: { value: Tab; label: string }[] = [
    { value: "overview", label: "Aperçu" },
    { value: "members", label: "Membres" },
    { value: "alerts", label: "Alertes" },
    { value: "reports", label: "Signalements" },
    { value: "auctions", label: "Enchères" },
    { value: "guilds", label: "Guildes" },
    { value: "deleted", label: "Supprimés" },
    { value: "audit", label: "Journal" },
  ];

  return (
    <div className="mt-6">
      <div className="flex flex-wrap items-center justify-center gap-3">
        <div
          className="flex flex-wrap justify-center gap-1 rounded-2xl border border-line p-1"
          role="tablist"
        >
          {tabs.map((t) => (
            <button
              key={t.value}
              type="button"
              role="tab"
              aria-selected={tab === t.value}
              onClick={() => {
                setTab(t.value);
                if (t.value !== "members") setMemberId(null);
              }}
              className={`rounded-full px-5 py-1.5 text-sm font-semibold transition-colors ${
                tab === t.value ? "bg-accent text-accent-foreground" : "hover:bg-foreground/10"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <Badge className="bg-accent/15 text-accent">{ROLE_LABEL[role]}</Badge>
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
      {tab === "auctions" && <Auctions apiUrl={apiUrl} onOpen={open} />}
      {tab === "guilds" && <Guilds apiUrl={apiUrl} role={role} onOpen={open} />}
      {tab === "deleted" && <Deleted apiUrl={apiUrl} />}
      {tab === "audit" && <Audit apiUrl={apiUrl} onOpen={open} />}
    </div>
  );
}
