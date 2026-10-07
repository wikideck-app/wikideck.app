"use client";

import { useTranslations } from "next-intl";
import { useEffect, useRef } from "react";
import { ArticleView } from "@/components/battle/article-view";
import { primaryButtonClass } from "@/components/settings/controls";

export function ArticlePane({
  title,
  html,
  loading,
  loadError,
  onNavigate,
  onRetry,
}: {
  title: string;
  html: string;
  loading: boolean;
  loadError: string | null;
  onNavigate: (title: string) => void;
  onRetry: () => void;
}) {
  const t = useTranslations("battle");
  const scroller = useRef<HTMLDivElement>(null);
  useEffect(() => {
    scroller.current?.scrollTo({ top: 0 });
  }, [title]);

  return (
    <div ref={scroller} className="flex-1 overflow-y-auto bg-white">
      <div className="wp-page">
        {title && <h1 className="wp-title">{title}</h1>}
        {loading && (
          <div className="flex items-center gap-3 py-10 text-[#666]">
            <span className="wp-spinner" /> {t("loading")}
          </div>
        )}
        {loadError && (
          <div className="flex flex-col items-center gap-4 py-10 text-center">
            <p className="text-sm text-[#666]">{loadError}</p>
            <button type="button" className={primaryButtonClass} onClick={onRetry}>
              {t("retry")}
            </button>
          </div>
        )}
        {!loading && !loadError && html && (
          <ArticleView html={html} onNavigate={onNavigate} disabled={loading} />
        )}
      </div>
    </div>
  );
}
