"use client";

import { useTranslations } from "next-intl";
import { useEffect } from "react";
import { setApiErrorTranslator } from "@/lib/tags-api";

// donne à apiCall/apiFetch le traducteur des codes d'erreur de l'API
export function ApiErrorMessages() {
  const t = useTranslations("apiErrors");
  useEffect(() => setApiErrorTranslator(t), [t]);
  return null;
}
