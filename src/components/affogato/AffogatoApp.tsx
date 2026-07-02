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
 * site-wide nb-theme toggle. Everything else lives in the zustand store so
 * the app can be lifted into a standalone Vite project. */

const SITE_THEME_STORAGE_KEY = "nb-theme";

function systemTheme(): "light" | "dark" {
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function readSiteTheme(): "light" | "dark" {
  const savedTheme = localStorage.getItem(SITE_THEME_STORAGE_KEY);
  if (savedTheme === "light" || savedTheme === "dark") return savedTheme;
  const documentTheme = document.documentElement.dataset.theme;
  if (documentTheme === "light" || documentTheme === "dark") {
    return documentTheme;
  }
  return systemTheme();
}

function resolvedTheme(theme: Preferences["theme"]): "light" | "dark" {
  return theme === "system" ? systemTheme() : theme;
}

function applySiteTheme(theme: "light" | "dark") {
  document.documentElement.dataset.theme = theme;
  document.documentElement.classList.toggle("dark", theme === "dark");
  localStorage.setItem(SITE_THEME_STORAGE_KEY, theme);
  document.querySelectorAll("[data-theme-icon]").forEach((icon) => {
    icon.textContent = theme === "dark" ? "☾" : "☀";
  });
}

export function AffogatoApp() {
  const initialized = useAffogatoStore((state) => state.initialized);
  const themePreference = useAffogatoStore((state) => state.preferences.theme);
  const actions = useAffogatoStore((state) => state.actions);

  useEffect(() => {
    actions.initialize(readSiteTheme());
    startTickInterval();
    setupPersistence();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!initialized) return;

    const applyPreferenceTheme = () => {
      const resolved = resolvedTheme(themePreference);
      applySiteTheme(resolved);
      actions.setEffectiveTheme(resolved);
    };

    applyPreferenceTheme();

    if (themePreference !== "system") return;

    const media = window.matchMedia("(prefers-color-scheme: dark)");
    media.addEventListener("change", applyPreferenceTheme);

    return () => media.removeEventListener("change", applyPreferenceTheme);
  }, [actions, initialized, themePreference]);

  useEffect(() => {
    const syncPreferenceFromSiteTheme = () => {
      const theme = readSiteTheme();
      const current = useAffogatoStore.getState().preferences.theme;
      if (current !== theme) actions.updatePreference("theme", theme);
    };

    const handleClick = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      if (!target.closest("[data-theme-toggle]")) return;
      window.setTimeout(syncPreferenceFromSiteTheme, 0);
    };

    const handleStorage = (event: StorageEvent) => {
      if (event.key === SITE_THEME_STORAGE_KEY) {
        syncPreferenceFromSiteTheme();
      }
    };

    document.addEventListener("click", handleClick);
    window.addEventListener("storage", handleStorage);

    return () => {
      document.removeEventListener("click", handleClick);
      window.removeEventListener("storage", handleStorage);
    };
  }, [actions]);

  return (
    <TooltipProvider>
      <div className="nb-page mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-6 px-4 py-4 sm:px-6 lg:px-8">
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
