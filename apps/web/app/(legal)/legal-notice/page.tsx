import type { Metadata } from "next";
import Link from "next/link";
import { Fill, LegalHeader, Section } from "@/components/legal/legal-page";
import { LEGAL } from "@/lib/legal";

export const metadata: Metadata = { title: "Mentions légales — Wikideck" };

export default function LegalNoticePage() {
  const { publisher, host } = LEGAL;
  return (
    <>
      <LegalHeader
        title="Mentions légales"
        intro="Informations légales relatives au site Wikideck, conformément à l’article 6 de la loi n° 2004-575 du 21 juin 2004 pour la confiance dans l’économie numérique (LCEN)."
      />

      <Section title="Éditeur du site">
        <p>
          Le site <strong>{LEGAL.siteName}</strong> ({LEGAL.siteUrl}) est édité par :
        </p>
        <ul>
          <li>
            <strong>Nom :</strong> {publisher.name}
          </li>
          <li>
            <strong>Statut :</strong> {publisher.status}
          </li>
          <li>
            <strong>Adresse :</strong> <Fill value={publisher.address} />
          </li>
          <li>
            <strong>Contact :</strong> <Fill value={publisher.email} />
          </li>
        </ul>
        <p>
          <strong>Directeur de la publication :</strong> {publisher.director}.
        </p>
      </Section>

      <Section title="Hébergeur">
        <ul>
          <li>
            <strong>Nom :</strong> <Fill value={host.name} />
          </li>
          <li>
            <strong>Adresse :</strong> <Fill value={host.address} />
          </li>
          <li>
            <strong>Téléphone :</strong> <Fill value={host.phone} />
          </li>
          <li>
            <strong>Site :</strong>{" "}
            <a href={host.website} target="_blank" rel="noreferrer">
              {host.website.replace("https://", "")}
            </a>
          </li>
        </ul>
      </Section>

      <Section title="Propriété intellectuelle">
        <p>
          Le code, la charte graphique, le logo et les textes propres à Wikideck sont la propriété
          de l’éditeur. Toute reproduction non autorisée est interdite.
        </p>
        <p>
          <strong>Contenu des cartes.</strong> Chaque carte est tirée d’un article de Wikipédia en
          français. Le texte des articles est publié sous licence{" "}
          <a
            href="https://creativecommons.org/licenses/by-sa/4.0/deed.fr"
            target="_blank"
            rel="noreferrer"
          >
            Creative Commons Attribution – Partage dans les mêmes conditions 4.0
          </a>{" "}
          (CC BY-SA 4.0). Les auteurs sont crédités dans l’historique de chaque article, accessible
          depuis le lien « Voir l’article sur Wikipédia » de la fiche de chaque carte. Les extraits
          affichés peuvent avoir été abrégés.
        </p>
        <p>
          <strong>Images.</strong> Les images proviennent de Wikimedia Commons ou de Wikipédia et
          restent soumises à leur licence propre, indiquée sur leur page de description. Elles sont
          chargées directement depuis les serveurs de la Wikimedia Foundation.
        </p>
        <p>
          « Wikipédia » et « Wikimedia » sont des marques de la Wikimedia Foundation. Wikideck est
          un projet indépendant, <strong>non affilié</strong> à la Wikimedia Foundation ni à
          Discord.
        </p>
      </Section>

      <Section title="Données personnelles">
        <p>
          Le traitement des données personnelles est décrit dans la{" "}
          <Link href="/privacy">politique de confidentialité</Link>. Les règles d’utilisation du
          service figurent dans les <Link href="/terms">conditions générales d’utilisation</Link>.
        </p>
      </Section>

      <Section title="Signaler un contenu">
        <p>
          Les cartes reprennent le contenu de Wikipédia, qui peut comporter des sujets sensibles.
          Pour signaler un contenu manifestement illicite (pseudonyme, nom de guilde, message), ou
          exercer vos droits, écrivez à <Fill value={publisher.email} />. Pour corriger le contenu
          d’un article, rendez-vous sur Wikipédia.
        </p>
      </Section>

      <Section title="Responsabilité">
        <p>
          L’éditeur s’efforce d’assurer l’exactitude et la disponibilité du site mais ne peut
          garantir l’absence d’erreur ou d’interruption. Les informations des cartes (vues, langues,
          longueur d’article) sont issues de Wikipédia à une date donnée et peuvent différer de
          l’état actuel de l’article. Les sites externes vers lesquels Wikideck renvoie ne sont pas
          sous son contrôle.
        </p>
      </Section>
    </>
  );
}
