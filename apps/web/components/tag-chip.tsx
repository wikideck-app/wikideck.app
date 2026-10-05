import { X } from "@/components/icons";
import type { TagDto } from "@wikideck/shared";
import { tagStyle } from "@/lib/tag-style";

export function TagChip({
  tag,
  onRemove,
  active = false,
}: {
  tag: Pick<TagDto, "name" | "color">;
  onRemove?: () => void;
  active?: boolean;
}) {
  return (
    <span
      style={tagStyle(tag.color, active)}
      className="inline-flex max-w-full items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold"
    >
      <span className="truncate">{tag.name}</span>
      {onRemove && (
        <button
          type="button"
          aria-label={`Retirer l'étiquette ${tag.name}`}
          onClick={onRemove}
          className="opacity-70 hover:opacity-100"
        >
          <X className="size-3" />
        </button>
      )}
    </span>
  );
}
