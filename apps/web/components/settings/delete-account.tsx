"use client";

import { AlertTriangle, X } from "@/components/icons";
import { useTranslations } from "next-intl";
import { useRef, useState } from "react";
import { DELETE_CONFIRMATION } from "@wikideck/shared";
import { apiCall } from "@/lib/tags-api";
import { buttonClass, dangerButtonClass } from "./controls";

export function DeleteAccount({ apiUrl }: { apiUrl: string }) {
  const t = useTranslations("settings.deleteAccount");
  const tc = useTranslations("common");
  const dialog = useRef<HTMLDialogElement>(null);
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const confirmed = typed === DELETE_CONFIRMATION;

  async function remove() {
    if (!confirmed || busy) return;
    setBusy(true);
    setError(null);
    const result = await apiCall(apiUrl, "/me", "DELETE", { confirm: DELETE_CONFIRMATION });
    if (!result.ok) {
      setBusy(false);
      return setError(result.message);
    }
    window.location.assign("/");
  }

  return (
    <>
      <button
        type="button"
        onClick={() => dialog.current?.showModal()}
        className={dangerButtonClass}
      >
        <AlertTriangle className="size-4" />
        {t("button")}
      </button>

      <dialog
        ref={dialog}
        onClose={() => {
          setTyped("");
          setError(null);
        }}
        onClick={(e) => e.target === dialog.current && dialog.current.close()}
        className="m-auto w-[calc(100%-2rem)] max-w-md rounded-xl border border-danger/60 bg-surface p-7 text-foreground backdrop:bg-black/70"
      >
        <button
          type="button"
          aria-label={tc("close")}
          onClick={() => dialog.current?.close()}
          className="absolute right-4 top-4 opacity-60 hover:opacity-100"
        >
          <X className="size-5" />
        </button>
        <h2 className="flex items-center gap-2 text-lg font-bold text-danger">
          <AlertTriangle className="size-5" />
          {t("title")}
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-pale-mist">
          {t.rich("warning", {
            strong: (chunks) => <strong className="text-foreground">{chunks}</strong>,
          })}
        </p>
        <label className="mt-5 block text-xs text-fog" htmlFor="delete-confirm">
          {t.rich("confirm", {
            word: DELETE_CONFIRMATION,
            b: (chunks) => <b className="text-foreground">{chunks}</b>,
          })}
        </label>
        <input
          id="delete-confirm"
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          autoComplete="off"
          spellCheck={false}
          className="mt-2 w-full rounded-lg border border-line bg-transparent px-3 py-2 text-sm outline-none focus:border-danger"
        />
        {error && (
          <p role="alert" className="mt-3 text-sm text-danger">
            {error}
          </p>
        )}
        <div className="mt-6 flex justify-end gap-3">
          <button type="button" className={buttonClass} onClick={() => dialog.current?.close()}>
            {tc("cancel")}
          </button>
          <button
            type="button"
            className={dangerButtonClass}
            disabled={!confirmed || busy}
            onClick={remove}
          >
            {busy ? t("busy") : t("action")}
          </button>
        </div>
      </dialog>
    </>
  );
}
