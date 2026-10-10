"use client";

import { useFormatter, useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import {
  SHOP_DESCRIPTION_MAX,
  SHOP_KINDS,
  SHOP_NAME_MAX,
  type ShopItemKind,
  type StaffShopInput,
  type StaffShopItem,
} from "@wikideck/shared";
import { useConfirm } from "@/components/confirm-dialog";
import { buttonClass, dangerButtonClass, primaryButtonClass } from "@/components/settings/controls";
import { apiCall, apiFetch } from "@/lib/tags-api";

const field =
  "w-full rounded-lg border border-line bg-transparent px-3 py-2 text-sm outline-none focus:border-accent";

type Draft = {
  name: string;
  description: string;
  kind: ShopItemKind;
  amount: string;
  price: string;
  maxPerUser: string;
  maxPerUserPerDay: string;
  stock: string;
  sortOrder: string;
  active: boolean;
  availableFrom: string;
  availableUntil: string;
};

const EMPTY: Draft = {
  name: "",
  description: "",
  kind: "WIKIPEDIA_PACKS",
  amount: "1",
  price: "100",
  maxPerUser: "",
  maxPerUserPerDay: "",
  stock: "",
  sortOrder: "0",
  active: true,
  availableFrom: "",
  availableUntil: "",
};

// <input type="datetime-local"> parle en heure locale, sans fuseau
const toLocalInput = (iso: string | null) => {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};
const fromLocalInput = (value: string) => (value ? new Date(value).toISOString() : null);

const draftOf = (i: StaffShopItem): Draft => ({
  name: i.name,
  description: i.description ?? "",
  kind: i.kind,
  amount: String(i.amount),
  price: String(i.price),
  maxPerUser: i.maxPerUser === null ? "" : String(i.maxPerUser),
  maxPerUserPerDay: i.maxPerUserPerDay === null ? "" : String(i.maxPerUserPerDay),
  stock: i.stock === null ? "" : String(i.stock),
  sortOrder: String(i.sortOrder),
  active: i.active,
  availableFrom: toLocalInput(i.availableFrom),
  availableUntil: toLocalInput(i.availableUntil),
});

const optional = (value: string) => (value.trim() === "" ? null : Number(value));

const inputOf = (d: Draft): StaffShopInput => ({
  name: d.name.trim(),
  description: d.description.trim() || null,
  kind: d.kind,
  amount: Number(d.amount),
  price: Number(d.price),
  maxPerUser: optional(d.maxPerUser),
  maxPerUserPerDay: optional(d.maxPerUserPerDay),
  stock: optional(d.stock),
  sortOrder: Number(d.sortOrder) || 0,
  active: d.active,
  availableFrom: fromLocalInput(d.availableFrom),
  availableUntil: fromLocalInput(d.availableUntil),
});

export function ShopAdmin({ apiUrl }: { apiUrl: string }) {
  const t = useTranslations("staff.shop");
  const tc = useTranslations("common");
  const format = useFormatter();
  const { confirm, dialog: confirmDialog } = useConfirm();
  const [items, setItems] = useState<StaffShopItem[] | null>(null);
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [editing, setEditing] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const res = await apiFetch<{ items: StaffShopItem[] }>(apiUrl, "/staff/shop");
    if (res.ok) setItems(res.data.items);
    else setError(res.message);
  }
  useEffect(() => {
    void apiFetch<{ items: StaffShopItem[] }>(apiUrl, "/staff/shop").then(
      (r) => r.ok && setItems(r.data.items),
    );
  }, [apiUrl]);

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) =>
    setDraft((d) => ({ ...d, [key]: value }));

  async function save() {
    setBusy(true);
    setError(null);
    const res = editing
      ? await apiCall(apiUrl, `/staff/shop/${editing}`, "PUT", inputOf(draft))
      : await apiCall(apiUrl, "/staff/shop", "POST", inputOf(draft));
    setBusy(false);
    if (!res.ok) return setError(res.message);
    setDraft(EMPTY);
    setEditing(null);
    await load();
  }

  async function remove(item: StaffShopItem) {
    const ok = await confirm({
      title: t("deleteTitle", { name: item.name }),
      message: t("deleteMessage"),
      confirmLabel: t("delete"),
      danger: true,
    });
    if (!ok) return;
    const res = await apiCall(apiUrl, `/staff/shop/${item.id}`, "DELETE");
    if (!res.ok) return setError(res.message);
    if (editing === item.id) {
      setEditing(null);
      setDraft(EMPTY);
    }
    await load();
  }

  async function toggle(item: StaffShopItem) {
    const res = await apiCall(apiUrl, `/staff/shop/${item.id}`, "PUT", {
      ...inputOf(draftOf(item)),
      active: !item.active,
    });
    if (!res.ok) return setError(res.message);
    await load();
  }

  return (
    <div className="mt-6">
      <p className="prose-serif text-sm text-pale-mist">{t("intro")}</p>

      <form
        className="mt-4 grid gap-3 rounded-xl border border-line bg-surface p-5 sm:grid-cols-2"
        onSubmit={(e) => {
          e.preventDefault();
          void save();
        }}
      >
        <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-fog sm:col-span-2">
          {editing ? t("editTitle") : t("newTitle")}
        </h3>
        <label className="flex flex-col gap-1 text-xs text-fog">
          {t("name")}
          <input
            className={field}
            value={draft.name}
            maxLength={SHOP_NAME_MAX}
            onChange={(e) => set("name", e.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-fog">
          {t("kind")}
          <select
            className={field}
            value={draft.kind}
            onChange={(e) => set("kind", e.target.value as ShopItemKind)}
          >
            {SHOP_KINDS.map((k) => (
              <option key={k} value={k}>
                {t(`kinds.${k}`)}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs text-fog sm:col-span-2">
          {t("description")}
          <textarea
            className={field}
            rows={2}
            value={draft.description}
            maxLength={SHOP_DESCRIPTION_MAX}
            onChange={(e) => set("description", e.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-fog">
          {t("amount")} <span className="font-normal">({t(`amountHint.${draft.kind}`)})</span>
          <input
            className={field}
            type="number"
            min={1}
            value={draft.amount}
            onChange={(e) => set("amount", e.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-fog">
          {t("price")}
          <input
            className={field}
            type="number"
            min={1}
            value={draft.price}
            onChange={(e) => set("price", e.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-fog">
          {t("maxPerUser")}
          <input
            className={field}
            type="number"
            min={1}
            placeholder={t("unlimited")}
            value={draft.maxPerUser}
            onChange={(e) => set("maxPerUser", e.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-fog">
          {t("maxPerUserPerDay")}
          <input
            className={field}
            type="number"
            min={1}
            placeholder={t("unlimited")}
            value={draft.maxPerUserPerDay}
            onChange={(e) => set("maxPerUserPerDay", e.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-fog">
          {t("stock")}
          <input
            className={field}
            type="number"
            min={0}
            placeholder={t("unlimited")}
            value={draft.stock}
            onChange={(e) => set("stock", e.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-fog">
          {t("sortOrder")}
          <input
            className={field}
            type="number"
            value={draft.sortOrder}
            onChange={(e) => set("sortOrder", e.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-fog">
          {t("availableFrom")}
          <input
            className={field}
            type="datetime-local"
            value={draft.availableFrom}
            onChange={(e) => set("availableFrom", e.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-fog">
          {t("availableUntil")}
          <input
            className={field}
            type="datetime-local"
            value={draft.availableUntil}
            onChange={(e) => set("availableUntil", e.target.value)}
          />
        </label>
        <p className="text-xs text-fog sm:col-span-2">{t("windowHint")}</p>
        <label className="flex items-center gap-2 self-end pb-2 text-sm">
          <input
            type="checkbox"
            checked={draft.active}
            onChange={(e) => set("active", e.target.checked)}
          />
          {t("active")}
        </label>
        <div className="flex flex-wrap gap-2 sm:col-span-2">
          <button type="submit" className={primaryButtonClass} disabled={busy || !draft.name.trim()}>
            {editing ? t("save") : t("create")}
          </button>
          {editing && (
            <button
              type="button"
              className={buttonClass}
              onClick={() => {
                setEditing(null);
                setDraft(EMPTY);
              }}
            >
              {tc("cancel")}
            </button>
          )}
        </div>
      </form>
      {error && (
        <p role="alert" className="mt-3 text-sm text-danger">
          {error}
        </p>
      )}

      {!items ? (
        <p className="mt-6 text-sm text-fog">{tc("loading")}</p>
      ) : items.length === 0 ? (
        <p className="mt-6 text-sm text-fog">{t("none")}</p>
      ) : (
        <ul className="mt-6 divide-y divide-line rounded-xl border border-line bg-surface">
          {items.map((i) => (
            <li key={i.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 text-sm">
              <div className="min-w-48 flex-1">
                <strong>{i.name}</strong>
                {i.active && i.availableFrom && new Date(i.availableFrom) > new Date() && (
                  <span className="ml-2 rounded-full bg-accent/15 px-2 py-0.5 text-[11px] text-accent">
                    {t("scheduled")}
                  </span>
                )}
                {i.active && i.availableUntil && new Date(i.availableUntil) <= new Date() && (
                  <span className="ml-2 rounded-full bg-foreground/10 px-2 py-0.5 text-[11px] text-fog">
                    {t("expired")}
                  </span>
                )}
                {!i.active && (
                  <span className="ml-2 rounded-full bg-foreground/10 px-2 py-0.5 text-[11px] text-fog">
                    {t("inactive")}
                  </span>
                )}
                <p className="text-xs text-fog">
                  {t(`kinds.${i.kind}`)} × {i.amount} · {format.number(i.price)} ·{" "}
                  {t("sold", { count: i.sold })}
                  {i.stock !== null && ` · ${t("stockLeft", { count: i.stock })}`}
                  {i.maxPerUser !== null && ` · ${t("perUserShort", { count: i.maxPerUser })}`}
                  {i.maxPerUserPerDay !== null &&
                    ` · ${t("perDayShort", { count: i.maxPerUserPerDay })}`}
                  {i.availableFrom &&
                    ` · ${t("from", { date: format.dateTime(new Date(i.availableFrom), "mediumTime") })}`}
                  {i.availableUntil &&
                    ` · ${t("until", { date: format.dateTime(new Date(i.availableUntil), "mediumTime") })}`}
                </p>
              </div>
              <button
                type="button"
                className={buttonClass}
                onClick={() => {
                  setEditing(i.id);
                  setDraft(draftOf(i));
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
              >
                {t("edit")}
              </button>
              <button type="button" className={buttonClass} onClick={() => void toggle(i)}>
                {i.active ? t("deactivate") : t("activate")}
              </button>
              <button type="button" className={dangerButtonClass} onClick={() => void remove(i)}>
                {t("delete")}
              </button>
            </li>
          ))}
        </ul>
      )}
      {confirmDialog}
    </div>
  );
}
