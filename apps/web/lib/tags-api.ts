import type { useTranslations } from "next-intl";

// les erreurs de l'API sont des codes (« bid_too_low ») ; le texte vient de messages/<locale>/apiErrors.json.
// Le traducteur est enregistré par <ApiErrorMessages /> : ces fonctions s'appellent hors rendu (événements).
type ErrorTranslator = ReturnType<typeof useTranslations<"apiErrors">>;

let translator: ErrorTranslator | null = null;

export function setApiErrorTranslator(t: ErrorTranslator) {
  translator = t;
}

function errorMessage(code?: unknown) {
  if (!translator) return typeof code === "string" ? code : "error";
  return typeof code === "string" && translator.has(code as never)
    ? translator(code as never)
    : translator("unknown");
}

export type ApiResult<T> =
  { ok: true; data: T } | { ok: false; message: string; status?: number; code?: string };

export async function apiCall<T = unknown>(
  apiUrl: string,
  path: string,
  method: "POST" | "PUT" | "PATCH" | "DELETE",
  body?: unknown,
): Promise<ApiResult<T>> {
  try {
    const res = await fetch(`${apiUrl}${path}`, {
      method,
      credentials: "include",
      headers: body === undefined ? undefined : { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    if (res.status === 204) return { ok: true, data: undefined as T };
    const text = await res.text();
    const data = text ? JSON.parse(text) : {};
    if (!res.ok) {
      return {
        ok: false,
        message: errorMessage(data.error),
        status: res.status,
        code: data.error,
      };
    }
    return { ok: true, data: data as T };
  } catch {
    return { ok: false, message: errorMessage("network") };
  }
}

export async function apiFetch<T>(apiUrl: string, path: string): Promise<ApiResult<T>> {
  try {
    const res = await fetch(`${apiUrl}${path}`, { credentials: "include" });
    const data = await res.json();
    if (!res.ok) {
      return {
        ok: false,
        message: errorMessage(data.error),
        status: res.status,
        code: data.error,
      };
    }
    return { ok: true, data: data as T };
  } catch {
    return { ok: false, message: errorMessage("network") };
  }
}
