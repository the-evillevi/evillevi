import type { Preferences, TimerMode, TimerState } from "./types";

export const defaultPreferences: Preferences = {
  pomodoroMinutes: 25,
  shortBreakMinutes: 5,
  longBreakMinutes: 15,
  pomodorosPerCycle: 4,
  autoStartBreaks: false,
  autoStartPomodoros: false,
  notificationsEnabled: false,
  soundEnabled: true,
  volume: 70,
  theme: "system",
  reducedMotion: false,
};

export const defaultTimer: TimerState = {
  mode: "pomodoro",
  status: "idle",
  startedAt: null,
  pausedRemainingSeconds: defaultPreferences.pomodoroMinutes * 60,
  completedInCycle: 0,
  cycle: 1,
  selectedTaskId: null,
  currentSessionStartedAt: null,
  currentSessionBeans: 0,
  lastBeanAccruedAt: null,
};

export const modeLabels: Record<TimerMode, string> = {
  pomodoro: "Focus",
  shortBreak: "Short break",
  longBreak: "Long break",
};

export function durationFor(mode: TimerMode, preferences: Preferences) {
  const minutes = {
    pomodoro: preferences.pomodoroMinutes,
    shortBreak: preferences.shortBreakMinutes,
    longBreak: preferences.longBreakMinutes,
  }[mode];
  return Math.max(1, Math.round(minutes)) * 60;
}

export function getRemainingSeconds(
  timer: TimerState,
  preferences: Preferences,
  at = Date.now(),
) {
  if (timer.status === "running" && timer.startedAt) {
    const elapsed = Math.floor((at - timer.startedAt) / 1000);
    return Math.max(0, timer.pausedRemainingSeconds - elapsed);
  }

  return timer.pausedRemainingSeconds;
}

export function clampProgress(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.min(100, Math.max(0, value));
}

export function formatTime(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60)
    .toString()
    .padStart(2, "0");
  const seconds = Math.floor(totalSeconds % 60)
    .toString()
    .padStart(2, "0");
  return `${minutes}:${seconds}`;
}

export function nextModeAfterCompletion(
  timer: TimerState,
  preferences: Preferences,
) {
  if (timer.mode !== "pomodoro") {
    return "pomodoro" satisfies TimerMode;
  }

  return timer.completedInCycle + 1 >= preferences.pomodorosPerCycle
    ? "longBreak"
    : "shortBreak";
}

export function nextCycleAfterCompletion(timer: TimerState) {
  return timer.mode === "longBreak" ? timer.cycle + 1 : timer.cycle;
}

export function nextCompletedInCycleAfterCompletion(
  timer: TimerState,
  preferences: Preferences,
) {
  if (timer.mode === "longBreak") return 0;
  if (timer.mode !== "pomodoro") return timer.completedInCycle;
  return Math.min(timer.completedInCycle + 1, preferences.pomodorosPerCycle);
}

export function shouldAutoStartNextTimer(
  completedMode: TimerMode,
  preferences: Preferences,
) {
  return completedMode === "pomodoro"
    ? preferences.autoStartBreaks
    : preferences.autoStartPomodoros;
}
