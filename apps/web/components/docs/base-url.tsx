"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { Check, Copy } from "@/components/icons";

type Status = "checking" | "up" | "down";

// adresse de base de l'API, avec l'état du service (route publique /health)
export function BaseUrl({ apiUrl }: { apiUrl: string }) {
  const t = useTranslations("docs.site.baseUrl");
  const [status, setStatus] = useState<Status>("checking");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch(`${apiUrl}/health`)
      .then((r) => !cancelled && setStatus(r.ok ? "up" : "down"))
      .catch(() => !cancelled && setStatus("down"));
    return () => {
      cancelled = true;
    };
  }, [apiUrl]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(apiUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* presse-papiers indisponible */
    }
  }

  return (
    <div className="rounded-xl border border-line bg-surface p-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold">{t("title")}</span>
        <button
          type="button"
          onClick={() => void copy()}
          aria-label={copied ? t("copied") : t("copy")}
          className="text-pale-mist hover:text-foreground"
        >
          {copied ? <Check className="size-4 text-success" /> : <Copy className="size-4" />}
        </button>
      </div>
      <code className="mt-2 block break-all rounded-lg bg-foreground/5 px-2.5 py-1.5 text-xs">{apiUrl}</code>
      <p
        className={`mt-2 flex items-center gap-2 text-xs ${
          status === "up" ? "text-success" : status === "down" ? "text-danger" : "text-fog"
        }`}
        role="status"
      >
        <span
          className={`size-2 rounded-full ${
            status === "up" ? "bg-success" : status === "down" ? "bg-danger" : "bg-fog"
          }`}
        />
        {t(status === "up" ? "up" : status === "down" ? "down" : "checking")}
      </p>
    </div>
  );
}
