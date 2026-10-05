import { BookOpen, Castle, Gavel, Handshake, Puzzle, Swords } from "@/components/icons";
import { Reveal } from "@/components/reveal";

const FEATURES = [
  {
    icon: Puzzle,
    title: "Ouvrez des paquets",
    text: "Des articles tirés au sort. Plus un article est lu, plus la carte est rare.",
  },
  {
    icon: BookOpen,
    title: "Complétez votre album",
    text: "Triez par rareté, filtrez par étiquettes colorées et retrouvez n'importe quelle carte.",
  },
  {
    icon: Swords,
    title: "Défiez vos amis",
    text: "Une course Wikipédia en salon : le premier à atteindre l'article cible gagne des wikibits.",
  },
  {
    icon: Handshake,
    title: "Troquez vos doublons",
    text: "Proposez vos doublons contre les cartes qui vous manquent.",
  },
  {
    icon: Gavel,
    title: "Vendez aux enchères",
    text: "Mettez une carte aux enchères et guettez la bonne affaire avant la fin du compte à rebours.",
  },
  {
    icon: Castle,
    title: "Rejoignez une guilde",
    text: "Réunissez-vous à plusieurs, discutez et faites grimper votre équipe.",
  },
];

export function Features() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {FEATURES.map(({ icon: Icon, title, text }, i) => (
        <Reveal key={title} delay={(i % 3) * 120}>
          <article className="group h-full rounded-xl border border-line bg-surface p-7 transition-colors duration-300 hover:border-accent">
            <div className="flex items-start justify-between">
              <Icon className="size-6 transition-transform duration-500 group-hover:-translate-y-1" />
            </div>
            <h3 className="mt-6 text-lg font-bold">{title}</h3>
            <p className="prose-serif mt-2 text-pale-mist">{text}</p>
          </article>
        </Reveal>
      ))}
    </div>
  );
}
