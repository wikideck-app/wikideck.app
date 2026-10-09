"use client";

import { Check, UserPlus } from "@/components/icons";
import { useTranslations } from "next-intl";
import { useState } from "react";
import type { ReferralInfo } from "@wikideck/shared";
import { buttonClass } from "@/components/settings/controls";

export function ReferralCard({ info, siteUrl }: { info: ReferralInfo; siteUrl: string }) {
  const t = useTranslations("referral");
  const [copied, setCopied] = useState(false);
  const link = `${siteUrl}/?ref=${info.code}`;

  async function copy() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      /* le champ reste sélectionnable à la main */
    }
  }

  return (
    <section className="mt-6 w-full rounded-xl border border-line bg-surface p-5 text-left">
      <h2 className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-fog">
        <UserPlus className="size-3.5" /> {t("title")}
      </h2>
      <p className="mt-2 text-sm text-pale-mist">{t("text", { count: info.reward })}</p>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <input
          readOnly
          value={link}
          aria-label={t("linkLabel")}
          onFocus={(e) => e.currentTarget.select()}
          className="min-w-40 flex-1 rounded-lg border border-line bg-transparent px-3 py-2 font-mono text-xs outline-none focus:border-accent"
        />
        <button type="button" className={buttonClass} onClick={() => void copy()}>
          {copied ? (
            <>
              <Check className="size-4" /> {t("copied")}
            </>
          ) : (
            t("copy")
          )}
        </button>
      </div>
      <p className="mt-3 text-xs text-fog">
        {t("progress", { count: info.referrals, max: info.max })}
      </p>
    </section>
  );
}
