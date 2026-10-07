export type Method = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export type Field = [name: string, description: string];

export type Endpoint = {
  method: Method;
  path: string;
  summary: string;
  query?: Field[];
  body?: Field[];
  returns?: string;
  errors?: string[];
  limit?: string;
};

export type DocSection = {
  id: string;
  title: string;
  intro?: string;
  endpoints: Endpoint[];
};

const RARITY_CODES = "C, PC, R, SR, UR, L, M (séparés par des virgules)";

export const USER_DOCS: DocSection[] = [
  {
    id: "compte",
    title: "Compte et session",
    intro:
      "La connexion se fait par Discord, dans un navigateur. Le serveur pose alors le cookie de session.",
    endpoints: [
      {
        method: "GET",
        path: "/auth/discord",
        summary: "Redirige vers Discord pour se connecter.",
      },
      {
        method: "POST",
        path: "/auth/logout",
        summary: "Ferme la session en cours.",
        limit: "20 / min",
      },
      {
        method: "GET",
        path: "/auth/me",
        summary:
          "Utilisateur connecté (null sinon) : pseudo, avatar, solde de wikibits, compteurs de notifications, réglages, rôle staff. Verse aussi le bonus quotidien de 10 wikibits à la première requête de la journée.",
        returns: "{ user: SessionUser | null }",
        limit: "120 / min",
      },
      {
        method: "GET",
        path: "/me",
        summary:
          "Profil du compte : pseudo, nom Discord, visibilité, carte en vitrine, cartes en vedette.",
        limit: "60 / min",
      },
      {
        method: "PATCH",
        path: "/me",
        summary: "Modifie le profil. Tous les champs sont facultatifs.",
        body: [
          ["username", "nouveau pseudo"],
          ["isPublic", "profil public ou privé"],
          ["showcaseCardId", "carte en vitrine (une carte possédée), ou null"],
          ["featuredCardIds", "cartes en vedette (identifiants de cartes possédées)"],
        ],
        errors: ["invalid_username", "username_taken", "not_owned"],
        limit: "20 / min",
      },
      {
        method: "DELETE",
        path: "/me",
        summary:
          "Supprime définitivement le compte et ses données. Impossible tant que des enchères sont actives.",
        body: [["confirm", "ton pseudo, pour confirmer"]],
        errors: ["confirmation_required", "active_auctions"],
        limit: "3 / min",
      },
      {
        method: "PUT",
        path: "/me/settings",
        summary:
          "Enregistre les réglages (thème, audio, animations, tri par défaut, notifications).",
        body: [["settings", "objet de réglages complet"]],
        limit: "120 / min",
      },
      {
        method: "GET",
        path: "/me/export",
        summary: "Export de toutes les données du compte (droit d'accès RGPD).",
        limit: "5 / min",
      },
      {
        method: "GET",
        path: "/me/pulls",
        summary: "Historique des ouvertures de paquets, regroupées par ouverture.",
        limit: "30 / min",
      },
      {
        method: "POST",
        path: "/bug-reports",
        summary: "Envoie un rapport de bug à l'équipe.",
        body: [
          ["message", "description, de 10 à 2 000 caractères"],
          ["page", "chemin de la page concernée (facultatif)"],
        ],
        errors: ["invalid", "too_many_reports"],
        limit: "5 / 10 min",
      },
    ],
  },
  {
    id: "paquets",
    title: "Paquets et roue",
    endpoints: [
      {
        method: "GET",
        path: "/packs",
        summary:
          "Nombre de paquets disponibles, maximum, délai avant le prochain et stock de boosters de chance.",
        returns: "{ packs, max, nextInMs, boosts }",
        limit: "60 / min",
      },
      {
        method: "POST",
        path: "/packs/open",
        summary:
          "Ouvre un paquet de 5 cartes. Les cartes sont ajoutées à la collection et renvoyées avec leur nouveauté et leur quantité.",
        body: [["boost", "true pour utiliser un booster de chance (facultatif)"]],
        returns: "{ packs, max, nextInMs, boosts, cards, godpack? }",
        errors: ["no_packs", "busy", "no_boost", "overloaded", "wikipedia_unavailable"],
        limit: "6 / min",
      },
      {
        method: "GET",
        path: "/wheel",
        summary: "Dit si la roue de la fortune peut être tournée aujourd'hui.",
        returns: "{ canSpin }",
        limit: "60 / min",
      },
      {
        method: "POST",
        path: "/wheel/spin",
        summary: "Tourne la roue (un tour par jour, heure de Paris) et verse le gain.",
        returns: "{ index, prize, wikibits, packs, dropBoosts }",
        errors: ["already_spun"],
        limit: "10 / min",
      },
    ],
  },
  {
    id: "collection",
    title: "Collection",
    endpoints: [
      {
        method: "GET",
        path: "/collection",
        summary: "Cartes possédées, paginées (56 par page).",
        query: [
          ["page", "numéro de page"],
          ["q", "recherche : chaque mot doit apparaître dans le titre ou le sous-titre"],
          ["rarity", `raretés : ${RARITY_CODES}`],
          ["sort", "recent, oldest, rarity_desc, rarity_asc, alpha"],
          ["tag", "identifiant d'étiquette"],
          ["fav", "1 pour les favorites seulement"],
        ],
        limit: "60 / min",
      },
      {
        method: "GET",
        path: "/collection/locks",
        summary:
          "Cartes protégées (favorites, en vitrine, en vente, dans un échange) avec la raison.",
        limit: "120 / min",
      },
      {
        method: "GET",
        path: "/collection/duplicates",
        summary: "Doublons recyclables, par rareté, avec les wikibits obtenus.",
      },
      {
        method: "PUT",
        path: "/collection/{cardId}/favorite",
        summary: "Ajoute ou retire une carte des favorites.",
        body: [["favorite", "true ou false"]],
        returns: "{ favorite }",
        limit: "120 / min",
      },
      {
        method: "PUT",
        path: "/collection/{cardId}/tags",
        summary: "Remplace les étiquettes d'une carte.",
        body: [["tagIds", "identifiants d'étiquettes"]],
      },
      {
        method: "POST",
        path: "/collection/bulk-preview",
        summary: "Aperçu d'un recyclage en masse : nombre de cartes, gain, raisons de protection.",
        body: [
          ["maxViews", "vues mensuelles maximum"],
          ["rarities", "raretés visées (facultatif)"],
          ["cardIds", "limiter à ces cartes (facultatif)"],
          ["list", "true pour renvoyer aussi la liste (facultatif)"],
        ],
      },
      {
        method: "POST",
        path: "/collection/recycle",
        summary: "Recycle des cartes contre des wikibits. Un seul mode par requête.",
        body: [
          ["cards", "[{ cardId, quantity }] : cartes précises"],
          ["duplicates", "raretés dont on recycle les doublons"],
          ["bulk", "{ maxViews, rarities, cardIds?, excludeIds? } : recyclage en masse"],
        ],
        errors: ["invalid", "card_locked", "nothing_to_recycle", "not_owned"],
      },
      {
        method: "POST",
        path: "/import/batch",
        summary:
          "Importe un lot (20 maximum) de cartes depuis une autre collection. Plafond : 50 000 cartes différentes par compte.",
        body: [["items", "[{ title, lang, quantity }]"]],
        errors: ["invalid", "import_limit", "overloaded", "wikipedia_unavailable"],
        limit: "60 / min",
      },
    ],
  },
  {
    id: "catalogue",
    title: "Catalogue et classement",
    endpoints: [
      {
        method: "GET",
        path: "/cards",
        summary: "Toutes les cartes du catalogue, avec ce que tu possèdes.",
        query: [
          ["page", "numéro de page"],
          ["q", "recherche (mots de 3 lettres minimum)"],
          ["rarity", `raretés : ${RARITY_CODES}`],
          ["show", "all, mine (possédées), missing (manquantes), drawn (déjà tirées)"],
          ["sort", "rarity_desc, rarity_asc, alpha"],
        ],
        limit: "60 / min",
      },
      {
        method: "GET",
        path: "/cards/rates",
        summary: "Taux de tirage de chaque rareté, par carte et par paquet.",
        limit: "30 / min",
      },
      {
        method: "GET",
        path: "/ranking",
        summary: "Classement des joueurs (50 premiers).",
        query: [["board", "collection, points ou battle"]],
        limit: "30 / min",
      },
      {
        method: "GET",
        path: "/achievements",
        summary: "Succès, progression et récompenses à récupérer.",
        limit: "30 / min",
      },
      {
        method: "POST",
        path: "/achievements/claim",
        summary: "Récupère les récompenses des succès terminés.",
      },
      {
        method: "POST",
        path: "/achievements/seen",
        summary: "Marque les nouveaux succès comme vus.",
        limit: "30 / min",
      },
    ],
  },
  {
    id: "marche",
    title: "Marché",
    intro:
      "Enchères entre joueurs. Les wikibits sont réservés à l'enchère, une commission de 5 % est prélevée sur la vente.",
    endpoints: [
      {
        method: "GET",
        path: "/market",
        summary: "Enchères du marché, 24 par page.",
        query: [
          ["view", "all, selling (mes ventes), bidding (mes enchères)"],
          ["q", "recherche sur le titre"],
          ["rarity", `raretés : ${RARITY_CODES}`],
          ["sort", "ending, new, price_asc, price_desc"],
          ["page", "numéro de page"],
        ],
        limit: "90 / min",
      },
      {
        method: "POST",
        path: "/market",
        summary: "Met une carte en vente (10 ventes actives au maximum).",
        body: [
          ["cardId", "carte à vendre"],
          ["startPrice", "prix de départ, de 1 à 1 000 000"],
          ["hours", "durée : 1, 6, 12, 24 ou 48"],
        ],
        errors: ["invalid", "card_locked", "too_many_listings"],
        limit: "15 / min",
      },
      {
        method: "GET",
        path: "/market/{id}",
        summary: "Détail d'une enchère et historique des offres.",
      },
      {
        method: "POST",
        path: "/market/{id}/bid",
        summary: "Place une offre.",
        body: [["amount", "montant en wikibits"]],
        errors: ["invalid", "outbid", "insufficient_funds"],
      },
      {
        method: "POST",
        path: "/market/{id}/cancel",
        summary: "Annule une de tes enchères (sans offre).",
      },
      {
        method: "GET",
        path: "/market/{id}/stats",
        summary: "Prix des ventes passées de la même carte.",
      },
      {
        method: "GET",
        path: "/market/stats",
        summary: "Prix des ventes récentes, éventuellement pour une rareté.",
        query: [["rarity", "code de rareté"]],
      },
    ],
  },
  {
    id: "echanges",
    title: "Échanges, amis et messages",
    endpoints: [
      {
        method: "GET",
        path: "/trades",
        summary: "Tes échanges, reçus ou envoyés.",
        query: [["box", "incoming (reçus), outgoing (envoyés) ou history (historique)"]],
        limit: "60 / min",
      },
      {
        method: "POST",
        path: "/trades",
        summary: "Propose un échange (10 cartes par côté, 10 propositions en attente).",
        body: [
          ["recipientId", "joueur destinataire"],
          ["offer", "[{ cardId, quantity }] : ce que tu donnes"],
          ["request", "[{ cardId, quantity }] : ce que tu demandes"],
        ],
        errors: [
          "invalid",
          "self_trade",
          "recipient_private",
          "not_available_mine",
          "not_available_theirs",
          "too_many_pending",
        ],
      },
      {
        method: "POST",
        path: "/trades/{id}/accept",
        summary: "Accepte un échange reçu.",
        errors: ["expired", "busy"],
      },
      { method: "POST", path: "/trades/{id}/decline", summary: "Refuse un échange reçu." },
      {
        method: "POST",
        path: "/trades/{id}/cancel",
        summary: "Annule un échange que tu as proposé.",
      },
      {
        method: "GET",
        path: "/friends",
        summary: "Amis, demandes reçues et envoyées.",
        limit: "60 / min",
      },
      {
        method: "POST",
        path: "/friends",
        summary: "Envoie une demande d'ami.",
        body: [["userId", "joueur visé (récupéré via /players)"]],
        errors: [
          "invalid",
          "self_friend",
          "player_not_found",
          "already_requested",
          "too_many_friends",
        ],
      },
      { method: "POST", path: "/friends/{id}/accept", summary: "Accepte une demande d'ami." },
      { method: "DELETE", path: "/friends/{id}", summary: "Retire un ami ou annule une demande." },
      { method: "GET", path: "/messages", summary: "Liste des conversations.", limit: "120 / min" },
      {
        method: "GET",
        path: "/messages/{userId}",
        summary: "Fil de discussion avec un ami (le marque comme lu).",
      },
      {
        method: "POST",
        path: "/messages/{userId}",
        summary: "Envoie un message à un ami (1 000 caractères au maximum).",
        body: [["body", "texte du message"]],
        errors: ["invalid_message", "not_friends"],
      },
      {
        method: "POST",
        path: "/messages/report",
        summary:
          "Signale un message reçu au staff, avec les cinq messages précédents comme contexte.",
        body: [["messageId", "message signalé"]],
        errors: ["already_reported", "not_found"],
      },
    ],
  },
  {
    id: "joueurs",
    title: "Joueurs et profils",
    endpoints: [
      {
        method: "GET",
        path: "/players",
        summary: "Recherche de joueurs (8 résultats, 2 caractères minimum).",
        query: [
          ["q", "pseudo, ou nom Discord exact avec by=discord"],
          ["by", "discord pour chercher par nom d'utilisateur Discord"],
        ],
        limit: "40 / min",
      },
      { method: "GET", path: "/players/{id}", summary: "Résumé d'un joueur et votre relation." },
      {
        method: "GET",
        path: "/players/{id}/profile",
        summary: "Profil public : statistiques, vitrine, cartes en vedette, envies.",
      },
      {
        method: "GET",
        path: "/players/{id}/cards",
        summary: "Collection d'un joueur dont le profil est public.",
        query: [
          ["page", "numéro de page"],
          ["q", "recherche"],
        ],
        errors: ["private", "not_found"],
      },
    ],
  },
  {
    id: "organisation",
    title: "Étiquettes, albums et envies",
    endpoints: [
      { method: "GET", path: "/tags", summary: "Tes étiquettes.", limit: "60 / min" },
      {
        method: "POST",
        path: "/tags",
        summary: "Crée une étiquette (30 au maximum).",
        body: [
          ["name", "nom, 24 caractères au maximum"],
          ["color", "couleur #rrggbb"],
        ],
        errors: ["invalid", "exists", "too_many"],
        limit: "30 / min",
      },
      {
        method: "PATCH",
        path: "/tags/{id}",
        summary: "Renomme ou recolore une étiquette.",
        body: [
          ["name", "nouveau nom (facultatif)"],
          ["color", "nouvelle couleur (facultatif)"],
        ],
      },
      { method: "DELETE", path: "/tags/{id}", summary: "Supprime une étiquette." },
      {
        method: "GET",
        path: "/albums",
        summary: "Tes albums (20 au maximum), avec des cartes mises en avant.",
        query: [
          ["card", "identifiant de carte, pour savoir dans quels albums elle est (facultatif)"],
        ],
        limit: "60 / min",
      },
      {
        method: "POST",
        path: "/albums",
        summary: "Crée un album.",
        body: [["name", "nom, 40 caractères au maximum"]],
        errors: ["invalid_name", "album_exists", "too_many_albums"],
      },
      { method: "GET", path: "/albums/{id}", summary: "Détail d'un album." },
      {
        method: "PATCH",
        path: "/albums/{id}",
        summary: "Renomme un album.",
        body: [["name", "nouveau nom"]],
      },
      {
        method: "DELETE",
        path: "/albums/{id}",
        summary: "Supprime un album (les cartes restent dans la collection).",
      },
      {
        method: "PUT",
        path: "/albums/{id}/cards",
        summary: "Ajoute ou retire des cartes (500 par album, 100 ajouts par requête).",
        body: [
          ["add", "identifiants de cartes à ajouter"],
          ["remove", "identifiants de cartes à retirer"],
        ],
        errors: ["invalid", "album_full", "not_owned"],
      },
      {
        method: "GET",
        path: "/albums/{id}/candidates",
        summary: "Cartes de ta collection qui ne sont pas encore dans l'album.",
      },
      {
        method: "GET",
        path: "/wishlist",
        summary: "Ta liste d'envies (3 cartes au maximum).",
        limit: "60 / min",
      },
      {
        method: "GET",
        path: "/wishlist/ids",
        summary: "Identifiants des cartes en envie, pour afficher les cœurs.",
        limit: "120 / min",
      },
      {
        method: "POST",
        path: "/wishlist",
        summary: "Ajoute une carte aux envies. Tu es notifié quand elle est mise en vente.",
        body: [["cardId", "carte souhaitée"]],
        errors: ["invalid", "not_found", "wishlist_full"],
      },
      { method: "DELETE", path: "/wishlist/{cardId}", summary: "Retire une carte des envies." },
    ],
  },
  {
    id: "guildes",
    title: "Guildes",
    endpoints: [
      {
        method: "GET",
        path: "/guild",
        summary: "Ta guilde : membres, points de la semaine, récompenses.",
        limit: "60 / min",
      },
      {
        method: "GET",
        path: "/guild/ranking",
        summary: "Classement des guildes (50 premières).",
        limit: "60 / min",
      },
      {
        method: "GET",
        path: "/guilds",
        summary: "Recherche de guildes.",
        query: [["q", "nom de guilde"]],
        limit: "60 / min",
      },
      {
        method: "POST",
        path: "/guilds",
        summary: "Crée une guilde (30 membres au maximum).",
        body: [
          ["name", "3 à 24 caractères"],
          ["description", "140 caractères au maximum (facultatif)"],
        ],
        errors: ["invalid_guild_name", "guild_name_taken", "already_in_guild"],
        limit: "5 / min",
      },
      {
        method: "POST",
        path: "/guilds/{id}/join",
        summary: "Rejoint une guilde.",
        errors: ["already_in_guild", "not_found"],
      },
      { method: "POST", path: "/guild/leave", summary: "Quitte ta guilde.", limit: "10 / min" },
      {
        method: "DELETE",
        path: "/guild/members/{userId}",
        summary: "Exclut un membre (propriétaire de la guilde).",
        errors: ["forbidden"],
      },
      {
        method: "GET",
        path: "/guild/wishes",
        summary: "Souhaits de cartes des membres de la guilde.",
        limit: "60 / min",
      },
      {
        method: "POST",
        path: "/guild/wishes",
        summary: "Publie un souhait de carte (un seul souhait ouvert à la fois).",
        body: [["cardId", "carte souhaitée"]],
        errors: ["no_guild", "has_open_wish", "already_owned"],
      },
      { method: "DELETE", path: "/guild/wishes/{id}", summary: "Retire ton souhait." },
      {
        method: "POST",
        path: "/guild/wishes/{id}/gift",
        summary: "Offre à un membre la carte qu'il souhaite.",
        errors: ["busy", "not_found"],
      },
    ],
  },
  {
    id: "bataille",
    title: "Bataille",
    endpoints: [
      {
        method: "GET",
        path: "/battle/puzzle",
        summary: "Tire un défi (article de départ et article cible).",
        limit: "30 / min",
      },
      {
        method: "POST",
        path: "/battle/games",
        summary: "Enregistre une partie solo terminée.",
        body: [
          ["start", "article de départ"],
          ["target", "article cible"],
          ["path", "articles parcourus"],
          ["clicks", "nombre de clics"],
          ["timeSeconds", "durée"],
          ["won", "partie gagnée ou non"],
        ],
        limit: "30 / min",
      },
      {
        method: "GET",
        path: "/battle/games",
        summary: "Historique et statistiques de tes parties.",
        limit: "60 / min",
      },
      { method: "POST", path: "/battle/rooms", summary: "Crée un salon multijoueur." },
      {
        method: "GET",
        path: "/battle/rooms/mine",
        summary: "Salon dans lequel tu es, le cas échéant.",
        limit: "60 / min",
      },
      { method: "GET", path: "/battle/rooms/{code}", summary: "État d'un salon." },
      {
        method: "POST",
        path: "/battle/rooms/{code}",
        summary: "Agit dans un salon.",
        body: [
          [
            "action",
            "join, leave, heartbeat, start, play, navigate, surrender, timeUp, nextRound, reset, settings",
          ],
        ],
        errors: ["invalid", "not_found", "busy"],
      },
      {
        method: "GET",
        path: "/battle/rooms/{code}/stream",
        summary:
          "Flux d'événements en direct (SSE) d'un salon. 3 flux simultanés au maximum par joueur.",
        errors: ["not_member", "too_many_streams"],
        limit: "20 / min",
      },
    ],
  },
];

