import { getTranslations } from "next-intl/server";
import { DISCORD_URL, SITE_URL, X_URL } from "@/lib/site";

// résumé du site pour les assistants et moteurs de recherche à base d'IA (convention llms.txt)
export async function GET() {
  const [tm, th] = await Promise.all([getTranslations("meta"), getTranslations("home")]);
  const faq = ["0", "1", "2", "4", "5"].map((i) => `- ${th(`faq.items.${i}.q` as never)} ${th(`faq.items.${i}.a` as never)}`);
  const body = `# ${tm("siteName")}

> ${tm("description")}

${tm("siteName")} est un jeu de cartes à collectionner gratuit, en français. Deux collections : des cartes tirées d'articles Wikipédia (rareté selon la fréquentation de l'article) et des cartes de personnages d'anime et de manga issus d'AniList et de Kitsu (rareté selon la popularité). Le jeu se joue après une connexion avec Discord.

## Pages publiques
- [Accueil](${SITE_URL}/): présentation du jeu et questions fréquentes
- [Cartes Wikipédia](${SITE_URL}/cartes-wikipedia): fonctionnement des cartes et des raretés Wikipédia
- [Cartes anime et manga](${SITE_URL}/cartes-anime-manga): fonctionnement des cartes et des raretés anime et manga
- [Documentation de l'API](${SITE_URL}/docs): routes, authentification, limites et exemples
- [Conditions générales d'utilisation](${SITE_URL}/terms)
- [Politique de confidentialité](${SITE_URL}/privacy)

## Questions fréquentes
${faq.join("\n")}

## Liens
- [Discord](${DISCORD_URL})
- [X](${X_URL})
`;
  return new Response(body, { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, max-age=3600" } });
}
