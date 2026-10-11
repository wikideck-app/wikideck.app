"use client";

import { apiCall, apiFetch } from "@/lib/tags-api";

export type PushState = "unsupported" | "denied" | "off" | "on" | "unconfigured";

export const pushSupported = () =>
  typeof window !== "undefined" &&
  "serviceWorker" in navigator &&
  "PushManager" in window &&
  "Notification" in window;

const registration = () => navigator.serviceWorker.register("/sw.js").then(() => navigator.serviceWorker.ready);

export async function pushState(): Promise<PushState> {
  if (!pushSupported()) return "unsupported";
  if (Notification.permission === "denied") return "denied";
  const reg = await navigator.serviceWorker.getRegistration("/sw.js");
  const sub = await reg?.pushManager.getSubscription();
  return sub && Notification.permission === "granted" ? "on" : "off";
}

function keyBytes(base64: string) {
  const raw = atob(base64.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(base64.length / 4) * 4, "="));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

/** abonne cet appareil ; renvoie l'état obtenu ou un message d'erreur */
export async function enablePush(apiUrl: string): Promise<{ state: PushState; error?: string }> {
  if (!pushSupported()) return { state: "unsupported" };
  if ((await Notification.requestPermission()) !== "granted") return { state: await pushState() };
  const key = await apiFetch<{ key: string | null }>(apiUrl, "/push/key");
  if (!key.ok) return { state: "off", error: key.message };
  if (!key.data.key) return { state: "unconfigured" };
  const reg = await registration();
  const existing = await reg.pushManager.getSubscription();
  const sub =
    existing ??
    (await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: keyBytes(key.data.key),
    }));
  const saved = await apiCall(apiUrl, "/push/subscription", "POST", sub.toJSON());
  if (!saved.ok) return { state: "off", error: saved.message };
  return { state: "on" };
}

export async function disablePush(apiUrl: string) {
  const reg = await navigator.serviceWorker.getRegistration("/sw.js");
  const sub = await reg?.pushManager.getSubscription();
  if (!sub) return;
  await apiCall(apiUrl, "/push/subscription", "DELETE", { endpoint: sub.endpoint });
  await sub.unsubscribe();
}

/** notification système : via le service worker (obligatoire sur téléphone), sinon directement */
export async function showSystemNotification(title: string, options: NotificationOptions) {
  try {
    const reg = await navigator.serviceWorker?.getRegistration("/sw.js");
    if (reg) return void (await reg.showNotification(title, options));
  } catch {}
  new Notification(title, options);
}