export const STAFF_DOCS: DocSection[] = [
  {
    id: "tableau",
    title: "Tableau de bord",
    endpoints: [
      {
        method: "GET",
        path: "/staff/overview",
        summary: "Chiffres du site : membres, cartes, enchères, wikibits, activité.",
        limit: "60 / min",
      },
      {
        method: "GET",
        path: "/staff/alerts",
        summary: "Comptes suspects selon les indices d'abus des 30 derniers jours.",
        limit: "60 / min",
      },
      {
        method: "GET",
        path: "/staff/audit",
        summary: "Journal des actions du staff (qui, quoi, sur qui).",
        limit: "60 / min",
      },
    ],
  },
  {
    id: "membres",
    title: "Membres",
    endpoints: [
      {
        method: "GET",
        path: "/staff/users",
        summary: "Recherche de membres.",
        query: [
          ["q", "pseudo"],
          ["filter", "banned (bannis) ou staff (équipe) ; vide pour tous"],
          ["page", "numéro de page"],
        ],
        limit: "120 / min",
      },
      {
        method: "GET",
        path: "/staff/users/{id}",
        summary: "Fiche complète d'un membre : stats, niveau de confiance, indices d'abus.",
      },
      {
        method: "POST",
        path: "/staff/users/{id}",
        summary: "Agit sur un membre. Chaque action est consignée dans le journal.",
        body: [
          [
            "action",
            "ban { reason }, unban, rename { username }, setTrust { override }, clearSignals (modérateur sur un rang inférieur) ; wikibits { amount, reason }, packs { count }, setRole { role }, delete { confirm, reason } (administrateur)",
          ],
        ],
        errors: ["invalid", "not_found", "forbidden"],
      },
      {
        method: "GET",
        path: "/staff/deleted",
        summary: "Historique des comptes supprimés (par le staff ou par eux-mêmes).",
        limit: "60 / min",
      },
    ],
  },
  {
    id: "moderation",
    title: "Modération",
    endpoints: [
      {
        method: "GET",
        path: "/staff/reports",
        summary: "Messages signalés, avec le message et les cinq précédents.",
        query: [
          ["status", "all pour inclure les signalements traités"],
          ["page", "numéro de page"],
        ],
      },
      {
        method: "POST",
        path: "/staff/reports/{id}",
        summary: "Traite un signalement.",
        body: [["action", "dismiss (classer sans suite) ou deleteMessage"]],
        errors: ["invalid", "not_found", "already_resolved"],
      },
      {
        method: "GET",
        path: "/staff/bug-reports",
        summary: "Rapports de bug envoyés par les joueurs.",
        query: [
          ["status", "all pour inclure les rapports traités"],
          ["page", "numéro de page"],
        ],
      },
      {
        method: "POST",
        path: "/staff/bug-reports/{id}",
        summary: "Traite un rapport de bug.",
        body: [["action", "resolve ou dismiss"]],
        errors: ["invalid", "not_found", "already_resolved"],
      },
    ],
  },
  {
    id: "marche",
    title: "Marché et guildes",
    endpoints: [
      {
        method: "GET",
        path: "/staff/auctions",
        summary: "Toutes les enchères.",
        query: [
          ["q", "titre de carte ou pseudo"],
          ["status", "all pour inclure les enchères terminées"],
          ["page", "numéro de page"],
        ],
      },
      {
        method: "POST",
        path: "/staff/auctions/{id}",
        summary:
          "Annule une enchère : la carte revient au vendeur et l'offre au meilleur enchérisseur.",
        body: [["reason", "motif obligatoire"]],
        errors: ["invalid_reason", "not_found"],
      },
      {
        method: "GET",
        path: "/staff/guilds",
        summary: "Guildes.",
        query: [
          ["q", "nom de guilde"],
          ["page", "numéro de page"],
        ],
        limit: "120 / min",
      },
      {
        method: "GET",
        path: "/staff/guilds/{id}",
        summary: "Détail d'une guilde : membres et souhaits ouverts.",
      },
      {
        method: "POST",
        path: "/staff/guilds/{id}",
        summary: "Agit sur une guilde.",
        body: [
          ["action", "edit { name?, description? }, kick { userId }, dissolve { confirmName }"],
        ],
        errors: ["not_found"],
      },
    ],
  },
];
