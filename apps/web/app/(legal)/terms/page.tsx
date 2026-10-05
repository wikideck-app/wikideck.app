import type { Metadata } from "next";
import Link from "next/link";
import {
  MARKET_FEE_PERCENT,
  PACK_MAX,
  PACK_REGEN_MS,
  PACK_SIZE,
  WIKIBITS_START,
} from "@wikideck/shared";
import { Fill, LegalHeader, Section } from "@/components/legal/legal-page";
import { LEGAL } from "@/lib/legal";

export const metadata: Metadata = { title: "Conditions générales d’utilisation — Wikideck" };

export default function TermsPage() {
  return (
    <>
      <LegalHeader
        title="Conditions générales d’utilisation"
        intro="Ces conditions encadrent l’utilisation de Wikideck. En vous connectant, vous confirmez les avoir lues et les accepter."
      />

      <Section title="1. Objet">
        <p>
          Wikideck est un jeu gratuit de collection de cartes : chaque carte est générée à partir
          d’un article de Wikipédia en français. Les joueurs ouvrent des paquets, constituent une
          collection, l’échangent, la vendent aux enchères, forment des guildes et discutent entre
          amis.
        </p>
      </Section>

      <Section title="2. Compte">
        <ul>
          <li>
            Le service est réservé aux personnes de <strong>18 ans ou plus</strong>.
          </li>
          <li>
            Le compte se crée en se connectant avec Discord. Il est personnel : un seul compte par
            personne, non cessible. Vous êtes responsable de l’usage qui en est fait ; ne confiez
            pas l’accès à votre compte Discord.
          </li>
          <li>
            Votre pseudonyme et le nom de votre guilde ne doivent pas être illicites, diffamatoires,
            injurieux, haineux, ni usurper l’identité d’un tiers.
          </li>
          <li>
            Vous pouvez supprimer votre compte à tout moment dans <strong>Paramètres</strong>. Les
            données sont alors effacées (voir la{" "}
            <Link href="/privacy">politique de confidentialité</Link>). Les enchères en cours
            doivent d’abord être terminées.
          </li>
        </ul>
      </Section>

      <Section title="3. Règles du jeu">
        <ul>
          <li>
            Vous recevez au maximum {PACK_MAX} paquets ; un paquet de {PACK_SIZE} cartes se régénère
            toutes les {PACK_REGEN_MS / 60_000} minutes. La rareté d’une carte dépend du nombre de
            vues mensuelles de l’article sur Wikipédia, et le tirage est aléatoire.
          </li>
          <li>
            Chaque joueur démarre avec {WIKIBITS_START} wikibits et en gagne en vendant des cartes,
            en réussissant des succès ou grâce aux récompenses hebdomadaires des guildes.
          </li>
          <li>
            Les règles (limites, récompenses, taux, frais, catalogue) peuvent évoluer pour
            équilibrer ou améliorer le jeu.
          </li>
        </ul>
      </Section>

      <Section title="4. Wikibits et cartes : aucune valeur réelle">
        <p>
          Les <strong>wikibits</strong> sont une monnaie <strong>purement virtuelle</strong>, propre
          au jeu. Ils s’obtiennent uniquement en jouant, ne s’achètent pas avec de l’argent, ne sont
          pas convertibles en argent ou en tout autre bien, ne sont pas remboursables et n’ont
          aucune valeur en dehors de Wikideck. Il en va de même des cartes. Leur vente ou leur
          échange contre de l’argent réel, en dehors du jeu, est interdit.
        </p>
      </Section>

      <Section title="5. Échanges et enchères">
        <ul>
          <li>
            Un échange accepté et une enchère terminée sont <strong>définitifs</strong> : ils ne
            peuvent être annulés.
          </li>
          <li>
            Une carte mise aux enchères est mise de côté jusqu’à la fin de la vente. Les mises sont
            débitées immédiatement et remboursées si vous êtes surenchéri. Une mise dans les
            dernières secondes prolonge l’enchère.
          </li>
          <li>Le vendeur reçoit le prix final moins {MARKET_FEE_PERCENT} % de frais de vente.</li>
          <li>
            Il est interdit de manipuler les prix, de s’échanger des cartes entre comptes que vous
            contrôlez pour fausser un classement ou un succès, ou d’exploiter une faille.
          </li>
        </ul>
      </Section>

      <Section title="6. Comportement attendu">
        <p>Vous vous engagez à ne pas :</p>
        <ul>
          <li>
            harceler, menacer ou insulter d’autres joueurs, dans les messages comme ailleurs ;
          </li>
          <li>
            diffuser de contenu illicite, haineux, pornographique ou portant atteinte aux droits
            d’autrui ;
          </li>
          <li>
            utiliser de robot, de script ou toute méthode automatisée pour jouer, contourner les
            limites ou surcharger le service ;
          </li>
          <li>créer plusieurs comptes pour contourner une limite ou une sanction ;</li>
          <li>chercher à accéder aux données d’autres joueurs ou à perturber le service.</li>
        </ul>
      </Section>

      <Section title="7. Contenu de Wikipédia">
        <p>
          Les cartes reprennent des articles de Wikipédia, qui traitent de tous sujets, y compris
          sensibles ou susceptibles de heurter. Ce contenu n’est pas rédigé par l’éditeur de
          Wikideck. Le texte est sous licence CC BY-SA 4.0 et les images sous leur licence propre :
          voir les <Link href="/legal-notice">mentions légales</Link>.
        </p>
      </Section>

      <Section title="8. Sanctions">
        <p>
          En cas de non-respect de ces conditions, l’éditeur peut, selon la gravité, avertir le
          joueur, retirer des cartes ou des wikibits obtenus de manière irrégulière, suspendre ou
          supprimer son compte, sans préavis ni indemnité.
        </p>
      </Section>

      <Section title="9. Disponibilité et responsabilité">
        <p>
          Le service est fourni <strong>« en l’état »</strong>, gratuitement, sans garantie de
          disponibilité continue. Il peut être interrompu pour maintenance ou évolution, et des
          erreurs ou pertes de données de jeu, sans valeur réelle, peuvent survenir malgré nos
          efforts. Dans les limites permises par la loi, l’éditeur n’est pas responsable des
          dommages indirects liés à l’utilisation du service. Ces limitations ne s’appliquent pas
          aux droits que la loi ne permet pas d’écarter.
        </p>
      </Section>

      <Section title="10. Propriété intellectuelle">
        <p>
          Le code, le design, le logo et les textes propres à Wikideck sont protégés. Vous disposez
          d’un droit d’usage personnel du service. Les messages que vous écrivez restent les vôtres
          ; vous garantissez disposer des droits nécessaires sur ce que vous diffusez.
        </p>
      </Section>

      <Section title="11. Modification des conditions">
        <p>
          Ces conditions peuvent être modifiées. La version en vigueur est celle publiée sur cette
          page, avec sa date de mise à jour. Continuer à utiliser le service après une modification
          vaut acceptation ; en cas de désaccord, vous pouvez supprimer votre compte.
        </p>
      </Section>

      <Section title="12. Droit applicable et contact">
        <p>
          Ces conditions sont régies par le droit français. En cas de litige, une solution amiable
          sera recherchée avant toute action ; à défaut, les tribunaux français sont compétents,
          sous réserve des règles impératives de protection du consommateur. Contact :{" "}
          <Fill value={LEGAL.publisher.email} />.
        </p>
      </Section>
    </>
  );
}
