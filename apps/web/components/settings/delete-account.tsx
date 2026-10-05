"use client";

import { AlertTriangle, X } from "@/components/icons";
import { useRef, useState } from "react";
import { DELETE_CONFIRMATION } from "@wikideck/shared";
import { apiCall } from "@/lib/tags-api";
import { buttonClass, dangerButtonClass } from "./controls";

export function DeleteAccount({ apiUrl }: { apiUrl: string }) {
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
        Supprimer définitivement mon compte
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
          aria-label="Fermer"
          onClick={() => dialog.current?.close()}
          className="absolute right-4 top-4 opacity-60 hover:opacity-100"
        >
          <X className="size-5" />
        </button>
        <h2 className="flex items-center gap-2 text-lg font-bold text-danger">
          <AlertTriangle className="size-5" />
          Supprimer mon compte
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-pale-mist">
          Cette action est <strong className="text-foreground">définitive et irréversible</strong>.
          Votre profil, votre collection, vos étiquettes, vos paquets et votre historique de tirages
          seront effacés. Pensez à télécharger vos données avant.
        </p>
        <label className="mt-5 block text-xs text-fog" htmlFor="delete-confirm">
          Pour confirmer, saisissez <b className="text-foreground">{DELETE_CONFIRMATION}</b> :
        </label>
        <input
          id="delete-confirm"
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          autoComplete="off"
          spellCheck={false}
          className="mt-2 w-full rounded-[20px] border border-line bg-transparent px-3 py-2 text-sm outline-none focus:border-danger"
        />
        {error && (
          <p role="alert" className="mt-3 text-sm text-danger">
            {error}
          </p>
        )}
        <div className="mt-6 flex justify-end gap-3">
          <button type="button" className={buttonClass} onClick={() => dialog.current?.close()}>
            Annuler
          </button>
          <button
            type="button"
            className={dangerButtonClass}
            disabled={!confirmed || busy}
            onClick={remove}
          >
            {busy ? "Suppression…" : "Supprimer pour toujours"}
          </button>
        </div>
      </dialog>
    </>
  );
}
