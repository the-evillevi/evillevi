import type {
  MonsterTrackerRole,
  MonsterTrackerStorageState,
  Routine,
  RoutineCompletion,
} from "./types";

const storageKey = "monster-tracker:v1";

const defaultState: MonsterTrackerStorageState = {
  role: "user",
  createdRoutines: [],
  completions: [],
};

function canUseStorage(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function isRole(value: unknown): value is MonsterTrackerRole {
  return value === "user" || value === "coach";
}

function sanitizeState(value: unknown): MonsterTrackerStorageState {
  if (!value || typeof value !== "object") return defaultState;

  const maybeState = value as Partial<MonsterTrackerStorageState>;

  return {
    role: isRole(maybeState.role) ? maybeState.role : defaultState.role,
    createdRoutines: Array.isArray(maybeState.createdRoutines)
      ? (maybeState.createdRoutines as Routine[])
      : defaultState.createdRoutines,
    completions: Array.isArray(maybeState.completions)
      ? (maybeState.completions as RoutineCompletion[])
      : defaultState.completions,
  };
}

export function loadMonsterTrackerState(): MonsterTrackerStorageState {
  if (!canUseStorage()) return defaultState;

  try {
    const rawValue = window.localStorage.getItem(storageKey);
    return rawValue ? sanitizeState(JSON.parse(rawValue)) : defaultState;
  } catch {
    return defaultState;
  }
}

export function saveMonsterTrackerState(state: MonsterTrackerStorageState): void {
  if (!canUseStorage()) return;

  try {
    window.localStorage.setItem(storageKey, JSON.stringify(state));
  } catch {
    // Persistence is best-effort so the component can still work in private or restricted contexts.
  }
}
