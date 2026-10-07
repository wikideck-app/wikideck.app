"use client";

import { useTranslations } from "next-intl";
import { formatRemaining, useNow } from "@/lib/now";

export function Countdown({
  endsAt,
  className = "",
  endedLabel,
}: {
  endsAt: string;
  className?: string;
  endedLabel?: string;
}) {
  const t = useTranslations("common");
  const now = useNow();
  if (now === 0) return <span className={className}>—</span>;
  const left = new Date(endsAt).getTime() - now;
  if (left <= 0) return <span className={className}>{endedLabel ?? t("ended")}</span>;
  return (
    <span className={`tabular-nums ${left < 60_000 ? "text-danger" : ""} ${className}`}>
      {formatRemaining(left, t)}
    </span>
  );
}
