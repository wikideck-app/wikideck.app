import type { Messages } from "next-intl";

// Structure des routes documentées. Les textes (sections, résumés, descriptions des champs)
// sont dans messages/<locale>/docs.json, sous les clés `sections.<id>` et `endpoints.<key>`.
export type Method = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export type DocSectionId = keyof Messages["docs"]["sections"];
export type EndpointKey = keyof Messages["docs"]["endpoints"];

export type Endpoint = {
  key: EndpointKey;
  method: Method;
  path: string;
  /** noms des paramètres d'URL ; description : endpoints.<key>.query.<nom> */
  query?: string[];
  /** noms des champs du corps JSON ; description : endpoints.<key>.body.<nom> */
  body?: string[];
  returns?: string;
  errors?: string[];
  /** requêtes autorisées par fenêtre de `minutes` minutes */
  limit?: { max: number; minutes: number };
};

export type DocSection = {
  id: DocSectionId;
  endpoints: Endpoint[];
};

export const USER_DOCS: DocSection[] = [
  {
    id: "compte",
    endpoints: [
      { key: "get-auth-discord", method: "GET", path: "/auth/discord" },
      { key: "post-auth-logout", method: "POST", path: "/auth/logout", limit: { max: 20, minutes: 1 } },
      { key: "get-auth-me", method: "GET", path: "/auth/me", returns: "{ user: SessionUser | null }", limit: { max: 120, minutes: 1 } },
      { key: "get-me", method: "GET", path: "/me", limit: { max: 60, minutes: 1 } },
      { key: "patch-me", method: "PATCH", path: "/me", body: ["username", "isPublic", "showcaseCardId", "featuredCardIds"], errors: ["invalid_username", "username_taken", "not_owned"], limit: { max: 20, minutes: 1 } },
      { key: "delete-me", method: "DELETE", path: "/me", body: ["confirm"], errors: ["confirmation_required", "active_auctions"], limit: { max: 3, minutes: 1 } },
      { key: "put-me-settings", method: "PUT", path: "/me/settings", body: ["settings"], limit: { max: 120, minutes: 1 } },
      { key: "get-me-export", method: "GET", path: "/me/export", limit: { max: 5, minutes: 1 } },
      { key: "get-me-pulls", method: "GET", path: "/me/pulls", limit: { max: 30, minutes: 1 } },
      { key: "post-bug-reports", method: "POST", path: "/bug-reports", body: ["message", "page"], errors: ["invalid", "too_many_reports"], limit: { max: 5, minutes: 10 } },
    ],
  },
  {
    id: "paquets",
    endpoints: [
      { key: "get-packs", method: "GET", path: "/packs", returns: "{ packs, max, nextInMs, boosts }", limit: { max: 60, minutes: 1 } },
      { key: "post-packs-open", method: "POST", path: "/packs/open", body: ["boost"], returns: "{ packs, max, nextInMs, boosts, cards, godpack? }", errors: ["no_packs", "busy", "no_boost", "overloaded", "wikipedia_unavailable"], limit: { max: 6, minutes: 1 } },
      { key: "get-wheel", method: "GET", path: "/wheel", returns: "{ canSpin }", limit: { max: 60, minutes: 1 } },
      { key: "get-wheel-history", method: "GET", path: "/wheel/history", returns: "{ mine, recent }", limit: { max: 30, minutes: 1 } },
      { key: "post-wheel-spin", method: "POST", path: "/wheel/spin", returns: "{ index, prize, wikibits, packs, dropBoosts }", errors: ["already_spun"], limit: { max: 10, minutes: 1 } },
    ],
  },
  {
    id: "collection",
    endpoints: [
      { key: "get-collection", method: "GET", path: "/collection", query: ["page", "q", "rarity", "sort", "tag", "fav"], limit: { max: 60, minutes: 1 } },
      { key: "get-collection-locks", method: "GET", path: "/collection/locks", limit: { max: 120, minutes: 1 } },
      { key: "get-collection-duplicates", method: "GET", path: "/collection/duplicates" },
      { key: "put-collection-cardid-favorite", method: "PUT", path: "/collection/{cardId}/favorite", body: ["favorite"], returns: "{ favorite }", limit: { max: 120, minutes: 1 } },
      { key: "put-collection-cardid-tags", method: "PUT", path: "/collection/{cardId}/tags", body: ["tagIds"] },
      { key: "post-collection-bulk-preview", method: "POST", path: "/collection/bulk-preview", body: ["maxViews", "rarities", "cardIds", "list"] },
      { key: "post-collection-recycle", method: "POST", path: "/collection/recycle", body: ["cards", "duplicates", "bulk"], errors: ["invalid", "card_locked", "nothing_to_recycle", "not_owned"] },
      { key: "post-import-batch", method: "POST", path: "/import/batch", body: ["items"], errors: ["invalid", "import_limit", "overloaded", "wikipedia_unavailable"], limit: { max: 60, minutes: 1 } },
    ],
  },
  {
    id: "catalogue",
    endpoints: [
      { key: "get-cards", method: "GET", path: "/cards", query: ["page", "q", "rarity", "show", "sort"], limit: { max: 60, minutes: 1 } },
      { key: "get-cards-rates", method: "GET", path: "/cards/rates", limit: { max: 30, minutes: 1 } },
      { key: "get-ranking", method: "GET", path: "/ranking", query: ["board"], limit: { max: 30, minutes: 1 } },
      { key: "get-achievements", method: "GET", path: "/achievements", limit: { max: 30, minutes: 1 } },
      { key: "post-achievements-claim", method: "POST", path: "/achievements/claim" },
      { key: "post-achievements-seen", method: "POST", path: "/achievements/seen", limit: { max: 30, minutes: 1 } },
    ],
  },
  {
    id: "marche",
    endpoints: [
      { key: "get-market", method: "GET", path: "/market", query: ["view", "q", "rarity", "sort", "page"], limit: { max: 90, minutes: 1 } },
      { key: "post-market", method: "POST", path: "/market", body: ["cardId", "startPrice", "hours"], errors: ["invalid", "card_locked", "too_many_listings"], limit: { max: 15, minutes: 1 } },
      { key: "get-market-id", method: "GET", path: "/market/{id}" },
      { key: "post-market-id-bid", method: "POST", path: "/market/{id}/bid", body: ["amount"], errors: ["invalid", "outbid", "insufficient_funds"] },
      { key: "post-market-id-cancel", method: "POST", path: "/market/{id}/cancel" },
      { key: "get-market-id-stats", method: "GET", path: "/market/{id}/stats" },
      { key: "get-market-stats", method: "GET", path: "/market/stats", query: ["rarity"] },
    ],
  },
  {
    id: "echanges",
    endpoints: [
      { key: "get-trades", method: "GET", path: "/trades", query: ["box"], limit: { max: 60, minutes: 1 } },
      { key: "post-trades", method: "POST", path: "/trades", body: ["recipientId", "offer", "request"], errors: ["invalid", "self_trade", "recipient_private", "not_available_mine", "not_available_theirs", "too_many_pending"] },
      { key: "post-trades-id-accept", method: "POST", path: "/trades/{id}/accept", errors: ["expired", "busy"] },
      { key: "post-trades-id-decline", method: "POST", path: "/trades/{id}/decline" },
      { key: "post-trades-id-cancel", method: "POST", path: "/trades/{id}/cancel" },
      { key: "get-friends", method: "GET", path: "/friends", limit: { max: 60, minutes: 1 } },
      { key: "post-friends", method: "POST", path: "/friends", body: ["userId"], errors: ["invalid", "self_friend", "player_not_found", "already_requested", "too_many_friends"] },
      { key: "post-friends-id-accept", method: "POST", path: "/friends/{id}/accept" },
      { key: "delete-friends-id", method: "DELETE", path: "/friends/{id}" },
      { key: "get-messages", method: "GET", path: "/messages", limit: { max: 120, minutes: 1 } },
      { key: "get-messages-userid", method: "GET", path: "/messages/{userId}" },
      { key: "post-messages-userid", method: "POST", path: "/messages/{userId}", body: ["body"], errors: ["invalid_message", "not_friends"] },
      { key: "post-messages-report", method: "POST", path: "/messages/report", body: ["messageId"], errors: ["already_reported", "not_found"] },
    ],
  },
  {
    id: "joueurs",
    endpoints: [
      { key: "get-players", method: "GET", path: "/players", query: ["q", "by"], limit: { max: 40, minutes: 1 } },
      { key: "get-players-id", method: "GET", path: "/players/{id}" },
      { key: "get-players-id-profile", method: "GET", path: "/players/{id}/profile" },
      { key: "get-players-id-cards", method: "GET", path: "/players/{id}/cards", query: ["page", "q"], errors: ["private", "not_found"] },
    ],
  },
  {
    id: "organisation",
    endpoints: [
      { key: "get-tags", method: "GET", path: "/tags", limit: { max: 60, minutes: 1 } },
      { key: "post-tags", method: "POST", path: "/tags", body: ["name", "color"], errors: ["invalid", "exists", "too_many"], limit: { max: 30, minutes: 1 } },
      { key: "patch-tags-id", method: "PATCH", path: "/tags/{id}", body: ["name", "color"] },
      { key: "delete-tags-id", method: "DELETE", path: "/tags/{id}" },
      { key: "get-albums", method: "GET", path: "/albums", query: ["card"], limit: { max: 60, minutes: 1 } },
      { key: "post-albums", method: "POST", path: "/albums", body: ["name", "parentId"], errors: ["invalid_name", "album_exists", "too_many_albums", "album_too_deep"] },
      { key: "get-albums-id", method: "GET", path: "/albums/{id}", query: ["scope", "q", "rarity", "page"] },
      { key: "patch-albums-id", method: "PATCH", path: "/albums/{id}", body: ["name", "parentId"], errors: ["invalid_name", "album_exists", "album_cycle", "album_too_deep"] },
      { key: "delete-albums-id", method: "DELETE", path: "/albums/{id}" },
      { key: "put-albums-id-cards", method: "PUT", path: "/albums/{id}/cards", body: ["add", "remove"], errors: ["invalid", "album_full", "not_owned"] },
      { key: "get-albums-id-candidates", method: "GET", path: "/albums/{id}/candidates" },
      { key: "get-wishlist", method: "GET", path: "/wishlist", limit: { max: 60, minutes: 1 } },
      { key: "get-wishlist-ids", method: "GET", path: "/wishlist/ids", limit: { max: 120, minutes: 1 } },
      { key: "post-wishlist", method: "POST", path: "/wishlist", body: ["cardId"], errors: ["invalid", "not_found", "wishlist_full"] },
      { key: "delete-wishlist-cardid", method: "DELETE", path: "/wishlist/{cardId}" },
    ],
  },
  {
    id: "guildes",
    endpoints: [
      { key: "get-guild", method: "GET", path: "/guild", limit: { max: 60, minutes: 1 } },
      { key: "get-guild-ranking", method: "GET", path: "/guild/ranking", limit: { max: 60, minutes: 1 } },
      { key: "get-guilds", method: "GET", path: "/guilds", query: ["q"], limit: { max: 60, minutes: 1 } },
      { key: "post-guilds", method: "POST", path: "/guilds", body: ["name", "description"], errors: ["invalid_guild_name", "guild_name_taken", "already_in_guild"], limit: { max: 5, minutes: 1 } },
      { key: "post-guilds-id-join", method: "POST", path: "/guilds/{id}/join", errors: ["already_in_guild", "not_found"] },
      { key: "post-guild-leave", method: "POST", path: "/guild/leave", limit: { max: 10, minutes: 1 } },
      { key: "delete-guild-members-userid", method: "DELETE", path: "/guild/members/{userId}", errors: ["forbidden"] },
      { key: "get-guild-wishes", method: "GET", path: "/guild/wishes", limit: { max: 60, minutes: 1 } },
      { key: "post-guild-wishes", method: "POST", path: "/guild/wishes", body: ["cardId"], errors: ["no_guild", "has_open_wish", "already_owned"] },
      { key: "delete-guild-wishes-id", method: "DELETE", path: "/guild/wishes/{id}" },
      { key: "post-guild-wishes-id-gift", method: "POST", path: "/guild/wishes/{id}/gift", errors: ["busy", "not_found"] },
    ],
  },
  {
    id: "bataille",
    endpoints: [
      { key: "get-battle-puzzle", method: "GET", path: "/battle/puzzle", limit: { max: 30, minutes: 1 } },
      { key: "post-battle-games", method: "POST", path: "/battle/games", body: ["start", "target", "path", "clicks", "timeSeconds", "won"], limit: { max: 30, minutes: 1 } },
      { key: "get-battle-games", method: "GET", path: "/battle/games", limit: { max: 60, minutes: 1 } },
      { key: "post-battle-rooms", method: "POST", path: "/battle/rooms" },
      { key: "get-battle-rooms-mine", method: "GET", path: "/battle/rooms/mine", limit: { max: 60, minutes: 1 } },
      { key: "get-battle-rooms-code", method: "GET", path: "/battle/rooms/{code}" },
      { key: "post-battle-rooms-code", method: "POST", path: "/battle/rooms/{code}", body: ["action"], errors: ["invalid", "not_found", "busy"] },
      { key: "get-battle-rooms-code-stream", method: "GET", path: "/battle/rooms/{code}/stream", errors: ["not_member", "too_many_streams"], limit: { max: 20, minutes: 1 } },
    ],
  },
];

