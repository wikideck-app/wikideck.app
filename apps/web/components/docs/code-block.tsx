"use client";

import { useTranslations } from "next-intl";
import { Fragment, useState } from "react";
import { Check, Copy } from "@/components/icons";

export type CodeTab = { label: string; code: string };

// coloration minimale : chaînes, commentaires, nombres et options de ligne de commande
function highlight(line: string) {
  const parts = line.split(/("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|#.*$|\/\/.*$|\b\d+(?:\.\d+)?\b|\s-[A-Za-z]\b)/g);
  return parts.map((part, i) => {
    if (!part) return null;
    if (/^["']/.test(part)) return <span key={i} className="text-tag-peach">{part}</span>;
    if (/^(#|\/\/)/.test(part)) return <span key={i} className="text-fog">{part}</span>;
    if (/^\d/.test(part)) return <span key={i} className="text-tag-sky">{part}</span>;
    if (/^\s-[A-Za-z]$/.test(part)) return <span key={i} className="text-tag-mauve">{part}</span>;
    return <Fragment key={i}>{part}</Fragment>;
  });
}

export function CodeBlock({ tabs, title }: { tabs: CodeTab[]; title?: string }) {
  const t = useTranslations("docs.site.baseUrl");
  const [active, setActive] = useState(0);
  const [copied, setCopied] = useState(false);
  const current = tabs[Math.min(active, tabs.length - 1)];

  async function copy() {
    try {
      await navigator.clipboard.writeText(current.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* presse-papiers indisponible */
    }
  }

  return (
    <div className="overflow-hidden rounded-xl border border-line bg-surface">
      <div className="flex items-center justify-between gap-2 border-b border-line bg-foreground/5 pr-2">
        {tabs.length > 1 ? (
          <div role="tablist" className="flex overflow-x-auto">
            {tabs.map((tab, i) => (
              <button
                key={tab.label}
                type="button"
                role="tab"
                aria-selected={i === active}
                onClick={() => setActive(i)}
                className={`border-b-2 px-4 py-2.5 text-sm font-semibold transition-colors ${
                  i === active
                    ? "border-accent text-accent"
                    : "border-transparent text-pale-mist hover:text-foreground"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        ) : (
          <span className="px-4 py-2.5 text-sm font-semibold text-pale-mist">{title ?? current.label}</span>
        )}
        <button
          type="button"
          onClick={() => void copy()}
          aria-label={copied ? t("copied") : t("copy")}
          title={copied ? t("copied") : t("copy")}
          className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-line text-pale-mist hover:bg-foreground/10"
        >
          {copied ? <Check className="size-4 text-success" /> : <Copy className="size-4" />}
        </button>
      </div>
      <pre className="overflow-x-auto p-4 text-[13px] leading-6">
        <code className="font-mono">
          {current.code.split("\n").map((line, i) => (
            <div key={i} className="flex gap-4">
              <span aria-hidden className="w-5 shrink-0 select-none text-right text-fog/60">
                {i + 1}
              </span>
              <span className="whitespace-pre">{highlight(line)}</span>
            </div>
          ))}
        </code>
      </pre>
    </div>
  );
}
