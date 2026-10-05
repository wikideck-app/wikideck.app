"use client";

import { useState } from "react";
import { normalizeTagColor, type TagColor } from "@wikideck/shared";
import { TAG_COLORS } from "@wikideck/shared";
import { tagColorValue } from "@/lib/tag-style";

// le sélecteur natif n'accepte que du #rrggbb, on convertit les anciens noms de couleur
function toHex(color: TagColor) {
  if (/^#[0-9a-f]{6}$/.test(color)) return color;
  if ((TAG_COLORS as readonly string[]).includes(color) && typeof document !== "undefined") {
    const probe = document.createElement("span");
    probe.style.color = tagColorValue(color);
    document.body.appendChild(probe);
    const rgb = getComputedStyle(probe).color.match(/\d+/g)?.map(Number) ?? [128, 128, 128];
    probe.remove();
    return `#${rgb
      .slice(0, 3)
      .map((n) => n.toString(16).padStart(2, "0"))
      .join("")}`;
  }
  return "#808080";
}

export function TagColorField({
  value,
  onChange,
  onCommit,
  label = "Couleur",
}: {
  value: TagColor;
  onChange?: (color: TagColor) => void;
  onCommit?: (color: TagColor) => void;
  label?: string;
}) {
  const hex = toHex(value);
  const [text, setText] = useState<string | null>(null);
  const shown = text ?? hex;
  const typed = normalizeTagColor(shown);
  const invalid = text !== null && !typed;

  const commit = (color: TagColor) => {
    if (color !== value) onCommit?.(color);
  };

  return (
    <div className="flex items-center gap-2">
      <span
        className="relative size-8 shrink-0 rounded-full border border-line ring-offset-2 ring-offset-background focus-within:ring-2 focus-within:ring-accent"
        style={{ backgroundColor: typed ?? hex }}
      >
        <input
          type="color"
          value={hex}
          aria-label={`${label} : sélecteur`}
          onChange={(e) => {
            setText(null);
            onChange?.(e.target.value);
          }}
          onBlur={(e) => commit(e.target.value)}
          className="absolute inset-0 size-full cursor-pointer opacity-0"
        />
      </span>
      <input
        value={shown}
        maxLength={7}
        spellCheck={false}
        aria-label={`${label} : code hexadécimal`}
        aria-invalid={invalid}
        placeholder="#a1b2c3"
        onChange={(e) => {
          setText(e.target.value);
          const ok = normalizeTagColor(e.target.value);
          if (ok) onChange?.(ok);
        }}
        onBlur={() => {
          if (typed) {
            setText(null);
            commit(typed);
          } else setText(null);
        }}
        onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
        className="w-24 rounded-[20px] border border-line bg-transparent px-3 py-1 font-mono text-sm uppercase outline-none focus:border-accent aria-[invalid=true]:border-danger"
      />
      {invalid && (
        <span role="alert" className="text-xs text-danger">
          Code invalide
        </span>
      )}
    </div>
  );
}
