"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { THEME_STORAGE_KEY, normalizeSettings, type UserSettings } from "@wikideck/shared";
import { configureAudio, sfx, unlockAudio } from "@/lib/audio";

type SaveStatus = "idle" | "saving" | "saved" | "error";

type SettingsContextValue = {
  settings: UserSettings;
  update: (change: (current: UserSettings) => UserSettings) => void;
  status: SaveStatus;
};

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function useSettings() {
  const value = useContext(SettingsContext);
  if (!value) throw new Error("useSettings doit être utilisé dans <SettingsProvider>");
  return value;
}

const SAVE_DELAY_MS = 700;

export function SettingsProvider({
  initial,
  apiUrl,
  children,
}: {
  initial: UserSettings;
  apiUrl: string;
  children: ReactNode;
}) {
  const [settings, setSettings] = useState(() => normalizeSettings(initial));
  const [status, setStatus] = useState<SaveStatus>("idle");
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const latest = useRef(settings);

  const save = useCallback(async () => {
    setStatus("saving");
    try {
      const res = await fetch(`${apiUrl}/me/settings`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings: latest.current }),
      });
      setStatus(res.ok ? "saved" : "error");
    } catch {
      setStatus("error");
    }
  }, [apiUrl]);

  const update = useCallback(
    (change: (current: UserSettings) => UserSettings) => {
      setSettings((current) => {
        const next = normalizeSettings(change(current));
        latest.current = next;
        return next;
      });
      clearTimeout(timer.current);
      setStatus("saving");
      timer.current = setTimeout(save, SAVE_DELAY_MS);
    },
    [save],
  );

  const theme = settings.appearance.theme;
  useEffect(() => {
    const root = document.documentElement;
    if (theme === "system") delete root.dataset.theme;
    else root.dataset.theme = theme;
    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {}
  }, [theme]);

  useEffect(() => configureAudio(settings.audio), [settings.audio]);
  useEffect(() => {
    const unlock = () => unlockAudio();
    addEventListener("pointerdown", unlock, { once: true });
    addEventListener("keydown", unlock, { once: true });
    const click = (e: MouseEvent) => {
      if ((e.target as Element | null)?.closest("button, a[href], [role=button], summary")) {
        sfx.click();
      }
    };
    document.addEventListener("click", click, true);
    return () => {
      removeEventListener("pointerdown", unlock);
      removeEventListener("keydown", unlock);
      document.removeEventListener("click", click, true);
      clearTimeout(timer.current);
    };
  }, []);

  const value = useMemo(() => ({ settings, update, status }), [settings, update, status]);

  return (
    <SettingsContext.Provider value={value}>
      <div
        className="contents"
        data-quality={settings.performance.quality}
        data-contrast={settings.accessibility.highContrast ? "high" : "normal"}
        data-font={settings.accessibility.readableFont ? "readable" : "default"}
        data-skip={settings.animations.skip}
        style={{ "--speed": settings.animations.speed } as React.CSSProperties}
      >
        {children}
      </div>
    </SettingsContext.Provider>
  );
}
