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
import { SelectMenu } from "@/components/select-menu";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState, useSyncExternalStore } from "react";
import {
  USERNAME_MAX,
  USERNAME_MIN,
  USERNAME_PATTERN,
  type DefaultSort,
  type MeProfile,
} from "@wikideck/shared";
import { DeleteAccount } from "@/components/settings/delete-account";
import { PullHistory } from "@/components/settings/pull-history";
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

const SECTIONS: { id: SectionId; icon: IconType }[] = [
  { id: "profil", icon: UserRound },
  { id: "apparence", icon: Palette },
  { id: "tirage", icon: Sparkles },
  { id: "collection", icon: Eye },
  { id: "audio", icon: Volume2 },
  { id: "notifications", icon: Bell },
  { id: "confidentialite", icon: ShieldCheck },
  { id: "donnees", icon: Database },
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
  const t = useTranslations("settings");
  const section = useSyncExternalStore(subscribeHash, readHash, () => "profil" as SectionId);
  const { status } = useSettings();

  function choose(id: SectionId) {
    history.replaceState(null, "", `#${id}`);
    dispatchEvent(new HashChangeEvent("hashchange"));
  }

  return (
    <div className="mx-auto max-w-5xl">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="font-display text-4xl font-medium sm:text-5xl">{t("title")}</h1>
        <p role="status" aria-live="polite" className="text-xs text-fog">
          {status === "saving" && t("status.saving")}
          {status === "saved" && (
            <span className="inline-flex items-center gap-1.5">
              <Check className="size-3.5" /> {t("status.saved")}
            </span>
          )}
          {status === "error" && (
            <span className="text-danger">{t("status.error")}</span>
          )}
        </p>
      </header>

      <div className="mt-8 grid gap-6 md:grid-cols-[230px_minmax(0,1fr)] md:gap-8">
        <div className="md:hidden">
          <span className="mb-2 block text-xs font-bold uppercase tracking-[0.18em] text-fog">
            {t("section")}
          </span>
          <SelectMenu
            block
            label={t("sectionsLabel")}
            value={section}
            options={SECTIONS.map((s) => ({ value: s.id, label: t(`sections.${s.id}`) }))}
            onChange={choose}
          />
        </div>

        <div
          role="tablist"
          aria-orientation="vertical"
          aria-label={t("sectionsLabel")}
          className="sticky top-8 hidden h-fit flex-col gap-1 md:flex"
        >
          {SECTIONS.map(({ id, icon: Icon }) => {
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
                {t(`sections.${id}`)}
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
  const t = useTranslations("settings.profile");
  const tc = useTranslations("common");
  const router = useRouter();
  const [username, setUsername] = useState(profile.username);
  const [saved, setSaved] = useState(profile.username);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

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
    setMessage({ ok: true, text: t("updated") });
    router.refresh();
  }

  return (
    <Panel
      icon={UserRound}
      title={t("title")}
      description={t("description")}
    >
      <SettingRow
        title={t("username")}
        description={t("usernameHelp", { min: USERNAME_MIN, max: USERNAME_MAX })}
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
              aria-label={t("username")}
              aria-invalid={!valid}
              className="min-w-0 flex-1 rounded-lg border border-line bg-transparent px-3 py-2 text-sm outline-none focus:border-accent aria-invalid:border-danger"
            />
            <button
              type="submit"
              disabled={!valid || busy || clean === saved}
              className={primaryButtonClass}
            >
              {tc("save")}
            </button>
          </div>
          {!valid && (
            <p role="alert" className="text-xs text-danger">
              {length < USERNAME_MIN || length > USERNAME_MAX
                ? t("lengthError", { min: USERNAME_MIN, max: USERNAME_MAX })
                : t("charsError")}
            </p>
          )}
        </form>
      </SettingRow>

      <SettingRow
        title={t("discordName")}
        description={t("discordNameHelp")}
      >
        <p className="text-sm font-semibold sm:w-80">
          {profile.discordName ? (
            `@${profile.discordName}`
          ) : (
            <span className="font-normal text-fog">
              {t("discordUnknown")}
            </span>
          )}
        </p>
      </SettingRow>

      {message && (
        <p
          role="status"
          className={`mt-5 text-xs ${message.ok ? "text-pale-mist" : "text-danger"}`}
        >
          {message.text}
        </p>
      )}
    </Panel>
  );
}

function AppearanceSection() {
  const t = useTranslations("settings.appearance");
  const { settings, update } = useSettings();
  return (
    <Panel
      icon={Palette}
      title={t("title")}
      description={t("description")}
    >
      <SettingRow
        title={t("theme")}
        description={t("themeHelp")}
      >
        <Segmented
          label={t("theme")}
          value={settings.appearance.theme}
          onChange={(theme) => update((s) => ({ ...s, appearance: { theme } }))}
          options={[
            {
              value: "system",
              label: (
                <>
                  <Monitor className="size-3.5" /> {t("system")}
                </>
              ),
            },
            {
              value: "light",
              label: (
                <>
                  <Sun className="size-3.5" /> {t("light")}
                </>
              ),
            },
            {
              value: "dark",
              label: (
                <>
                  <Moon className="size-3.5" /> {t("dark")}
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
  const t = useTranslations("settings.draw");
  const { settings, update } = useSettings();
  const { animations, performance } = settings;
  return (
    <Panel
      icon={Sparkles}
      title={t("title")}
      description={t("description")}
    >
      <SettingRow
        title={t("skip")}
        description={t("skipHelp")}
      >
        <Toggle
          label={t("skip")}
          checked={animations.skip}
          onChange={(skip) => update((s) => ({ ...s, animations: { ...s.animations, skip } }))}
        />
      </SettingRow>
      <SettingRow
        title={t("speed")}
        description={t("speedHelp")}
      >
        <Segmented
          label={t("speed")}
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
        title={t("quality")}
        description={t("qualityHelp")}
      >
        <Segmented
          label={t("quality")}
          value={performance.quality}
          onChange={(quality) =>
            update((s) => ({ ...s, performance: { ...s.performance, quality } }))
          }
          options={[
            { value: "low", label: t("low") },
            { value: "medium", label: t("medium") },
            { value: "high", label: t("high") },
          ]}
        />
      </SettingRow>
      <SettingRow
        title={t("fps")}
        description={t("fpsHelp")}
      >
        <Segmented
          label={t("fps")}
          value={performance.fps}
          onChange={(fps) => update((s) => ({ ...s, performance: { ...s.performance, fps } }))}
          options={[
            { value: 30, label: t("fpsOption", { count: 30 }) },
            { value: 60, label: t("fpsOption", { count: 60 }) },
          ]}
        />
      </SettingRow>
    </Panel>
  );
}

const SORT_OPTIONS: DefaultSort[] = ["rarity", "date", "alpha"];

function CollectionSection() {
  const t = useTranslations("settings.collection");
  const { settings, update } = useSettings();
  return (
    <Panel
      icon={Eye}
      title={t("title")}
      description={t("description")}
    >
      <SettingRow
        title={t("defaultSort")}
        description={t("defaultSortHelp")}
      >
        <SelectField
          label={t("defaultSort")}
          options={SORT_OPTIONS.map((value) => ({ value, label: t(`sorts.${value}`) }))}
          value={settings.collection.defaultSort}
          onChange={(defaultSort) =>
            update((s) => ({ ...s, collection: { ...s.collection, defaultSort } }))
          }
        />
      </SettingRow>
      <SettingRow
        title={t("readableFont")}
        description={t("readableFontHelp")}
      >
        <Toggle
          label={t("readableFont")}
          checked={settings.accessibility.readableFont}
          onChange={(readableFont) =>
            update((s) => ({ ...s, accessibility: { ...s.accessibility, readableFont } }))
          }
        />
      </SettingRow>
      <SettingRow
        title={t("highContrast")}
        description={t("highContrastHelp")}
      >
        <Toggle
          label={t("highContrast")}
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
  const t = useTranslations("settings.audio");
  const { settings, update } = useSettings();
  const { audio } = settings;
  const set = (patch: Partial<typeof audio>) =>
    update((s) => ({ ...s, audio: { ...s.audio, ...patch } }));
  return (
    <Panel
      icon={Volume2}
      title={t("title")}
      description={t("description")}
    >
      <SettingRow title={t("master")} description={t("masterHelp")}>
        <Slider
          label={t("master")}
          value={audio.master}
          onChange={(master) => set({ master })}
        />
      </SettingRow>
      <SettingRow
        title={t("music")}
        description={t("musicHelp")}
      >
        <div className="flex flex-col gap-3 sm:items-end">
          <Toggle label={t("music")} checked={audio.bgm} onChange={(bgm) => set({ bgm })} />
          <Slider
            label={t("musicVolume")}
            value={audio.bgmVolume}
            disabled={!audio.bgm}
            onChange={(bgmVolume) => set({ bgmVolume })}
          />
        </div>
      </SettingRow>
      <SettingRow
        title={t("sfx")}
        description={t("sfxHelp")}
      >
        <div className="flex flex-col gap-3 sm:items-end">
          <Toggle label={t("sfx")} checked={audio.sfx} onChange={(sfx) => set({ sfx })} />
          <Slider
            label={t("sfxVolume")}
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
            {t("test")}
          </button>
        </div>
      </SettingRow>
    </Panel>
  );
}

type Permission = NotificationPermission | "unsupported";

function NotificationsSection() {
  const t = useTranslations("settings.notifications");
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

  return (
    <Panel
      icon={Bell}
      title={t("title")}
      description={t("description")}
    >
      <SettingRow
        title={t("permission")}
        description={
          <>
            {t.rich("state", {
              state: t(`states.${permission}`),
              b: (chunks) => <b className="text-pale-mist">{chunks}</b>,
            })}
            {permission === "denied" && t("deniedHelp")}
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
            {t("allow")}
          </button>
          <button
            type="button"
            className={buttonClass}
            disabled={permission !== "granted"}
            onClick={() =>
              new Notification(t("testTitle"), {
                body: t("testBody"),
                icon: "/logo.webp",
              })
            }
          >
            {t("test")}
          </button>
        </div>
      </SettingRow>
      <SettingRow
        title={t("booster")}
        description={t("boosterHelp")}
      >
        <Toggle
          label={t("boosterLabel")}
          checked={settings.notifications.boosterReady}
          disabled={permission === "denied" || permission === "unsupported"}
          onChange={(value) => void toggleBooster(value)}
        />
      </SettingRow>
      <SettingRow
        title={t("events")}
        description={t("eventsHelp")}
      >
        <Toggle
          label={t("eventsLabel")}
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
  const t = useTranslations("settings.privacy");
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
      title={t("title")}
      description={t("description")}
    >
      <SettingRow
        title={t("public")}
        description={t("publicHelp")}
      >
        <Segmented
          label={t("visibility")}
          value={isPublic ? "public" : "private"}
          onChange={(v) => void change(v === "public")}
          options={[
            { value: "private", label: t("private") },
            { value: "public", label: t("publicOption") },
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
  const t = useTranslations("settings.data");
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
      link.download = t("exportFile", { date: new Date().toISOString().slice(0, 10) });
      link.click();
      URL.revokeObjectURL(url);
    } catch {
      setError(t("downloadError"));
    }
    setBusy(false);
  }

  return (
    <Panel
      icon={Database}
      title={t("title")}
      description={t("description")}
    >
      <SettingRow
        title={t("download")}
        description={t("downloadHelp")}
      >
        <button type="button" className={buttonClass} disabled={busy} onClick={download}>
          <Download className="size-4" />
          {busy ? t("preparing") : t("downloadButton")}
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
          {t("danger")}
        </h3>
        <p className="mt-2 mb-4 text-xs leading-relaxed text-fog">
          {t("dangerText")}
        </p>
        <DeleteAccount apiUrl={apiUrl} />
      </div>
    </Panel>
  );
}
