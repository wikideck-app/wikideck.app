import { readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { getIconData } from "@iconify/utils";

const SET = "ph";

const ICONS = {
  AlertTriangle: "warning-bold",
  Archive: "archive-bold",
  ArrowLeft: "arrow-left-bold",
  ArrowLeftRight: "arrows-left-right-bold",
  ArrowRight: "arrow-right-bold",
  ArrowUpRight: "arrow-up-right-bold",
  Award: "certificate-bold",
  BadgeCheck: "seal-check-bold",
  Ban: "prohibit-bold",
  Bell: "bell-bold",
  BookBookmark: "book-bookmark-bold",
  BookOpen: "book-open-bold",
  Castle: "castle-turret-bold",
  Check: "check-bold",
  ChevronDown: "caret-down-bold",
  ChevronLeft: "caret-left-bold",
  ChevronRight: "caret-right-bold",
  Coins: "coins-bold",
  Copy: "copy-bold",
  Crown: "crown-bold",
  Database: "database-bold",
  Diamond: "diamonds-four-bold",
  DiscordLogo: "fa6-brands:discord",
  Download: "download-simple-bold",
  Eye: "eye-bold",
  Flame: "fire-bold",
  Gavel: "gavel-bold",
  Gem: "diamond-bold",
  Gift: "gift-bold",
  Globe: "globe-bold",
  Handshake: "handshake-bold",
  Heart: "heart-bold",
  HeartFill: "heart-fill",
  Hourglass: "hourglass-bold",
  Info: "info-bold",
  Landmark: "bank-bold",
  Layers: "stack-bold",
  Library: "books-bold",
  LineChart: "chart-line-bold",
  Lock: "lock-bold",
  LogOut: "sign-out-bold",
  Medal: "medal-bold",
  Menu: "list-bold",
  MessageCircle: "chat-circle-bold",
  MessageCirclePlus: "chat-circle-dots-bold",
  Minus: "minus-bold",
  Notebook: "notebook-bold",
  Monitor: "desktop-bold",
  Moon: "moon-bold",
  Package: "package-bold",
  PackageOpen: "archive-box-bold",
  Palette: "palette-bold",
  PartyPopper: "confetti-bold",
  Pencil: "pencil-simple-bold",
  Plus: "plus-bold",
  Puzzle: "puzzle-piece-bold",
  Recycle: "recycle-bold",
  Search: "magnifying-glass-bold",
  Send: "paper-plane-tilt-bold",
  Settings: "gear-six-bold",
  Shield: "shield-bold",
  ShieldCheck: "shield-check-bold",
  Sparkles: "sparkle-bold",
  Star: "star-bold",
  StarFill: "star-fill",
  Sun: "sun-bold",
  Swords: "sword-bold",
  Tags: "tag-bold",
  Trash2: "trash-bold",
  Trophy: "trophy-bold",
  User: "user-bold",
  UserCheck: "user-check-bold",
  UserMinus: "user-minus-bold",
  UserPlus: "user-plus-bold",
  UserRound: "user-circle-bold",
  Users: "users-bold",
  Volume2: "speaker-high-bold",
  Wallet: "wallet-bold",
  X: "x-bold",
};

const require = createRequire(import.meta.url);
const collections = {};
const loadSet = (set) =>
  (collections[set] ??= JSON.parse(
    readFileSync(require.resolve(`@iconify-json/${set}/icons.json`), "utf8"),
  ));

const data = {};
const missing = [];
for (const [component, ref] of Object.entries(ICONS)) {
  // "set:nom" pour un autre jeu que SET
  const [set, id] = ref.includes(":") ? ref.split(":") : [SET, ref];
  const icon = getIconData(loadSet(set), id);
  if (icon) data[component] = icon;
  else missing.push(`${component} → ${set}:${id}`);
}
if (missing.length) {
  console.error("Icônes introuvables dans le jeu :\n  " + missing.join("\n  "));
  process.exit(1);
}

const names = Object.keys(data);
const out = `// Fichier généré par scripts/build-icons.mjs (pnpm icons) : ne pas modifier à la main.
// Icônes Iconify (${SET}), intégrées au code.
import { Icon, type IconifyIcon } from "@iconify/react/offline";
import type { ComponentProps, ComponentType } from "react";

export type IconProps = Omit<ComponentProps<typeof Icon>, "icon"> & { strokeWidth?: number };
export type IconType = ComponentType<IconProps>;

const DATA: Record<string, IconifyIcon> = ${JSON.stringify(data)};

function make(name: string): IconType {
  // strokeWidth n'a pas de sens pour ces icônes pleines : accepté et ignoré, pour rester interchangeable
  const Component = ({ strokeWidth: _ignored, ...props }: IconProps) => (
    <Icon
      icon={DATA[name]}
      width="1em"
      height="1em"
      aria-hidden={props["aria-label"] ? undefined : true}
      {...props}
    />
  );
  Component.displayName = name;
  return Component;
}

${names.map((n) => `export const ${n} = make("${n}");`).join("\n")}
`;
writeFileSync(new URL("../components/icons.tsx", import.meta.url), out);
console.log(`${names.length} icônes générées (${SET})`);
