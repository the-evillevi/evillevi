import { isFriendId, STARTER_FRIEND_ID } from "./friends";
import { boolOr, clampInt, clampNumber, finiteOrNull } from "./numbers";
import { defaultPreferences, defaultTimer, durationFor } from "./timer";
import type {
  PersistedAffogatoState,
  Preferences,
  Session,
  Task,
  TaskStatus,
  TimerMode,
  TimerState,
  TimerStatus,
} from "./types";

export const STORAGE_KEY = "affogato:v1";
export const MAX_SESSIONS = 500;

const TIMER_MODES: readonly TimerMode[] = ["pomodoro", "shortBreak", "longBreak"];
const TIMER_STATUSES: readonly TimerStatus[] = ["idle", "running", "paused"];
const TASK_STATUSES: readonly TaskStatus[] = ["active", "completed", "archived"];

export function createDefaultState(): PersistedAffogatoState {
  return {
    preferences: defaultPreferences,
    timer: defaultTimer,
    tasks: [],
    sessions: [],
    beans: 0,
    unlockedFriendIds: [STARTER_FRIEND_ID],
    selectedFriendId: STARTER_FRIEND_ID,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isTimerMode(value: unknown): value is TimerMode {
  return TIMER_MODES.includes(value as TimerMode);
}

function isTimerStatus(value: unknown): value is TimerStatus {
  return TIMER_STATUSES.includes(value as TimerStatus);
}

function normalizeTheme(value: unknown): Preferences["theme"] {
  return value === "light" || value === "dark" || value === "system"
    ? value
    : defaultPreferences.theme;
}

export function normalizePreferences(value: Partial<Preferences> = {}): Preferences {
  return {
    pomodoroMinutes: clampInt(value.pomodoroMinutes, 1, 90, defaultPreferences.pomodoroMinutes),
    shortBreakMinutes: clampInt(
      value.shortBreakMinutes,
      1,
      90,
      defaultPreferences.shortBreakMinutes,
    ),
    longBreakMinutes: clampInt(value.longBreakMinutes, 1, 90, defaultPreferences.longBreakMinutes),
    pomodorosPerCycle: clampInt(
      value.pomodorosPerCycle,
      1,
      8,
      defaultPreferences.pomodorosPerCycle,
    ),
    autoStartBreaks: boolOr(value.autoStartBreaks, defaultPreferences.autoStartBreaks),
    autoStartPomodoros: boolOr(value.autoStartPomodoros, defaultPreferences.autoStartPomodoros),
    notificationsEnabled: boolOr(
      value.notificationsEnabled,
      defaultPreferences.notificationsEnabled,
    ),
    soundEnabled: boolOr(value.soundEnabled, defaultPreferences.soundEnabled),
    volume: clampInt(value.volume, 0, 100, defaultPreferences.volume),
    theme: normalizeTheme(value.theme),
    reducedMotion: boolOr(value.reducedMotion, defaultPreferences.reducedMotion),
  };
}

function sanitizeTask(value: unknown): Task | null {
  if (!isRecord(value)) return null;
  if (typeof value.id !== "string" || !value.id) return null;
  if (typeof value.title !== "string" || !value.title.trim()) return null;
  return {
    id: value.id,
    title: value.title,
    estimatedPomodoros: clampInt(value.estimatedPomodoros, 1, 24, 1),
    completedPomodoros: clampInt(value.completedPomodoros, 0, 9999, 0),
    notes: typeof value.notes === "string" ? value.notes : "",
    status: TASK_STATUSES.includes(value.status as TaskStatus)
      ? (value.status as TaskStatus)
      : "active",
    createdAt: finiteOrNull(value.createdAt) ?? Date.now(),
    updatedAt: finiteOrNull(value.updatedAt) ?? Date.now(),
    completedAt: finiteOrNull(value.completedAt),
  };
}

function sanitizeSession(value: unknown): Session | null {
  if (!isRecord(value)) return null;
  if (typeof value.id !== "string" || !value.id || !isTimerMode(value.mode)) return null;
  const startedAt = finiteOrNull(value.startedAt);
  const endedAt = finiteOrNull(value.endedAt);
  if (startedAt === null || endedAt === null) return null;
  return {
    id: value.id,
    mode: value.mode,
    // Dead task IDs are legitimate history; only the live selection is validated.
    taskId: typeof value.taskId === "string" ? value.taskId : null,
    startedAt,
    endedAt,
    durationSeconds: clampNumber(value.durationSeconds, 0, 24 * 3600, 0),
    completed: value.completed === true,
    beansEarned: clampNumber(value.beansEarned, 0, Number.MAX_SAFE_INTEGER, 0),
  };
}

function sanitizeTimer(value: unknown, preferences: Preferences, taskIds: Set<string>): TimerState {
  if (!isRecord(value)) return defaultTimer;
  const mode = isTimerMode(value.mode) ? value.mode : defaultTimer.mode;
  let status = isTimerStatus(value.status) ? value.status : "idle";
  const startedAt = finiteOrNull(value.startedAt);
  // A "running" timer without a start point cannot be resumed meaningfully.
  if (status === "running" && startedAt === null) status = "paused";
  const maxDuration = durationFor(mode, preferences);
  return {
    mode,
    status,
    startedAt: status === "running" ? startedAt : null,
    pausedRemainingSeconds: clampNumber(value.pausedRemainingSeconds, 0, maxDuration, maxDuration),
    completedInCycle: clampInt(value.completedInCycle, 0, preferences.pomodorosPerCycle, 0),
    cycle: clampInt(value.cycle, 1, Number.MAX_SAFE_INTEGER, 1),
    selectedTaskId:
      typeof value.selectedTaskId === "string" && taskIds.has(value.selectedTaskId)
        ? value.selectedTaskId
        : null,
    currentSessionStartedAt: finiteOrNull(value.currentSessionStartedAt),
    currentSessionPlannedSeconds: clampNumber(
      value.currentSessionPlannedSeconds,
      1,
      24 * 3600,
      maxDuration,
    ),
    currentSessionBeans: clampNumber(value.currentSessionBeans, 0, Number.MAX_SAFE_INTEGER, 0),
    lastBeanAccruedAt:
      status === "running" ? (finiteOrNull(value.lastBeanAccruedAt) ?? startedAt) : null,
  };
}

/** Never throws: corrupt or outdated persisted state degrades to safe defaults. */
export function parsePersistedState(value: string | null): PersistedAffogatoState {
  if (!value) return createDefaultState();

  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch {
    return createDefaultState();
  }
  if (!isRecord(parsed)) return createDefaultState();

  const preferences = normalizePreferences(
    isRecord(parsed.preferences) ? (parsed.preferences as Partial<Preferences>) : {},
  );
  const tasks = Array.isArray(parsed.tasks)
    ? parsed.tasks.map(sanitizeTask).filter((task): task is Task => task !== null)
    : [];
  const sessions = Array.isArray(parsed.sessions)
    ? parsed.sessions
        .map(sanitizeSession)
        .filter((session): session is Session => session !== null)
        .slice(0, MAX_SESSIONS)
    : [];

  const unlockedFriendIds = Array.isArray(parsed.unlockedFriendIds)
    ? [...new Set(parsed.unlockedFriendIds.filter(isFriendId))]
    : [];
  if (!unlockedFriendIds.includes(STARTER_FRIEND_ID)) unlockedFriendIds.unshift(STARTER_FRIEND_ID);
  const selectedFriendId =
    isFriendId(parsed.selectedFriendId) && unlockedFriendIds.includes(parsed.selectedFriendId)
      ? parsed.selectedFriendId
      : STARTER_FRIEND_ID;

  return {
    preferences,
    timer: sanitizeTimer(parsed.timer, preferences, new Set(tasks.map((task) => task.id))),
    tasks,
    sessions,
    beans: clampNumber(parsed.beans, 0, Number.MAX_SAFE_INTEGER, 0),
    unlockedFriendIds,
    selectedFriendId,
  };
}

export function serializePersistedState(state: PersistedAffogatoState) {
  return JSON.stringify({
    ...state,
    beans: Math.round(state.beans * 1e4) / 1e4,
    sessions: state.sessions.slice(0, MAX_SESSIONS),
  });
}
