import { ApiReference } from "@/components/docs/api-reference";
import { API_URL } from "@/lib/api";
import { USER_DOCS } from "@/lib/api-docs";

export const metadata = { title: "API — Wikideck" };

const code = "rounded bg-foreground/10 px-1.5 py-0.5 text-xs";

export default function DocsPage() {
  return (
    <>
      <h1 className="font-display text-5xl font-medium">API Wikideck</h1>
      <p className="prose-serif mt-3 text-pale-mist">
        Les routes utilisées par le site, décrites pour que tu saches ce qu&apos;elles font et ce
        qu&apos;elles renvoient.
      </p>

      <div
        role="note"
        className="mt-6 rounded-xl border border-warning/40 bg-warning/10 p-4 text-sm"
      >
        <p className="font-semibold">Pas encore d&apos;accès pour les bots</p>
        <p className="mt-1 text-pale-mist">
          Toutes les routes de données demandent une session ouverte via Discord dans un navigateur.
          Il n&apos;existe pas encore de clé d&apos;API : un bot Discord ne peut donc pas s&apos;en
          servir pour l&apos;instant. Seules <code className={code}>/health</code> et la racine de
          l&apos;API sont ouvertes sans connexion.
        </p>
      </div>

      <section className="mt-10">
        <h2 className="font-display text-3xl font-medium">Principes</h2>
        <dl className="mt-4 flex flex-col gap-4 text-sm">
          <div>
            <dt className="font-semibold">Adresse de base</dt>
            <dd className="mt-1 text-pale-mist">
              <code className={code}>{API_URL}</code>. Le préfixe <code className={code}>/v1</code>{" "}
              est la version ; la réponse indique <code className={code}>X-Api-Version</code>.
            </dd>
          </div>
          <div>
            <dt className="font-semibold">Authentification</dt>
            <dd className="mt-1 text-pale-mist">
              Cookie <code className={code}>wikideck_session</code>, posé après la connexion
              Discord. Il est <code className={code}>HttpOnly</code> et valable 30 jours. Les
              requêtes depuis un navigateur doivent envoyer les cookies (
              <code className={code}>credentials: &quot;include&quot;</code>) et ne sont acceptées
              que depuis le site officiel. Ne partage jamais ce cookie : il donne accès à ton
              compte.
            </dd>
          </div>
          <div>
            <dt className="font-semibold">Format</dt>
            <dd className="mt-1 text-pale-mist">
              JSON en entrée et en sortie. Les identifiants sont des UUID, les dates sont au format
              ISO 8601. Les listes sont paginées avec <code className={code}>page</code>.
            </dd>
          </div>
          <div>
            <dt className="font-semibold">Erreurs</dt>
            <dd className="mt-1 text-pale-mist">
              Un code HTTP et un corps <code className={code}>{`{ "error": "code" }`}</code>.{" "}
              <code className={code}>401</code> : non connecté ; <code className={code}>400</code> :
              requête invalide ; <code className={code}>404</code> : introuvable ;{" "}
              <code className={code}>409</code> : conflit d&apos;état ;{" "}
              <code className={code}>429</code> : trop de requêtes.
            </dd>
          </div>
          <div>
            <dt className="font-semibold">Limites de débit</dt>
            <dd className="mt-1 text-pale-mist">
              Chaque route a une limite par minute (indiquée à droite de chaque route). Les en-têtes{" "}
              <code className={code}>RateLimit-Limit</code>,{" "}
              <code className={code}>RateLimit-Remaining</code> et{" "}
              <code className={code}>RateLimit-Reset</code> disent où tu en es. Au-delà, la réponse
              est <code className={code}>429 rate_limited</code> avec{" "}
              <code className={code}>retryAfter</code> en secondes.
            </dd>
          </div>
          <div>
            <dt className="font-semibold">Raretés</dt>
            <dd className="mt-1 text-pale-mist">
              C commune, PC peu commune, R rare, SR super rare, UR ultra rare, L légendaire, M
              mythique.
            </dd>
          </div>
        </dl>
      </section>

      <section className="mt-10">
        <h2 className="font-display text-3xl font-medium">Santé du service</h2>
        <ul className="mt-4">
          <li className="rounded-xl border border-line bg-surface p-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-md bg-success/15 px-2 py-0.5 text-xs font-bold text-success">
                GET
              </span>
              <code className="text-sm font-semibold">/health</code>
              <span className="ml-auto text-xs text-fog">sans connexion</span>
            </div>
            <p className="mt-2 text-sm text-pale-mist">
              État du service, version de l&apos;API et charge. Avec la racine de l&apos;API,
              c&apos;est la seule route publique.
            </p>
          </li>
        </ul>
      </section>

      <ApiReference sections={USER_DOCS} />
    </>
  );
}
