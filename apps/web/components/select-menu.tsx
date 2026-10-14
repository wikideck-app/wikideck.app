"use client";

import { Check, ChevronDown } from "@/components/icons";
import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";

export function SelectMenu<T extends string>({
  label,
  value,
  options,
  onChange,
  block = false,
}: {
  label: string;
  value: T;
  options: readonly { value: T; label: string }[];
  onChange: (value: T) => void;
  /** Prend toute la largeur de son conteneur (sélecteur de section sur mobile) */
  block?: boolean;
}) {
  const id = useId();
  const root = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const trigger = useRef<HTMLButtonElement>(null);
  const list = useRef<HTMLUListElement>(null);
  // la liste est posée sur <body> en position fixe : aucun parent (transformations 3D, contenu différé…) ne peut la recouvrir
  const [box, setBox] = useState<{ top: number; left: number; width: number } | null>(null);
  const current = options.findIndex((o) => o.value === value);

  useEffect(() => {
    if (!open) return;
    // clic ou focus ailleurs : on ferme
    const inside = (n: Node) => root.current?.contains(n) || list.current?.contains(n);
    const close = (e: Event) => !inside(e.target as Node) && setOpen(false);
    const place = () => {
      const r = trigger.current?.getBoundingClientRect();
      if (r) setBox({ top: r.bottom + 8, left: r.left, width: r.width });
    };
    place();
    document.addEventListener("pointerdown", close);
    document.addEventListener("focusin", close);
    addEventListener("resize", place);
    addEventListener("scroll", place, true);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("focusin", close);
      removeEventListener("resize", place);
      removeEventListener("scroll", place, true);
    };
  }, [open]);

  const show = () => {
    setActive(Math.max(0, current));
    setOpen(true);
  };
  const choose = (i: number) => {
    setOpen(false);
    if (options[i] && options[i].value !== value) onChange(options[i].value);
  };

  function onKeyDown(e: React.KeyboardEvent) {
    const last = options.length - 1;
    if (!open) {
      if (["ArrowDown", "ArrowUp", "Enter", " "].includes(e.key)) {
        e.preventDefault();
        show();
      }
      return;
    }
    if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      setOpen(false);
    } else if (e.key === "Tab") setOpen(false);
    else if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(last, a + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(0, a - 1));
    } else if (e.key === "Home") {
      e.preventDefault();
      setActive(0);
    } else if (e.key === "End") {
      e.preventDefault();
      setActive(last);
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      choose(active);
    } else if (e.key.length === 1) {
      const from = options.findIndex(
        (o, i) => i > active && o.label.toLowerCase().startsWith(e.key.toLowerCase()),
      );
      if (from >= 0) setActive(from);
    }
  }

  return (
    <div ref={root} className={`relative ${open ? "z-30" : ""} ${block ? "w-full" : ""}`} onKeyDown={onKeyDown}>
      <button
        ref={trigger}
        type="button"
        role="combobox"
        aria-label={label}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={`${id}-list`}
        aria-activedescendant={open ? `${id}-${active}` : undefined}
        onClick={() => (open ? setOpen(false) : show())}
        className={`flex items-center gap-2 rounded-lg border border-line bg-surface py-1.5 pl-4 pr-3 text-sm font-semibold transition-colors hover:border-accent focus-visible:border-accent focus-visible:outline-none aria-expanded:border-accent ${block ? "w-full justify-between py-2.5" : ""}`}
      >
        {options[current]?.label}
        <ChevronDown
          className={`size-4 opacity-60 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open &&
        box &&
        createPortal(
          <ul
            ref={list}
            id={`${id}-list`}
            role="listbox"
            aria-label={label}
            style={{
              top: box.top,
              ...(block ? { left: box.left, width: box.width } : { right: innerWidth - box.left - box.width, minWidth: box.width }),
            }}
            className="fixed z-[100] max-h-[min(34rem,calc(100dvh-6rem))] overflow-y-auto overscroll-contain rounded-xl border border-line bg-surface p-1 shadow-xl"
          >
            {options.map((o, i) => (
              <li key={o.value} role="presentation">
                <button
                  type="button"
                  id={`${id}-${i}`}
                  role="option"
                  aria-selected={o.value === value}
                  tabIndex={-1}
                  onMouseDown={(e) => e.preventDefault()}
                  onPointerEnter={() => setActive(i)}
                  onClick={() => choose(i)}
                  className={`flex w-full cursor-pointer items-center justify-between gap-6 whitespace-nowrap rounded-lg px-3 py-2 text-left text-sm ${
                    i === active ? "bg-foreground/10" : ""
                  } ${o.value === value ? "font-bold text-accent" : ""}`}
                >
                  {o.label}
                  {o.value === value && <Check className="size-4" />}
                </button>
              </li>
            ))}
          </ul>,
          document.body,
        )}
    </div>
  );
}
