"use client";

import {
  Bell,
  Check,
  Database,
  Download,
  Eye,
  Monitor,
  Moon,
  ShieldCheck,
  Palette,
  Sparkles,
  Sun,
  Trash2,
  UserRound,
  Volume2,
  type IconType,
} from "@/components/icons";
import { useRouter } from "next/navigation";
import { useState, useSyncExternalStore } from "react";
import {
  USERNAME_MAX,
  USERNAME_MIN,
  USERNAME_PATTERN,
  type CardDto,
  type DefaultSort,
  type MeProfile,
} from "@wikideck/shared";
import { DeleteAccount } from "@/components/settings/delete-account";
import { PullHistory } from "@/components/settings/pull-history";
import { ShowcasePicker } from "@/components/settings/showcase-picker";
import {
  Panel,
  Segmented,
  SelectField,
  SettingRow,
  Slider,
  Toggle,
  buttonClass,
  primaryButtonClass,
} from "@/components/settings/controls";
import { WikiCard } from "@/components/wiki-card";
import { sfx } from "@/lib/audio";
import { useSettings } from "@/lib/settings-context";
import { apiCall } from "@/lib/tags-api";

type SectionId =
  | "profil"
  | "apparence"
  | "tirage"
  | "collection"
  | "audio"
  | "notifications"
  | "confidentialite"
  | "donnees";

const SECTIONS: { id: SectionId; label: string; icon: IconType }[] = [
  { id: "profil", label: "Profil & compte", icon: UserRound },
  { id: "apparence", label: "Apparence", icon: Palette },
  { id: "tirage", label: "Tirage & animations", icon: Sparkles },
  { id: "collection", label: "Collection & accessibilité", icon: Eye },
  { id: "audio", label: "Audio", icon: Volume2 },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "confidentialite", label: "Confidentialité", icon: ShieldCheck },
  { id: "donnees", label: "Données (RGPD)", icon: Database },
];

const isSection = (value: string): value is SectionId => SECTIONS.some((s) => s.id === value);

function subscribeHash(callback: () => void) {
  addEventListener("hashchange", callback);
  return () => removeEventListener("hashchange", callback);
}
const readHash = (): SectionId => {
  const hash = location.hash.slice(1);
  return isSection(hash) ? hash : "profil";
};

