"use client";

import { ArrowRight, Check, Info } from "@/components/icons";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { REFERRAL_CODE_PATTERN } from "@wikideck/shared";

const ERROR_KEYS = ["denied", "state", "token", "profile", "banned"] as const;
const isErrorKey = (value: string): value is (typeof ERROR_KEYS)[number] =>
  (ERROR_KEYS as readonly string[]).includes(value);

const legalLink = "font-bold text-foreground underline underline-offset-2";

const REFERRAL_STORAGE = "wikideck_ref";

export function DiscordAuth({
  apiUrl,
  error,
  referral,
}: {
  apiUrl: string;
  error?: string;
  /** code de parrainage du lien `/?ref=…` */
  referral?: string;
}) {
  const t = useTranslations("auth");
  const [accepted, setAccepted] = useState(false);
  const [missing, setMissing] = useState(false);

  // le code survit à une navigation (CGU, confidentialité…) avant la connexion
  useEffect(() => {
    const code = referral?.toLowerCase();
    if (!code || !REFERRAL_CODE_PATTERN.test(code)) return;
    try {
      localStorage.setItem(REFERRAL_STORAGE, code);
    } catch {}
  }, [referral]);

  function submit() {
    if (!accepted) return setMissing(true);
    let code = referral?.toLowerCase() ?? "";
    if (!REFERRAL_CODE_PATTERN.test(code)) {
      try {
        code = localStorage.getItem(REFERRAL_STORAGE) ?? "";
      } catch {
        code = "";
      }
    }
    const query = REFERRAL_CODE_PATTERN.test(code) ? `?ref=${code}` : "";
    window.location.assign(`${apiUrl}/auth/discord${query}`);
  }

  return (
    <div className="on-light w-full max-w-sm rounded-xl bg-surface p-8 shadow-(--shadow-float)">
      <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-fog">{t("eyebrow")}</p>
      <h2 className="font-display mt-3 text-3xl font-medium">{t("title")}</h2>
      <p className="mt-3 font-serif text-[15px] leading-[1.7] text-pale-mist">
        {t("intro")}
      </p>

      {error && (
        <p role="alert" className="mt-5 rounded-lg bg-danger/10 p-3 text-sm text-danger">
          {t(`errors.${error !== undefined && isErrorKey(error) ? error : "unknown"}`)}
        </p>
      )}

      <label
        className={`mt-6 flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition-colors ${
          missing && !accepted
            ? "border-danger"
            : accepted
              ? "border-fog bg-accent/5"
              : "border-line hover:border-accent"
        }`}
      >
        <input
          type="checkbox"
          checked={accepted}
          onChange={(e) => {
            setAccepted(e.target.checked);
            setMissing(false);
          }}
          className="peer sr-only"
        />
        <span
          aria-hidden
          className={`mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-lg border transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-fog ${
            accepted ? "border-pale-mist bg-accent" : "border-fog"
          }`}
        >
          <Check
            strokeWidth={3}
            className={`size-3.5 transition-opacity ${accepted ? "opacity-100" : "opacity-0"}`}
          />
        </span>
        <span className="text-sm leading-snug text-pale-mist">
          {t.rich("consent", {
            strong: (chunks) => <strong className="font-bold text-foreground">{chunks}</strong>,
            terms: (chunks) => (
              <Link href="/terms" target="_blank" onClick={(e) => e.stopPropagation()} className={legalLink}>
                {chunks}
              </Link>
            ),
            privacy: (chunks) => (
              <Link href="/privacy" target="_blank" onClick={(e) => e.stopPropagation()} className={legalLink}>
                {chunks}
              </Link>
            ),
          })}
        </span>
      </label>

      {missing && !accepted && (
        <p role="alert" className="mt-2 text-xs text-danger">
          {t("consentMissing")}
        </p>
      )}

      <p className="mt-3 flex gap-2 text-xs leading-relaxed text-fog">
        <Info className="mt-0.5 size-3.5 shrink-0" />
        {t("sensitive")}
      </p>

      <button
        type="button"
        onClick={submit}
        aria-disabled={!accepted}
        className={`group mt-6 flex w-full items-center justify-center gap-2 rounded-full px-4.5 py-3 text-sm font-bold transition-colors ${
          accepted
            ? "bg-accent text-accent-foreground hover:bg-accent/70"
            : "border border-line text-fog hover:border-accent"
        }`}
      >
        {t("continue")}
        <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
      </button>
    </div>
  );
}
