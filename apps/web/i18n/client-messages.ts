import type { Messages } from "next-intl";
import { getMessages } from "next-intl/server";

type Namespace = keyof Messages;

// Les composants client reçoivent leurs messages dans le HTML : on n'envoie que les espaces de noms
// dont ils ont besoin. Les pages rendues côté serveur (légal, docs) lisent tout directement.
const LANDING: readonly Namespace[] = ["apiErrors", "auth", "cards", "common", "home", "legal"];
const SERVER_ONLY: readonly Namespace[] = ["docs", "home", "auth", "legalNotice", "meta", "privacy", "terms"];
const STAFF_ONLY: readonly Namespace[] = ["staff"];

async function pick(keep: (ns: Namespace) => boolean) {
  const all = await getMessages();
  return Object.fromEntries(Object.entries(all).filter(([ns]) => keep(ns as Namespace)));
}

/** Page d'accueil publique. */
export const landingMessages = () => pick((ns) => LANDING.includes(ns));

/** Espace connecté ; l'espace staff n'est envoyé qu'à ceux qui l'ouvrent. */
export const appMessages = ({ staff = false }: { staff?: boolean } = {}) =>
  pick((ns) => !SERVER_ONLY.includes(ns) && (staff || !STAFF_ONLY.includes(ns)));
