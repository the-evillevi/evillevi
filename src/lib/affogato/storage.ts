import { defaultPreferences, defaultTimer } from "./timer";
import type { PersistedAffogatoState, Preferences } from "./types";

export const STORAGE_KEY = "affogato:v1";

export function createDefaultState(): PersistedAffogatoState {
  return {
    preferences: defaultPreferences,
    timer: defaultTimer,
    tasks: [],
    sessions: [],
    beans: 0,
  };
}

function clampNumber(value: unknown, min: number, max: number, fallback: number) {
  const number = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(max, Math.max(min, Math.round(number)));
}

export function normalizePreferences(value: Partial<Preferences> = {}) {
  return {
    ...defaultPreferences,
    ...value,
    pomodoroMinutes: clampNumber(value.pomodoroMinutes, 1, 90, defaultPreferences.pomodoroMinutes),
    shortBreakMinutes: clampNumber(
      value.shortBreakMinutes,
      1,
      90,
      defaultPreferences.shortBreakMinutes,
    ),
    longBreakMinutes: clampNumber(
      value.longBreakMinutes,
      1,
      90,
      defaultPreferences.longBreakMinutes,
    ),
    pomodorosPerCycle: clampNumber(
      value.pomodorosPerCycle,
      1,
      8,
      defaultPreferences.pomodorosPerCycle,
    ),
    volume: clampNumber(value.volume, 0, 100, defaultPreferences.volume),
    theme: ["light", "dark", "system"].includes(value.theme ?? "")
      ? value.theme
      : defaultPreferences.theme,
  } satisfies Preferences;
}

export function parsePersistedState(value: string | null) {
  if (!value) return createDefaultState();

  const parsed = JSON.parse(value) as Partial<PersistedAffogatoState>;

  const timer = {
    ...defaultTimer,
    ...parsed.timer,
  };

  return {
    preferences: normalizePreferences(parsed.preferences),
    timer: {
      ...timer,
      lastBeanAccruedAt:
        timer.status === "running" ? (timer.lastBeanAccruedAt ?? timer.startedAt) : null,
    },
    tasks: parsed.tasks ?? [],
    sessions: parsed.sessions ?? [],
    beans: parsed.beans ?? 0,
  };
}

export function serializePersistedState(state: PersistedAffogatoState) {
  return JSON.stringify(state);
}
