# Internationalisation

Wikideck utilise [next-intl](https://next-intl.dev) **sans routage par langue** : une seule locale
est active (`fr`), les URL ne changent pas. Tout est prêt pour en ajouter d'autres.

```
i18n/config.ts            locales actives, locale par défaut, sens d'écriture (RTL), fuseau horaire
i18n/request.ts           résolution de la locale et chargement des messages (côté serveur)
i18n/formats.ts           formats nommés de dates et de nombres (format.dateTime(d, "long"))
i18n/client-messages.ts   espaces de noms envoyés au navigateur (le reste reste côté serveur)
i18n/metadata.ts          pageMetadata("collection") : titre SEO traduit
messages/fr/<espace>.json un fichier par fonctionnalité ; l'espace de noms est le nom du fichier
messages/fr/index.ts      assemble les fichiers (vérifié par `pnpm lint:i18n`)
global.d.ts               typage : t("collecton.title") ne compile pas
```

## Écrire un texte

```tsx
// Server Component (async) ou composant sans état : getTranslations / useTranslations
const t = await getTranslations("collection");
<h1>{t("title")}</h1>

// Client Component
const t = useTranslations("collection");
t("count", { count })        // "{count, plural, one {# carte} other {# cartes}}"
t.rich("importHint", { link: (chunks) => <Link href="/import">{chunks}</Link> })

// dates, nombres, devises : jamais de format écrit à la main
const format = useFormatter();
format.dateTime(date, "mediumTime");   // formats nommés dans i18n/formats.ts
format.number(1250);                   // « 1 250 »
format.number(5.99, { style: "currency", currency: "EUR" });
format.relativeTime(date, now);
```

Les messages sont du ICU MessageFormat : variables `{name}`, pluriels
`{count, plural, one {# carte} other {# cartes}}`, ordinaux `selectordinal`, balises `<b>…</b>`.
Utilisez l'apostrophe typographique (’) dans les textes : l'apostrophe droite est un caractère
d'échappement en ICU.

À ne pas traduire : noms de cartes, pseudos, identifiants, contenu Wikipédia.

### Textes pilotés par des données

- **Erreurs de l'API** : l'API renvoie un code (`bid_too_low`), le texte est dans `apiErrors.json`.
  `apiCall` / `apiFetch` (`lib/tags-api.ts`) le traduisent.
- **Catalogue partagé** (`@wikideck/shared`) : raretés (`cards.rarity.*`), tris, classements,
  succès (`achievements.items.<clé>`) sont traduits par identifiant ; les libellés français du
  paquet partagé ne servent qu'à l'API.
- **Documentation de l'API** : structure dans `lib/api-docs.ts`, textes dans `docs.json`.
- Le script du favori d'import reçoit ses textes déjà traduits (`importer.bookmarklet.*`).

## Ajouter une langue (ex. `en`)

1. `i18n/config.ts` : ajouter `"en"` à `locales` (RTL : `localeDirection` gère déjà ar, he, fa, ur).
2. Copier `messages/fr/` vers `messages/en/` et traduire (même arborescence, mêmes variables).
3. `i18n/request.ts` : remplacer `const locale = defaultLocale` par la résolution voulue (cookie,
   en-tête `Accept-Language`, préférence du compte…). Aucun composant ne change.
4. Option : sélecteur de langue, `hreflang`, URL préfixées (`createNextIntlPlugin` + `[locale]`)
   si le référencement par langue devient nécessaire.
5. `pnpm lint:i18n` vérifie que la nouvelle langue a les mêmes clés et variables que `fr`.

## Vérifications

```bash
pnpm lint:i18n          # clés inconnues, variables manquantes, ICU invalide, clés inutilisées,
                        # texte français oublié dans le JSX (// i18n-ignore pour tolérer un cas)
pnpm test               # tests i18n (traductions, pluriels, formats, composants, SEO, couverture)
pnpm --filter @wikideck/web exec tsc --noEmit   # clés typées
```
