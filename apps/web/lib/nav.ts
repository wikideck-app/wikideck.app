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
  ShoppingBag,
  Swords,
  Trophy,
  User,
  Heart,
  Users,
  type IconType,
} from "@/components/icons";

// les libellés sont dans messages/fr/nav.json (nav.groups.<group>, nav.items.<slug>)
export type NavGroup = "play" | "community" | "competition" | "account";
export type NavSlug =
  | "packs" | "collection" | "albums" | "cards" | "wheel" | "wishlist" | "shop"
  | "trades" | "market" | "guild" | "friends" | "messages"
  | "battle" | "achievements" | "ranking" | "profile" | "settings";
export type NavItem = { slug: NavSlug; icon: IconType; group: NavGroup };

export const NAV_GROUPS: NavGroup[] = ["play", "community", "competition", "account"];

export const NAV: NavItem[] = [
  { slug: "packs", icon: Puzzle, group: "play" },
  { slug: "collection", icon: BookOpen, group: "play" },
  { slug: "albums", icon: Notebook, group: "play" },
  { slug: "cards", icon: Globe, group: "play" },
  { slug: "wheel", icon: Gift, group: "play" },
  { slug: "wishlist", icon: Heart, group: "play" },
  { slug: "shop", icon: ShoppingBag, group: "play" },
  { slug: "trades", icon: Handshake, group: "community" },
  { slug: "market", icon: Gavel, group: "community" },
  { slug: "guild", icon: Castle, group: "community" },
  { slug: "friends", icon: Users, group: "community" },
  { slug: "messages", icon: MessageCircle, group: "community" },
  { slug: "battle", icon: Swords, group: "competition" },
  { slug: "achievements", icon: Trophy, group: "competition" },
  { slug: "ranking", icon: Medal, group: "competition" },
  { slug: "profile", icon: User, group: "account" },
  { slug: "settings", icon: Settings, group: "account" },
];
