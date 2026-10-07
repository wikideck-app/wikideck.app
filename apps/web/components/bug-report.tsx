"use client";

import { useTranslations } from "next-intl";
import { useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { BUG_REPORT_MAX, BUG_REPORT_MIN } from "@wikideck/shared";
import { buttonClass, primaryButtonClass } from "@/components/settings/controls";
import { apiCall } from "@/lib/tags-api";

export function BugReportButton({
  apiUrl,
  className = "",
}: {
  apiUrl: string;
  className?: string;
}) {
  const t = useTranslations("bugReport");
  const tc = useTranslations("common");
  const pathname = usePathname();
  const dialog = useRef<HTMLDialogElement>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const open = () => {
    setError(null);
    setSent(false);
    dialog.current?.showModal();
  };
  const close = () => dialog.current?.close();

  const submit = async () => {
    setBusy(true);
    const res = await apiCall(apiUrl, "/bug-reports", "POST", { message, page: pathname });
    setBusy(false);
    if (!res.ok) return setError(res.message);
    setMessage("");
    setError(null);
    setSent(true);
  };

  const tooShort = message.trim().length < BUG_REPORT_MIN;

  return (
    <>
      <button
        type="button"
        onClick={open}
        className={`underline-offset-2 hover:text-foreground hover:underline ${className}`}
      >
        {t("open")}
      </button>
      <dialog
        ref={dialog}
        onClick={(e) => e.target === e.currentTarget && close()}
        className="m-auto w-[calc(100%-2rem)] max-w-md rounded-xl border border-line bg-surface p-6 text-left text-foreground backdrop:bg-black/70"
      >
        <h2 className="text-lg font-bold">{t("title")}</h2>
        {sent ? (
          <>
            <p className="mt-2 text-sm text-pale-mist">
              {t("thanks")}
            </p>
            <div className="mt-6 flex justify-end">
              <button type="button" autoFocus className={primaryButtonClass} onClick={close}>
                {tc("close")}
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="mt-1.5 text-sm text-pale-mist">
              {t("intro")}
            </p>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              maxLength={BUG_REPORT_MAX}
              rows={6}
              placeholder={t("placeholder")}
              className="mt-3 w-full resize-y rounded-lg border border-line bg-transparent px-3 py-2 text-sm outline-none focus:border-accent"
            />
            <div className="mt-1 flex justify-between text-xs text-fog">
              <span>{error && <span className="text-danger">{error}</span>}</span>
              <span className="tabular-nums">
                {message.length}/{BUG_REPORT_MAX}
              </span>
            </div>
            <div className="mt-5 flex justify-end gap-3">
              <button type="button" className={buttonClass} onClick={close}>
                {tc("cancel")}
              </button>
              <button
                type="button"
                className={primaryButtonClass}
                disabled={busy || tooShort}
                onClick={() => void submit()}
              >
                {tc("send")}
              </button>
            </div>
          </>
        )}
      </dialog>
    </>
  );
}
