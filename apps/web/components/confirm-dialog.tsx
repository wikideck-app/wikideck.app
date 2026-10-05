"use client";

import { AlertTriangle } from "@/components/icons";
import { useRef, useState, type ReactNode } from "react";
import { buttonClass, dangerButtonClass, primaryButtonClass } from "@/components/settings/controls";

type Options = {
  title: string;
  message?: ReactNode;
  confirmLabel?: string;
  danger?: boolean;
};

export function useConfirm() {
  const [options, setOptions] = useState<Options | null>(null);
  const resolver = useRef<((ok: boolean) => void) | null>(null);

  const confirm = (o: Options) =>
    new Promise<boolean>((resolve) => {
      // une confirmation déjà ouverte est annulée
      resolver.current?.(false);
      resolver.current = resolve;
      setOptions(o);
    });

  const settle = (ok: boolean) => {
    resolver.current?.(ok);
    resolver.current = null;
    setOptions(null);
  };

  const dialog = options && (
    <dialog
      ref={(el) => {
        if (el && !el.open) el.showModal();
      }}
      onClose={() => settle(false)}
      onClick={(e) => e.target === e.currentTarget && e.currentTarget.close()}
      className="m-auto w-[calc(100%-2rem)] max-w-md rounded-xl border border-line bg-surface p-6 text-foreground backdrop:bg-black/70"
    >
      <div className="flex items-start gap-3">
        {options.danger && (
          <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full bg-danger/15 text-danger">
            <AlertTriangle className="size-5" />
          </span>
        )}
        <div className="min-w-0">
          <h2 className="text-lg font-bold">{options.title}</h2>
          {options.message && <p className="mt-1.5 text-sm text-pale-mist">{options.message}</p>}
        </div>
      </div>
      <div className="mt-6 flex justify-end gap-3">
        <button type="button" autoFocus className={buttonClass} onClick={() => settle(false)}>
          Annuler
        </button>
        <button
          type="button"
          className={options.danger ? dangerButtonClass : primaryButtonClass}
          onClick={() => settle(true)}
        >
          {options.confirmLabel ?? "Confirmer"}
        </button>
      </div>
    </dialog>
  );

  return { confirm, dialog };
}
