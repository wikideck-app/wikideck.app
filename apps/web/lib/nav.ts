import {
  BookOpen,
  Castle,
  Gavel,
  Gift,
  Globe,
  Handshake,
  Medal,
  Notebook,
  MessageCircle,
  Puzzle,
  Settings,
  Swords,
  Trophy,
  User,
  Heart,
  Users,
  type IconType,
} from "@/components/icons";

export type NavGroup = "Jouer" | "Communauté" | "Compétition" | "Compte";
export type NavItem = { slug: string; label: string; icon: IconType; group: NavGroup };

export const NAV_GROUPS: NavGroup[] = ["Jouer", "Communauté", "Compétition", "Compte"];

export const NAV: NavItem[] = [
  { slug: "packs", label: "Paquets", icon: Puzzle, group: "Jouer" },
  { slug: "collection", label: "Collection", icon: BookOpen, group: "Jouer" },
  { slug: "albums", label: "Albums", icon: Notebook, group: "Jouer" },
  { slug: "cards", label: "Toutes les cartes", icon: Globe, group: "Jouer" },
  { slug: "wheel", label: "Roue", icon: Gift, group: "Jouer" },
  { slug: "wishlist", label: "Envies", icon: Heart, group: "Jouer" },
  { slug: "trades", label: "Échanges", icon: Handshake, group: "Communauté" },
  { slug: "market", label: "Marché", icon: Gavel, group: "Communauté" },
  { slug: "guild", label: "Guilde", icon: Castle, group: "Communauté" },
  { slug: "friends", label: "Amis", icon: Users, group: "Communauté" },
  { slug: "messages", label: "Messages", icon: MessageCircle, group: "Communauté" },
  { slug: "battle", label: "Bataille", icon: Swords, group: "Compétition" },
  { slug: "achievements", label: "Succès", icon: Trophy, group: "Compétition" },
  { slug: "ranking", label: "Classement", icon: Medal, group: "Compétition" },
  { slug: "profile", label: "Profil", icon: User, group: "Compte" },
  { slug: "settings", label: "Paramètres", icon: Settings, group: "Compte" },
];