export function SettingsView({ profile, apiUrl }: { profile: MeProfile; apiUrl: string }) {
  const section = useSyncExternalStore(subscribeHash, readHash, () => "profil" as SectionId);
  const { status } = useSettings();

  function choose(id: SectionId) {
    history.replaceState(null, "", `#${id}`);
    dispatchEvent(new HashChangeEvent("hashchange"));
  }

  return (
    <div className="mx-auto max-w-5xl">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="font-display text-4xl font-medium sm:text-5xl">Paramètres</h1>
        <p role="status" aria-live="polite" className="text-xs text-fog">
          {status === "saving" && "Enregistrement…"}
          {status === "saved" && (
            <span className="inline-flex items-center gap-1.5">
              <Check className="size-3.5" /> Préférences enregistrées
            </span>
          )}
          {status === "error" && (
            <span className="text-danger">Échec de l&apos;enregistrement</span>
          )}
        </p>
      </header>

      <div className="mt-8 grid gap-6 md:grid-cols-[230px_minmax(0,1fr)] md:gap-8">
        <div className="md:hidden">
          <label
            htmlFor="section-select"
            className="mb-2 block text-xs font-bold uppercase tracking-[0.18em] text-fog"
          >
            Section
          </label>
          <select
            id="section-select"
            value={section}
            onChange={(e) => isSection(e.target.value) && choose(e.target.value)}
            className="w-full rounded-[20px] border border-line bg-background px-3 py-2.5 text-sm outline-none focus:border-accent"
          >
            {SECTIONS.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
        </div>

        <div
          role="tablist"
          aria-orientation="vertical"
          aria-label="Sections des paramètres"
          className="sticky top-8 hidden h-fit flex-col gap-1 md:flex"
        >
          {SECTIONS.map(({ id, label, icon: Icon }) => {
            const active = id === section;
            return (
              <button
                key={id}
                type="button"
                role="tab"
                id={`tab-${id}`}
                aria-selected={active}
                aria-controls={`panel-${id}`}
                onClick={() => choose(id)}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition-colors ${
                  active
                    ? "bg-accent/[.07] text-foreground ring-1 ring-inset ring-accent/10"
                    : "text-pale-mist hover:bg-accent/5 hover:text-foreground"
                }`}
              >
                <Icon className="size-[18px] shrink-0" strokeWidth={active ? 2.2 : 1.8} />
                {label}
              </button>
            );
          })}
        </div>

        <div
          role="tabpanel"
          id={`panel-${section}`}
          aria-labelledby={`tab-${section}`}
          className="min-w-0"
        >
          {section === "profil" && <ProfileSection profile={profile} apiUrl={apiUrl} />}
          {section === "apparence" && <AppearanceSection />}
          {section === "tirage" && <DrawSection />}
          {section === "collection" && <CollectionSection />}
          {section === "audio" && <AudioSection />}
          {section === "notifications" && <NotificationsSection />}
          {section === "confidentialite" && <PrivacySection profile={profile} apiUrl={apiUrl} />}
          {section === "donnees" && <DataSection apiUrl={apiUrl} />}
        </div>
      </div>
    </div>
  );
}

function ProfileSection({ profile, apiUrl }: { profile: MeProfile; apiUrl: string }) {
  const router = useRouter();
  const [username, setUsername] = useState(profile.username);
  const [saved, setSaved] = useState(profile.username);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [showcase, setShowcase] = useState<CardDto | null>(profile.showcase);
  const [picking, setPicking] = useState(false);

  const clean = username.trim().replace(/\s+/g, " ");
  const length = [...clean].length;
  const valid = length >= USERNAME_MIN && length <= USERNAME_MAX && USERNAME_PATTERN.test(clean);

  async function saveName() {
    if (!valid || busy || clean === saved) return;
    setBusy(true);
    setMessage(null);
    const result = await apiCall<MeProfile>(apiUrl, "/me", "PATCH", { username: clean });
    setBusy(false);
    if (!result.ok) return setMessage({ ok: false, text: result.message });
    setSaved(result.data.username);
    setUsername(result.data.username);
    setMessage({ ok: true, text: "Pseudonyme mis à jour." });
    router.refresh();
  }

  async function setShowcaseCard(id: string | null, card: CardDto | null) {
    const result = await apiCall<MeProfile>(apiUrl, "/me", "PATCH", { showcaseCardId: id });
    if (!result.ok) return setMessage({ ok: false, text: result.message });
    setShowcase(card);
    setMessage({ ok: true, text: card ? "Carte vitrine mise à jour." : "Carte vitrine retirée." });
  }

  return (
    <Panel
      icon={UserRound}
      title="Profil du joueur & compte"
      description="Votre identité en jeu, telle que les autres joueurs la voient."
    >
      <SettingRow
        title="Pseudonyme"
        description={`${USERNAME_MIN} à ${USERNAME_MAX} caractères : lettres, chiffres, espace, point, tiret, tiret bas et apostrophe. Votre avatar vient de Discord.`}
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void saveName();
          }}
          className="flex flex-col gap-2 sm:w-80"
        >
          <div className="flex gap-2">
            <input
              value={username}
              onChange={(e) => {
                setUsername(e.target.value);
                setMessage(null);
              }}
              maxLength={USERNAME_MAX + 8}
              aria-label="Pseudonyme"
              aria-invalid={!valid}
              className="min-w-0 flex-1 rounded-[20px] border border-line bg-transparent px-3 py-2 text-sm outline-none focus:border-accent aria-[invalid=true]:border-danger"
            />
            <button
              type="submit"
              disabled={!valid || busy || clean === saved}
              className={primaryButtonClass}
            >
              Enregistrer
            </button>
          </div>
          {!valid && (
            <p role="alert" className="text-xs text-danger">
              {length < USERNAME_MIN || length > USERNAME_MAX
                ? `Entre ${USERNAME_MIN} et ${USERNAME_MAX} caractères.`
                : "Caractères non autorisés."}
            </p>
          )}
        </form>
      </SettingRow>

      <SettingRow
        title="Nom d'utilisateur Discord"
        description="Lié à votre compte Discord, non modifiable ici. C'est ce nom que vos amis saisissent pour vous retrouver et vous ajouter ; il est mis à jour à chaque connexion."
      >
        <p className="text-sm font-semibold sm:w-80">
          {profile.discordName ? (
            `@${profile.discordName}`
          ) : (
            <span className="font-normal text-fog">
              Pas encore enregistré : il apparaîtra à votre prochaine connexion.
            </span>
          )}
        </p>
      </SettingRow>

      <SettingRow
        title="Carte vitrine"
        description="La carte mise en avant sur votre profil. Choisissez-en une parmi celles que vous possédez."
      >
        <div className="flex items-center gap-4">
          {showcase ? (
            <WikiCard card={showcase} compact className="w-28" />
          ) : (
            <div className="flex aspect-[2/3] w-28 items-center justify-center rounded-xl border border-dashed border-line text-center text-[11px] text-fog bg-surface">
              Aucune carte
            </div>
          )}
          <div className="flex flex-col gap-2">
            <button type="button" className={buttonClass} onClick={() => setPicking(true)}>
              {showcase ? "Changer" : "Choisir une carte"}
            </button>
            {showcase && (
              <button
                type="button"
                className={buttonClass}
                onClick={() => setShowcaseCard(null, null)}
              >
                Retirer
              </button>
            )}
          </div>
        </div>
      </SettingRow>

      {message && (
        <p
          role="status"
          className={`mt-5 text-xs ${message.ok ? "text-pale-mist" : "text-danger"}`}
        >
          {message.text}
        </p>
      )}
      {picking && (
        <ShowcasePicker
          apiUrl={apiUrl}
          onSelect={(card) => void setShowcaseCard(card.id, card)}
          onClose={() => setPicking(false)}
        />
      )}
    </Panel>
  );
}

function AppearanceSection() {
  const { settings, update } = useSettings();
  return (
    <Panel
      icon={Palette}
      title="Apparence"
      description="Le thème de l'interface. Il s'applique tout de suite et vous suit sur vos appareils."
    >
      <SettingRow
        title="Thème"
        description="« Système » suit le réglage clair ou sombre de votre appareil et en change avec lui."
      >
        <Segmented
          label="Thème"
          value={settings.appearance.theme}
          onChange={(theme) => update((s) => ({ ...s, appearance: { theme } }))}
          options={[
            {
              value: "system",
              label: (
                <>
                  <Monitor className="size-3.5" /> Système
                </>
              ),
            },
            {
              value: "light",
              label: (
                <>
                  <Sun className="size-3.5" /> Clair
                </>
              ),
            },
            {
              value: "dark",
              label: (
                <>
                  <Moon className="size-3.5" /> Sombre
                </>
              ),
            },
          ]}
        />
      </SettingRow>
    </Panel>
  );
}

function DrawSection() {
  const { settings, update } = useSettings();
  const { animations, performance } = settings;
  return (
    <Panel
      icon={Sparkles}
      title="Tirage & animations"
      description="Pour ouvrir vos paquets plus vite, ou ménager votre appareil. Les réglages s'appliquent tout de suite."
    >
      <SettingRow
        title="Passer les animations de tirage"
        description="Les cartes s'affichent directement face visible, sans secousse du paquet ni retournement."
      >
        <Toggle
          label="Passer les animations de tirage"
          checked={animations.skip}
          onChange={(skip) => update((s) => ({ ...s, animations: { ...s.animations, skip } }))}
        />
      </SettingRow>
      <SettingRow
        title="Vitesse des animations"
        description="Accélère les effets visuels du tirage et du menu. Sans effet si les animations sont passées."
      >
        <Segmented
          label="Vitesse des animations"
          disabled={animations.skip}
          value={animations.speed}
          onChange={(speed) => update((s) => ({ ...s, animations: { ...s.animations, speed } }))}
          options={[
            { value: 1, label: "×1" },
            { value: 2, label: "×2" },
            { value: 3, label: "×3" },
          ]}
        />
      </SettingRow>
      <SettingRow
        title="Qualité graphique"
        description="Bas : peu d'étoiles, ni flou, ni halos, ni reflets. Moyen : sans reflets continus. Élevé : tous les effets."
      >
        <Segmented
          label="Qualité graphique"
          value={performance.quality}
          onChange={(quality) =>
            update((s) => ({ ...s, performance: { ...s.performance, quality } }))
          }
          options={[
            { value: "low", label: "Bas" },
            { value: "medium", label: "Moyen" },
            { value: "high", label: "Élevé" },
          ]}
        />
      </SettingRow>
      <SettingRow
        title="Images par seconde"
        description="30 images par seconde chauffent moins et économisent la batterie, sur téléphone notamment."
      >
        <Segmented
          label="Images par seconde"
          value={performance.fps}
          onChange={(fps) => update((s) => ({ ...s, performance: { ...s.performance, fps } }))}
          options={[
            { value: 30, label: "30 FPS" },
            { value: 60, label: "60 FPS" },
          ]}
        />
      </SettingRow>
    </Panel>
  );
}

const SORT_OPTIONS: { value: DefaultSort; label: string }[] = [
  { value: "rarity", label: "Par rareté" },
  { value: "date", label: "Par date d'obtention" },
  { value: "alpha", label: "Par ordre alphabétique" },
];

function CollectionSection() {
  const { settings, update } = useSettings();
  return (
    <Panel
      icon={Eye}
      title="Collection & accessibilité"
      description="Comment s'affiche votre collection, et comment rendre le texte plus confortable à lire."
    >
      <SettingRow
        title="Tri par défaut de la collection"
        description="Appliqué à l'ouverture de la collection. Vous pouvez toujours changer de tri sur la page."
      >
        <SelectField
          label="Tri par défaut de la collection"
          options={SORT_OPTIONS}
          value={settings.collection.defaultSort}
          onChange={(defaultSort) =>
            update((s) => ({ ...s, collection: { ...s.collection, defaultSort } }))
          }
        />
      </SettingRow>
      <SettingRow
        title="Police à haute lisibilité"
        description="Remplace les polices par Atkinson Hyperlegible, aux lettres bien distinctes, avec plus d'espace. Utile pour la dyslexie ou une vue fatiguée."
      >
        <Toggle
          label="Police à haute lisibilité"
          checked={settings.accessibility.readableFont}
          onChange={(readableFont) =>
            update((s) => ({ ...s, accessibility: { ...s.accessibility, readableFont } }))
          }
        />
      </SettingRow>
      <SettingRow
        title="Contrastes renforcés"
        description="Textes secondaires plus clairs et filets plus visibles, pour lire les longs textes encyclopédiques."
      >
        <Toggle
          label="Contrastes renforcés"
          checked={settings.accessibility.highContrast}
          onChange={(highContrast) =>
            update((s) => ({ ...s, accessibility: { ...s.accessibility, highContrast } }))
          }
        />
      </SettingRow>
    </Panel>
  );
}

function AudioSection() {
  const { settings, update } = useSettings();
  const { audio } = settings;
  const set = (patch: Partial<typeof audio>) =>
    update((s) => ({ ...s, audio: { ...s.audio, ...patch } }));
  return (
    <Panel
      icon={Volume2}
      title="Audio"
      description="Tous les sons sont synthétisés par votre navigateur : aucun fichier à télécharger."
    >
      <SettingRow title="Volume général" description="S'applique à la musique et aux effets.">
        <Slider
          label="Volume général"
          value={audio.master}
          onChange={(master) => set({ master })}
        />
      </SettingRow>
      <SettingRow
        title="Musique d'ambiance"
        description="Une nappe sonore douce en fond. Le navigateur ne la lance qu'après votre premier clic."
      >
        <div className="flex flex-col gap-3 sm:items-end">
          <Toggle label="Musique d'ambiance" checked={audio.bgm} onChange={(bgm) => set({ bgm })} />
          <Slider
            label="Volume de la musique"
            value={audio.bgmVolume}
            disabled={!audio.bgm}
            onChange={(bgmVolume) => set({ bgmVolume })}
          />
        </div>
      </SettingRow>
      <SettingRow
        title="Effets sonores"
        description="Bruitage des clics, souffle à l'ouverture d'un paquet et arpège à chaque carte révélée (plus long pour une carte plus rare)."
      >
        <div className="flex flex-col gap-3 sm:items-end">
          <Toggle label="Effets sonores" checked={audio.sfx} onChange={(sfx) => set({ sfx })} />
          <Slider
            label="Volume des effets"
            value={audio.sfxVolume}
            disabled={!audio.sfx}
            onChange={(sfxVolume) => set({ sfxVolume })}
          />
          <button
            type="button"
            disabled={!audio.sfx}
            onClick={() => sfx.reveal("LEGENDARY")}
            className={buttonClass}
          >
            Tester un effet
          </button>
        </div>
      </SettingRow>
    </Panel>
  );
}

type Permission = NotificationPermission | "unsupported";

function NotificationsSection() {
  const { settings, update } = useSettings();
  const current = useSyncExternalStore(
    () => () => {},
    (): Permission => ("Notification" in window ? Notification.permission : "unsupported"),
    (): Permission => "default",
  );
  const [answered, setAnswered] = useState<Permission | null>(null);
  const permission = answered ?? current;

  async function ask(): Promise<Permission> {
    if (!("Notification" in window)) return "unsupported";
    const result = await Notification.requestPermission();
    setAnswered(result);
    return result;
  }

  async function toggleBooster(boosterReady: boolean) {
    if (boosterReady && permission !== "granted" && (await ask()) !== "granted") return;
    update((s) => ({ ...s, notifications: { ...s.notifications, boosterReady } }));
  }

  const label: Record<Permission, string> = {
    default: "Pas encore demandée",
    granted: "Autorisées",
    denied: "Refusées par le navigateur",
    unsupported: "Non prises en charge par ce navigateur",
  };

  return (
    <Panel
      icon={Bell}
      title="Notifications & alertes de jeu"
      description="Soyez prévenu quand un paquet est prêt, même depuis un autre onglet."
    >
      <SettingRow
        title="Autorisation du navigateur"
        description={
          <>
            État : <b className="text-pale-mist">{label[permission]}</b>.
            {permission === "denied" &&
              " Réautorisez-les dans les réglages du site de votre navigateur (cadenas près de l'adresse)."}
          </>
        }
      >
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className={primaryButtonClass}
            disabled={
              permission === "granted" || permission === "denied" || permission === "unsupported"
            }
            onClick={() => void ask()}
          >
            Autoriser les notifications
          </button>
          <button
            type="button"
            className={buttonClass}
            disabled={permission !== "granted"}
            onClick={() =>
              new Notification("Wikideck", {
                body: "Voici à quoi ressemblera une alerte : votre booster est prêt !",
                icon: "/logo.webp",
              })
            }
          >
            Envoyer un test
          </button>
        </div>
      </SettingRow>
      <SettingRow
        title="Recharge de paquet disponible"
        description="« Votre booster est prêt ! » : une alerte quand un nouveau paquet arrive. Elle s'affiche tant que Wikideck est ouvert dans un onglet, sans que ce soit celui que vous regardez."
      >
        <Toggle
          label="Alerte de recharge de paquet"
          checked={settings.notifications.boosterReady}
          disabled={permission === "denied" || permission === "unsupported"}
          onChange={(value) => void toggleBooster(value)}
        />
      </SettingRow>
      <SettingRow
        title="Événements thématiques"
        description="Début et fin d'un événement spécial sur un thème de Wikipédia (par exemple une semaine d'histoire de France). Aucun événement n'existe encore : votre choix est enregistré pour plus tard."
      >
        <Toggle
          label="Alertes d'événements thématiques"
          checked={settings.notifications.events}
          onChange={(events) =>
            update((s) => ({ ...s, notifications: { ...s.notifications, events } }))
          }
        />
      </SettingRow>
    </Panel>
  );
}

function PrivacySection({ profile, apiUrl }: { profile: MeProfile; apiUrl: string }) {
  const [isPublic, setIsPublic] = useState(profile.isPublic);
  const [error, setError] = useState<string | null>(null);

  async function change(value: boolean) {
    const previous = isPublic;
    setIsPublic(value);
    setError(null);
    const result = await apiCall<MeProfile>(apiUrl, "/me", "PATCH", { isPublic: value });
    if (!result.ok) {
      setIsPublic(previous);
      setError(result.message);
    }
  }

  return (
    <Panel
      icon={ShieldCheck}
      title="Confidentialité & données du joueur"
      description="Ce que les autres joueurs peuvent voir, et la transparence sur vos tirages."
    >
      <SettingRow
        title="Statistiques publiques"
        description="Public : votre collection et votre taux de complétion pourront être vus par les autres joueurs. Privé : vous seul les voyez. Les profils publics arrivent bientôt : votre choix est déjà pris en compte."
      >
        <Segmented
          label="Visibilité de la collection"
          value={isPublic ? "public" : "private"}
          onChange={(v) => void change(v === "public")}
          options={[
            { value: "private", label: "Privé" },
            { value: "public", label: "Public" },
          ]}
        />
      </SettingRow>
      {error && (
        <p role="alert" className="mt-3 text-xs text-danger">
          {error}
        </p>
      )}
      <div className="mt-6">
        <PullHistory apiUrl={apiUrl} />
      </div>
    </Panel>
  );
}

function DataSection({ apiUrl }: { apiUrl: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function download() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`${apiUrl}/me/export`, { credentials: "include" });
      if (!res.ok) throw new Error();
      const url = URL.createObjectURL(await res.blob());
      const link = document.createElement("a");
      link.href = url;
      link.download = `wikideck-export-${new Date().toISOString().slice(0, 10)}.json`;
      link.click();
      URL.revokeObjectURL(url);
    } catch {
      setError("Impossible de télécharger vos données pour le moment. Réessayez dans un instant.");
    }
    setBusy(false);
  }

  return (
    <Panel
      icon={Database}
      title="Options RGPD : sécurité & données"
      description="Vos données vous appartiennent : récupérez-les ou effacez-les à tout moment."
    >
      <SettingRow
        title="Télécharger mes données personnelles"
        description="Un fichier JSON avec votre profil, vos préférences, votre collection, vos étiquettes et l'historique de vos tirages."
      >
        <button type="button" className={buttonClass} disabled={busy} onClick={download}>
          <Download className="size-4" />
          {busy ? "Préparation…" : "Télécharger (JSON)"}
        </button>
      </SettingRow>
      {error && (
        <p role="alert" className="mt-3 text-xs text-danger">
          {error}
        </p>
      )}
      <div className="mt-6 rounded-xl border border-danger/40 p-5">
        <h3 className="flex items-center gap-2 text-sm font-bold text-danger">
          <Trash2 className="size-4" />
          Zone dangereuse
        </h3>
        <p className="mt-2 mb-4 text-xs leading-relaxed text-fog">
          La suppression du compte efface définitivement toutes vos données. Elle ne peut pas être
          annulée.
        </p>
        <DeleteAccount apiUrl={apiUrl} />
      </div>
    </Panel>
  );
}
