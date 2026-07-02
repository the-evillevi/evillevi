import { calculateEarnedBeans, elapsedBeanSeconds } from "./beans";
import {
  durationFor,
  getRemainingSeconds,
  nextCompletedInCycleAfterCompletion,
  nextCycleAfterCompletion,
  nextModeAfterCompletion,
  shouldAutoStartNextTimer,
} from "./timer";
import type { Preferences, Session, TimerMode, TimerState } from "./types";

/* Pure timer transitions. React state setters must never run inside another
 * setter's updater (updaters must be pure), so the app computes one of these
 * result objects first and then applies every setState at the top level. */

export type SessionDraft = Omit<Session, "id">;

export type TickResult = {
  timer: TimerState;
  remainingSeconds: number;
  earnedBeans: number;
  completion: {
    session: SessionDraft | null;
    creditTaskId: string | null;
    completedMode: TimerMode;
  } | null;
};

export type StopOutcome = { kind: "pause" } | { kind: "reset" } | { kind: "setMode"; mode: TimerMode };

export type StopResult = {
  timer: TimerState;
  remainingSeconds: number;
  earnedBeans: number;
  session: SessionDraft | null;
};

/** Bank beans elapsed since the last accrual, capped at the session boundary. */
function accrue(
  timer: TimerState,
  preferences: Preferences,
  now: number,
): { timer: TimerState; earnedBeans: number } {
  if (timer.status !== "running") return { timer, earnedBeans: 0 };
  const earnedSeconds = Math.min(
    elapsedBeanSeconds(timer.lastBeanAccruedAt, now),
    getRemainingSeconds(timer, preferences, timer.lastBeanAccruedAt ?? now),
  );
  if (earnedSeconds <= 0) return { timer, earnedBeans: 0 };
  const earnedBeans = calculateEarnedBeans(earnedSeconds);
  return {
    timer: {
      ...timer,
      currentSessionBeans: timer.currentSessionBeans + earnedBeans,
      lastBeanAccruedAt: now,
    },
    earnedBeans,
  };
}

function sessionDraft(
  timer: TimerState,
  endedAt: number,
  durationSeconds: number,
  completed: boolean,
): SessionDraft | null {
  if (!timer.currentSessionStartedAt) return null;
  if (!completed && durationSeconds === 0 && timer.currentSessionBeans === 0) return null;
  return {
    mode: timer.mode,
    taskId: timer.selectedTaskId,
    startedAt: timer.currentSessionStartedAt,
    endedAt,
    durationSeconds,
    completed,
    beansEarned: timer.currentSessionBeans,
  };
}

export function computeTick(timer: TimerState, preferences: Preferences, now: number): TickResult {
  if (timer.status !== "running") {
    return {
      timer,
      remainingSeconds: getRemainingSeconds(timer, preferences, now),
      earnedBeans: 0,
      completion: null,
    };
  }

  const accrued = accrue(timer, preferences, now);
  const remaining = getRemainingSeconds(accrued.timer, preferences, now);
  if (remaining > 0) {
    return {
      timer: accrued.timer,
      remainingSeconds: remaining,
      earnedBeans: accrued.earnedBeans,
      completion: null,
    };
  }

  const current = accrued.timer;
  const completedMode = current.mode;
  const autoStart = shouldAutoStartNextTimer(completedMode, preferences);
  const nextMode = nextModeAfterCompletion(current, preferences);
  const nextDuration = durationFor(nextMode, preferences);

  return {
    timer: {
      ...current,
      mode: nextMode,
      status: autoStart ? "running" : "idle",
      startedAt: autoStart ? now : null,
      pausedRemainingSeconds: nextDuration,
      completedInCycle: nextCompletedInCycleAfterCompletion(current, preferences),
      cycle: nextCycleAfterCompletion(current),
      currentSessionStartedAt: autoStart ? now : null,
      currentSessionPlannedSeconds: nextDuration,
      currentSessionBeans: 0,
      lastBeanAccruedAt: autoStart ? now : null,
    },
    remainingSeconds: nextDuration,
    earnedBeans: accrued.earnedBeans,
    completion: {
      // Completed sessions record the duration planned at session start, not
      // whatever the preference happens to be at completion time.
      session: sessionDraft(current, now, current.currentSessionPlannedSeconds, true),
      creditTaskId: completedMode === "pomodoro" ? current.selectedTaskId : null,
      completedMode,
    },
  };
}

export function computeStop(
  timer: TimerState,
  preferences: Preferences,
  now: number,
  outcome: StopOutcome,
): StopResult {
  const accrued = accrue(timer, preferences, now);
  const current = accrued.timer;
  const remaining = getRemainingSeconds(current, preferences, now);

  if (outcome.kind === "pause") {
    return {
      timer: {
        ...current,
        status: "paused",
        startedAt: null,
        pausedRemainingSeconds: remaining,
        lastBeanAccruedAt: null,
      },
      remainingSeconds: remaining,
      earnedBeans: accrued.earnedBeans,
      // The session continues across a pause; nothing is recorded yet.
      session: null,
    };
  }

  const mode = outcome.kind === "setMode" ? outcome.mode : current.mode;
  const nextDuration = durationFor(mode, preferences);
  const elapsed = Math.max(0, current.currentSessionPlannedSeconds - remaining);
  const shouldRecord = outcome.kind === "reset" || timer.status !== "idle";

  return {
    timer: {
      ...current,
      mode,
      status: "idle",
      startedAt: null,
      pausedRemainingSeconds: nextDuration,
      currentSessionStartedAt: null,
      currentSessionPlannedSeconds: nextDuration,
      currentSessionBeans: 0,
      lastBeanAccruedAt: null,
    },
    remainingSeconds: nextDuration,
    earnedBeans: accrued.earnedBeans,
    session: shouldRecord ? sessionDraft(current, now, elapsed, false) : null,
  };
}
