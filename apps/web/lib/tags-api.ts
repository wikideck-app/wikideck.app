const ERRORS: Record<string, string> = {
  exists: "Cette étiquette existe déjà.",
  too_many: "Limite d'étiquettes atteinte.",
  invalid: "Nom ou couleur invalide.",
  rate_limited: "Trop de requêtes, patientez un instant.",
  unauthorized: "Votre session a expiré, reconnectez-vous.",
  not_found: "Élément introuvable.",
  overloaded: "Le serveur est très sollicité, réessayez dans un instant.",
  import_limit: "Vous avez atteint la limite de cartes importables.",
  wikipedia_unavailable: "Wikipédia limite le débit, réessayez dans un instant.",
  invalid_username: "Pseudonyme invalide : 3 à 24 caractères (lettres, chiffres, espace, . _ - ').",
  username_taken: "Ce pseudonyme est déjà pris.",
  not_owned: "Vous ne possédez pas cette carte.",
  confirmation_required: "Confirmation requise.",
  invalid_message: "Message vide ou trop long.",
  not_friends: "Vous ne pouvez écrire qu'à vos amis.",
  self_friend: "Vous ne pouvez pas vous ajouter vous-même.",
  already_friends: "Vous êtes déjà amis.",
  already_requested: "Une demande est déjà en attente.",
  too_many_friends: "Vous avez atteint la limite d'amis.",
  target_too_many_friends: "Ce joueur a atteint la limite d'amis.",
  too_many_requests: "Trop de demandes en attente : attendez des réponses ou annulez-en.",
  invalid_guild_name: "Nom invalide : 3 à 24 caractères (lettres, chiffres, espace, . _ - ').",
  guild_name_taken: "Ce nom de guilde est déjà pris.",
  already_in_guild: "Vous appartenez déjà à une guilde.",
  guild_full: "Cette guilde est complète.",
  no_guild: "Vous n'avez pas de guilde.",
  forbidden: "Action réservée.",
  own_wish: "Vous ne pouvez pas vous offrir votre propre souhait.",
  received_today: "Ce camarade a déjà reçu une carte aujourd'hui (une par jour, minuit UTC).",
  already_owned: "Vous possédez déjà cette carte.",
  has_open_wish: "Vous avez déjà un souhait en cours : retirez-le d'abord.",
  busy: "Le serveur est occupé, réessayez.",
  room_full: "Ce salon est complet.",
  in_progress: "Une manche est en cours : attendez qu'elle se termine.",
  not_enough_players: "Il faut au moins 2 joueurs pour lancer la partie.",
  no_catalog: "Impossible de tirer des articles pour le moment, réessayez.",
  not_member: "Vous ne faites pas partie de ce salon.",
  account_restricted: "Cette fonction est temporairement indisponible pour ce compte.",
  invalid_reason: "Indiquez un motif (3 caractères minimum).",
  already_reported: "Vous avez déjà signalé ce message.",
  card_locked:
    "Cette carte est protégée (mise en avant, vitrine, échange ou enchère en cours) : retirez d'abord cette protection.",
  wishlist_full: "Votre liste d'envies est pleine (3 cartes). Retirez-en une pour en ajouter.",
  nothing_to_recycle: "Vous n'avez aucun doublon à recycler dans ces raretés.",
  already_resolved: "Cet élément a déjà été traité.",
  ended: "Cette enchère est terminée.",
  own_auction: "Vous ne pouvez pas miser sur votre propre vente.",
  bid_too_low: "Votre mise est trop basse : quelqu'un a peut-être surenchéri.",
  insufficient_funds: "Vous n'avez pas assez de wikibits.",
  outbid: "Quelqu'un vient de surenchérir. Réessayez avec le nouveau montant.",
  too_many_listings: "Vous avez déjà trop de ventes en cours.",
  has_bids: "Des mises ont déjà été placées : la vente ne peut plus être annulée.",
  active_auctions:
    "Terminez d'abord vos enchères en cours (ventes et mises en tête) avant de supprimer le compte.",
};

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
        message: ERRORS[data.error] ?? "Une erreur est survenue.",
        status: res.status,
        code: data.error,
      };
    }
    return { ok: true, data: data as T };
  } catch {
    return { ok: false, message: "Impossible de joindre le serveur." };
  }
}

export async function apiFetch<T>(apiUrl: string, path: string): Promise<ApiResult<T>> {
  try {
    const res = await fetch(`${apiUrl}${path}`, { credentials: "include" });
    const data = await res.json();
    if (!res.ok) {
      return {
        ok: false,
        message: ERRORS[data.error] ?? "Une erreur est survenue.",
        status: res.status,
        code: data.error,
      };
    }
    return { ok: true, data: data as T };
  } catch {
    return { ok: false, message: "Impossible de joindre le serveur." };
  }
}
