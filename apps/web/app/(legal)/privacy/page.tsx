import type { Metadata } from "next";
import Link from "next/link";
import { Fill, LegalHeader, Section } from "@/components/legal/legal-page";
import { LEGAL } from "@/lib/legal";

export const metadata: Metadata = { title: "Politique de confidentialité — Wikideck" };

export default function PrivacyPage() {
  const { publisher } = LEGAL;
  return (
    <>
      <LegalHeader
        title="Politique de confidentialité"
        intro="Cette page explique quelles données personnelles Wikideck collecte, pourquoi, combien de temps elles sont conservées et comment exercer vos droits, conformément au Règlement général sur la protection des données (RGPD) et à la loi Informatique et Libertés."
      />

      <Section title="1. Responsable du traitement">
        <p>
          Le responsable du traitement est {publisher.name}, éditeur de Wikideck (voir les{" "}
          <Link href="/legal-notice">mentions légales</Link>). Contact pour toute question relative
          à vos données : <Fill value={publisher.email} />.
        </p>
      </Section>

      <Section title="2. Données collectées et finalités">
        <p>Wikideck ne collecte que ce qui est nécessaire pour faire fonctionner le jeu.</p>
        <ul>
          <li>
            <strong>Connexion avec Discord.</strong> À votre première connexion, Discord nous
            transmet votre <strong>identifiant Discord</strong>, votre{" "}
            <strong>nom d’utilisateur</strong> et votre <strong>avatar</strong> (autorisation «
            identify » uniquement : nous ne recevons ni votre adresse e-mail, ni vos serveurs, ni
            vos messages Discord). Finalité : créer et authentifier votre compte. Base légale :
            exécution du contrat (les CGU).
          </li>
          <li>
            <strong>Données de jeu.</strong> Votre collection de cartes, vos paquets et l’historique
            des tirages, vos étiquettes, votre carte vitrine, vos échanges, vos ventes et mises aux
            enchères, votre solde de wikibits, votre guilde, vos amis, vos succès, l’historique de
            vos parties de Bataille (articles de départ et d’arrivée, parcours, clics, temps) et vos
            préférences (animations, audio, notifications, affichage). Finalité : fournir le jeu.
            Base légale : exécution du contrat.
          </li>
          <li>
            <strong>Sécurité et lutte contre les comptes multiples.</strong> Un identifiant de
            navigateur aléatoire (cookie « wikideck_device », un an), jamais une empreinte de votre
            appareil ni votre adresse IP, permet de repérer plusieurs comptes sur un même
            navigateur. S’y ajoutent l’ancienneté de votre compte (celle du compte Discord se lit
            dans son identifiant) et quelques indices de jeu (échanges à sens unique d’un compte
            récent, manches répétées entre les mêmes joueurs). Ils composent un niveau de confiance
            qui peut suspendre les échanges, cadeaux, enchères et gains de wikibits d’un compte qui
            cumule plusieurs indices ; aucun compte n’est banni automatiquement. Les indices sont
            effacés après 90 jours. Finalité : protéger l’économie du jeu. Base légale : intérêt
            légitime.
          </li>
          <li>
            <strong>Signalement d’un message.</strong> Si vous signalez un message reçu, ce message
            et les cinq qui le précèdent dans la conversation sont copiés et transmis à l’équipe du
            site, seule situation où elle lit un message privé. Finalité : modérer la messagerie.
            Base légale : intérêt légitime. Ces copies sont supprimées avec votre compte.
          </li>
          <li>
            <strong>Messages privés.</strong> Le contenu des messages que vous échangez avec vos
            amis. Seuls vous et le destinataire y avez accès dans l’application. Finalité : fournir
            la messagerie. Base légale : exécution du contrat.
          </li>
          <li>
            <strong>Données techniques.</strong> Pour protéger le service contre les abus (nombre de
            requêtes), votre <strong>adresse IP</strong> ou votre identifiant de session est compté
            temporairement (quelques minutes). Les journaux de l’hébergeur peuvent aussi enregistrer
            votre adresse IP. Base légale : intérêt légitime (sécurité et disponibilité du service).
          </li>
          <li>
            <strong>Notifications en direct.</strong> Pour vous prévenir d’un nouveau message, d’une
            demande d’ami ou d’une enchère, un court signal (son type et le pseudonyme concerné,
            jamais le contenu d’un message) transite par un serveur de notifications ntfy hébergé
            par l’éditeur, sur un canal privé qui vous est propre. Finalité : fournir le service.
            Base légale : exécution du contrat.
          </li>
        </ul>
        <p>
          Vos données ne sont ni vendues, ni utilisées à des fins publicitaires ou de profilage, et
          aucun outil de mesure d’audience ou de publicité n’est installé.
        </p>
      </Section>

      <Section title="3. Cookies et stockage local">
        <p>
          Wikideck n’utilise que des traceurs strictement nécessaires au service, exemptés de
          consentement :
        </p>
        <ul>
          <li>
            <strong>wikideck_session</strong> : maintient votre connexion (30 jours maximum,
            supprimé à la déconnexion).
          </li>
          <li>
            <strong>wikideck_oauth_state</strong> : sécurise la connexion avec Discord (10 minutes).
          </li>
          <li>
            <strong>Stockage local du navigateur</strong> : mémorise si le menu latéral est replié.
            Il ne contient aucune donnée personnelle.
          </li>
        </ul>
        <p>Il n’y a donc pas de bandeau de consentement aux cookies.</p>
      </Section>

      <Section title="4. Qui voit vos données ?">
        <ul>
          <li>
            <strong>Les autres joueurs</strong> voient votre pseudonyme et votre avatar (pour les
            échanges, enchères, guildes, amis et messages). Votre collection et votre carte vitrine
            ne sont visibles que si vous passez votre profil en « public » dans les paramètres.
          </li>
          <li>
            <strong>L’éditeur</strong> et, pour l’hébergement, <Fill value={LEGAL.host.name} />.
          </li>
          <li>
            <strong>Discord</strong> (connexion et avatars) et la{" "}
            <strong>Wikimedia Foundation</strong> (images des cartes) : votre navigateur charge des
            images directement depuis leurs serveurs, ce qui leur transmet votre adresse IP, selon
            leurs propres politiques de confidentialité.
          </li>
        </ul>
        <p>
          Discord Inc. et la Wikimedia Foundation sont établies aux États-Unis : ces échanges
          impliquent un transfert de données hors de l’Union européenne, encadré par leurs propres
          garanties (clauses contractuelles types, cadre de protection des données UE–États-Unis).
        </p>
      </Section>

      <Section title="5. Durée de conservation">
        <ul>
          <li>
            <strong>Compte et données de jeu :</strong> jusqu’à la suppression de votre compte.
          </li>
          <li>
            <strong>Session de connexion :</strong> 30 jours au plus.
          </li>
          <li>
            <strong>Compteurs anti-abus :</strong> quelques minutes.
          </li>
          <li>
            <strong>Journaux de l’hébergeur :</strong> selon sa propre politique, en général
            quelques semaines.
          </li>
        </ul>
        <p>
          À la suppression du compte, vos données sont effacées. Les échanges et les messages qui
          vous liaient à d’autres joueurs disparaissent aussi de leur côté.
        </p>
      </Section>

      <Section title="6. Vos droits">
        <p>
          Vous disposez d’un droit d’accès, de rectification, d’effacement, de limitation,
          d’opposition et de portabilité de vos données. Directement depuis l’application, dans{" "}
          <strong>Paramètres</strong> :
        </p>
        <ul>
          <li>
            <strong>Exporter mes données</strong> : un fichier JSON avec votre profil, votre
            collection, vos tirages, vos étiquettes, vos échanges, vos amis, vos messages et vos
            parties de Bataille ;
          </li>
          <li>modifier votre pseudonyme et la visibilité de votre profil ;</li>
          <li>
            <strong>Supprimer mon compte</strong> : suppression définitive et immédiate.
          </li>
        </ul>
        <p>
          Pour toute autre demande, écrivez à <Fill value={publisher.email} />. Nous répondons dans
          un délai d’un mois. Si vous estimez que vos droits ne sont pas respectés, vous pouvez
          introduire une réclamation auprès de la{" "}
          <a href="https://www.cnil.fr/fr/plaintes" target="_blank" rel="noreferrer">
            CNIL
          </a>
          .
        </p>
      </Section>

      <Section title="7. Mineurs">
        <p>
          Wikideck est réservé aux personnes de <strong>18 ans ou plus</strong>, ce que vous
          confirmez avant de vous connecter. Nous ne collectons pas sciemment de données de mineurs
          ; un compte dont le titulaire serait mineur peut être supprimé.
        </p>
      </Section>

      <Section title="8. Sécurité">
        <p>
          Nous prenons des mesures raisonnables pour protéger vos données : connexion sans mot de
          passe via Discord, cookie de session inaccessible au code JavaScript du navigateur,
          limitation du nombre de requêtes. Aucun système n’étant infaillible, nous ne pouvons
          garantir une sécurité absolue.
        </p>
      </Section>

      <Section title="9. Modifications">
        <p>
          Cette politique peut évoluer, par exemple avec de nouvelles fonctionnalités. La date de
          dernière mise à jour figure en haut de la page ; en cas de changement important, les
          joueurs en seront informés.
        </p>
      </Section>
    </>
  );
}
