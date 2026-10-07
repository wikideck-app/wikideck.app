"use client";

import { Heart, HeartFill } from "@/components/icons";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { buttonClass } from "@/components/settings/controls";
import { apiCall, apiFetch } from "@/lib/tags-api";

export function WishButton({ apiUrl, cardId }: { apiUrl: string; cardId: string }) {
  const t = useTranslations("wishlist");
  const [wished, setWished] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void apiFetch<{ ids: string[] }>(apiUrl, "/wishlist/ids").then((res) => {
      if (!cancelled && res.ok) setWished(res.data.ids.includes(cardId));
    });
    return () => {
      cancelled = true;
    };
  }, [apiUrl, cardId]);

  async function toggle() {
    if (wished === null) return;
    setBusy(true);
    setError(null);
    const res = wished
      ? await apiCall(apiUrl, `/wishlist/${cardId}`, "DELETE")
      : await apiCall(apiUrl, "/wishlist", "POST", { cardId });
    setBusy(false);
    if (!res.ok) return setError(res.message);
    setWished(!wished);
  }

  return (
    <span className="inline-flex flex-col items-start">
      <button
        type="button"
        onClick={toggle}
        disabled={busy || wished === null}
        aria-pressed={wished ?? false}
        className={`${buttonClass} ${wished ? "border-danger! text-danger!" : ""}`}
      >
        {wished ? <HeartFill className="size-4" /> : <Heart className="size-4" />}
        {wished ? t("inWishlist") : t("add")}
      </button>
      {error && (
        <span role="alert" className="mt-1 text-xs text-danger">
          {error}
        </span>
      )}
    </span>
  );
}
