import type { CSSProperties } from "react";
import { TAG_COLORS, type TagColor } from "@wikideck/shared";

export const tagColorValue = (color: TagColor) =>
  (TAG_COLORS as readonly string[]).includes(color) ? `var(--tag-${color})` : color;

export const tagStyle = (color: TagColor, active = false): CSSProperties => {
  const value = tagColorValue(color);
  return {
    backgroundColor: `color-mix(in srgb, ${value} ${active ? 42 : 22}%, transparent)`,
    ...(active && { boxShadow: `inset 0 0 0 1.5px ${value}` }),
    color: `color-mix(in srgb, ${value} 78%, var(--foreground))`,
  };
};

export const swatchStyle = (color: TagColor): CSSProperties => ({
  backgroundColor: tagColorValue(color),
});
