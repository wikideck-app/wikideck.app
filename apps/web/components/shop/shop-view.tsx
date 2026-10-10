"use client";

import { ShoppingBag } from "@/components/icons";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { ShopBuyResponse, ShopItemDto, ShopResponse } from "@wikideck/shared";
import { primaryButtonClass } from "@/components/settings/controls";
import { Countdown } from "@/components/market/countdown";
import { Wikibits } from "@/components/wikibit";
import { useNow } from "@/lib/now";
import { apiCall } from "@/lib/tags-api";

export function ShopView({ initial, apiUrl }: { initial: ShopResponse; apiUrl: string }) {
  const t = useTranslations("shop");
  const router = useRouter();
  const [items, setItems] = useState(initial.items);
  const [wikibits, setWikibits] = useState(initial.wikibits);
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);
  const now = useNow();

  async function buy(item: ShopItemDto) {
    setBusy(item.id);
    setNotice(null);
    const res = await apiCall<ShopBuyResponse>(apiUrl, `/shop/${item.id}/buy`, "POST");
    setBusy(null);
    if (!res.ok) return setNotice({ ok: false, text: res.message });
    setWikibits(res.data.wikibits);
    setItems((prev) => prev.map((i) => (i.id === item.id ? res.data.item : i)));
    setNotice({ ok: true, text: t("bought", { name: item.name }) });
    router.refresh();
  }

  return (
    <>
      <p className="mt-3 text-center text-sm text-fog">
        {t.rich("balance", {
          amount: () => <Wikibits amount={wikibits} className="font-bold text-foreground" />,
        })}
      </p>
      {notice && (
        <p
          role="status"
          className={`mt-4 text-center text-sm ${notice.ok ? "text-success" : "text-danger"}`}
        >
          {notice.text}
        </p>
      )}

      {items.length === 0 ? (
        <div className="mx-auto mt-12 flex max-w-sm flex-col items-center gap-3 text-center text-fog">
          <ShoppingBag className="size-12 opacity-50" />
          <p className="text-sm">{t("empty")}</p>
        </div>
      ) : (
        <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => {
            const soldOut = item.stock !== null && item.stock <= 0;
            const limited = item.maxPerUser !== null && item.purchased >= item.maxPerUser;
            const dayLimited =
              item.maxPerUserPerDay !== null && item.purchasedToday >= item.maxPerUserPerDay;
            const poor = wikibits < item.price;
            const ended =
              item.availableUntil !== null &&
              now !== 0 &&
              new Date(item.availableUntil).getTime() <= now;
            return (
              <li
                key={item.id}
                className="flex flex-col rounded-xl border border-line bg-surface p-5"
              >
                <div className="flex items-start justify-between gap-2">
                  <h2 className="text-lg font-bold">{item.name}</h2>
                  {item.availableUntil && (
                    <span className="shrink-0 rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-accent">
                      {t("limitedTime")}
                    </span>
                  )}
                </div>
                <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-accent">
                  {t(`kinds.${item.kind}`, { count: item.amount })}
                </p>
                {item.description && (
                  <p className="mt-2 text-sm text-pale-mist">{item.description}</p>
                )}
                <p className="mt-3 flex flex-wrap gap-x-3 text-xs text-fog">
                  {item.availableUntil && (
                    <span>
                      {t("endsIn")} <Countdown endsAt={item.availableUntil} className="font-bold" />
                    </span>
                  )}
                  {item.stock !== null && <span>{t("stock", { count: item.stock })}</span>}
                  {item.maxPerUser !== null && (
                    <span>{t("limit", { bought: item.purchased, max: item.maxPerUser })}</span>
                  )}
                  {item.maxPerUserPerDay !== null && (
                    <span>
                      {t("dailyLimit", { bought: item.purchasedToday, max: item.maxPerUserPerDay })}
                    </span>
                  )}
                </p>
                <div className="mt-auto flex items-center justify-between gap-3 pt-5">
                  <Wikibits amount={item.price} className="text-xl font-bold" iconClass="size-5" />
                  <button
                    type="button"
                    className={primaryButtonClass}
                    disabled={busy !== null || soldOut || limited || dayLimited || poor || ended}
                    onClick={() => void buy(item)}
                  >
                    {ended
                      ? t("ended")
                      : soldOut
                        ? t("soldOut")
                        : limited
                          ? t("limitReached")
                          : dayLimited
                            ? t("dailyLimitReached")
                            : poor
                            ? t("tooExpensive")
                            : t("buy")}
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
