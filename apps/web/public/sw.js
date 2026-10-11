// Service worker de Wikideck : reçoit les notifications Web Push, même quand le site est fermé.
/* eslint-disable no-undef */
const clean = (v, max) => String(v ?? "").replace(/[\u0000-\u001f]/g, "").slice(0, max);

function describe(e) {
  const from = clean(e.from, 40);
  switch (e.type) {
    case "message":
      return { body: `Nouveau message de ${from}`, url: "/messages", tag: "message" };
    case "friend":
      return {
        body: e.accepted ? `${from} a accepté votre demande d'ami` : `${from} vous a envoyé une demande d'ami`,
        url: "/friends",
        tag: "friend",
      };
    case "trade":
      return { body: `Échange mis à jour avec ${from}`, url: "/trades", tag: "trade" };
    case "outbid":
      return { body: "Vous avez été surenchéri", url: `/market/${encodeURIComponent(e.auction)}`, tag: `auction-${e.auction}` };
    case "auction":
      return { body: "Une de vos enchères a évolué", url: `/market/${encodeURIComponent(e.auction)}`, tag: `auction-${e.auction}` };
    case "wishlist":
      return { body: `${clean(e.card, 80)} (votre liste d'envies) est en vente`, url: `/market/${encodeURIComponent(e.auction)}`, tag: `wishlist-${e.auction}` };
    case "gift":
      return { body: `${from} vous a offert une carte`, url: "/guild", tag: "gift" };
    case "achievement":
      return { body: "Nouveau succès débloqué", url: "/achievements", tag: "achievement" };
    case "staff":
      return {
        body: e.kind === "bug" ? "Nouveau rapport de bug à traiter" : e.kind === "report" ? "Nouveau signalement de message à traiter" : "Un compte vient d'être signalé comme suspect",
        url: "/staff",
        tag: "staff",
      };
    default:
      return null;
  }
}

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("push", (event) => {
  let data;
  try {
    data = event.data.json();
  } catch {
    return;
  }
  const info = describe(data);
  if (!info) return;
  event.waitUntil(
    (async () => {
      // si Wikideck est affiché à l'écran, la bulle du site suffit
      const clients = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      if (clients.some((c) => c.visibilityState === "visible")) return;
      await self.registration.showNotification("Wikideck", {
        body: info.body,
        icon: "/logo.webp",
        badge: "/logo.webp",
        tag: info.tag,
        data: { url: info.url },
      });
    })(),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/";
  event.waitUntil(
    (async () => {
      const clients = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      for (const c of clients) {
        if ("focus" in c) {
          await c.focus();
          if ("navigate" in c) await c.navigate(url).catch(() => {});
          return;
        }
      }
      await self.clients.openWindow(url);
    })(),
  );
});