export const STAFF_DOCS: DocSection[] = [
  {
    id: "tableau",
    endpoints: [
      { key: "get-staff-overview", method: "GET", path: "/staff/overview", limit: { max: 60, minutes: 1 } },
      { key: "get-staff-alerts", method: "GET", path: "/staff/alerts", limit: { max: 60, minutes: 1 } },
      { key: "get-staff-audit", method: "GET", path: "/staff/audit", limit: { max: 60, minutes: 1 } },
    ],
  },
  {
    id: "membres",
    endpoints: [
      { key: "get-staff-users", method: "GET", path: "/staff/users", query: ["q", "filter", "page"], limit: { max: 120, minutes: 1 } },
      { key: "get-staff-users-id", method: "GET", path: "/staff/users/{id}" },
      { key: "post-staff-users-id", method: "POST", path: "/staff/users/{id}", body: ["action"], errors: ["invalid", "not_found", "forbidden"] },
      { key: "get-staff-deleted", method: "GET", path: "/staff/deleted", limit: { max: 60, minutes: 1 } },
    ],
  },
  {
    id: "moderation",
    endpoints: [
      { key: "get-staff-reports", method: "GET", path: "/staff/reports", query: ["status", "page"] },
      { key: "post-staff-reports-id", method: "POST", path: "/staff/reports/{id}", body: ["action"], errors: ["invalid", "not_found", "already_resolved"] },
      { key: "get-staff-bug-reports", method: "GET", path: "/staff/bug-reports", query: ["status", "page"] },
      { key: "post-staff-bug-reports-id", method: "POST", path: "/staff/bug-reports/{id}", body: ["action"], errors: ["invalid", "not_found", "already_resolved"] },
    ],
  },
  {
    id: "marche",
    endpoints: [
      { key: "get-staff-auctions", method: "GET", path: "/staff/auctions", query: ["q", "status", "page"] },
      { key: "post-staff-auctions-id", method: "POST", path: "/staff/auctions/{id}", body: ["reason"], errors: ["invalid_reason", "not_found"] },
      { key: "get-staff-guilds", method: "GET", path: "/staff/guilds", query: ["q", "page"], limit: { max: 120, minutes: 1 } },
      { key: "get-staff-guilds-id", method: "GET", path: "/staff/guilds/{id}" },
      { key: "post-staff-guilds-id", method: "POST", path: "/staff/guilds/{id}", body: ["action"], errors: ["not_found"] },
    ],
  },
];
