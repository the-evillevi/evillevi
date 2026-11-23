import { useEffect } from "react";

import { AffogatoHeader } from "@/components/affogato/AffogatoHeader";
import { FriendsPanel } from "@/components/affogato/FriendsPanel";
import { StatsPanel } from "@/components/affogato/StatsPanel";
import { TasksPanel } from "@/components/affogato/TasksPanel";
import { TimerWorkspace } from "@/components/affogato/TimerWorkspace";
import { Toaster } from "@/components/affogato/ui/sonner";
import { TooltipProvider } from "@/components/affogato/ui/tooltip";

import { setupPersistence, startTickInterval, useAffogatoStore } from "@/lib/affogato/store";
import type { Preferences } from "@/lib/affogato/types";

/* Site-integration glue: keeps Affogato's theme preference in sync with the
 * garden's color mode (System / Light / Dark, see components/evil/ThemeScript).
 * Everything else lives in the zustand store so the app can be lifted into a
 * standalone Vite project. */

type SiteMode = Preferences["theme"];
type ModeWindow = Window & { __evilSetMode?: (mode: SiteMode) => void };

const SITE_MODE_STORAGE_KEY = "evil-mode";

function systemTheme(): "light" | "dark" {
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function readSiteMode(): SiteMode {
  try {
    const saved = localStorage.getItem(SITE_MODE_STORAGE_KEY);
    if (saved === "light" || saved === "dark") return saved;
  } catch {}
  return "system";
}

function resolvedTheme(theme: SiteMode): "light" | "dark" {
  return theme === "system" ? systemTheme() : theme;
}

export function AffogatoApp() {
  const initialized = useAffogatoStore((state) => state.initialized);
  const themePreference = useAffogatoStore((state) => state.preferences.theme);
  const actions = useAffogatoStore((state) => state.actions);

  useEffect(() => {
    actions.initialize(readSiteMode());
    startTickInterval();
    setupPersistence();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Affogato's own theme setting drives the garden's mode.
  useEffect(() => {
    if (!initialized) return;

    const apply = () => actions.setEffectiveTheme(resolvedTheme(themePreference));
    if (readSiteMode() !== themePreference) (window as ModeWindow).__evilSetMode?.(themePreference);
    apply();

    if (themePreference !== "system") return;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, [actions, initialized, themePreference]);

  // The garden's mode control (or another tab) drives Affogato's setting.
  useEffect(() => {
    const sync = () => {
      const mode = readSiteMode();
      if (useAffogatoStore.getState().preferences.theme !== mode) {
        actions.updatePreference("theme", mode);
      }
    };
    const handleStorage = (event: StorageEvent) => {
      if (event.key === SITE_MODE_STORAGE_KEY) sync();
    };

    document.addEventListener("evil:mode", sync);
    window.addEventListener("storage", handleStorage);
    return () => {
      document.removeEventListener("evil:mode", sync);
      window.removeEventListener("storage", handleStorage);
    };
  }, [actions]);

  return (
    <TooltipProvider>
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-6 px-4 py-4 sm:px-6 lg:px-8">
        <AffogatoHeader>
          <TasksPanel />
          <FriendsPanel />
          <StatsPanel />
        </AffogatoHeader>

        <TimerWorkspace />

        <Toaster position="bottom-right" />
      </div>
    </TooltipProvider>
  );
}
