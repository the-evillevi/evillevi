import { toast } from "sonner";
import { create } from "zustand";

import { playBeep, primeAudio } from "./audio";
import { computeStop, computeTick, type SessionDraft, type StopOutcome } from "./engine";
import { STARTER_FRIEND_ID, getFriend } from "./friends";
import { clampInt } from "./numbers";
import {
  MAX_SESSIONS,
  normalizePreferences,
  parsePersistedState,
  serializePersistedState,
  STORAGE_KEY,
} from "./storage";
import { defaultPreferences, defaultTimer, durationFor, getRemainingSeconds, modeLabels } from "./timer";
import type { PersistedAffogatoState, Preferences, TaskDraft, TimerMode } from "./types";

/* Affogato's single source of truth. One store, not several: the slices are
 * interdependent (ticks earn beans, unlocks spend beans, completions credit
 * tasks). Components subscribe with per-field selectors so the 1s tick only
 * re-renders the timer display instead of the whole tree. */

function newId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

interface AffogatoActions {
  /** Load persisted state; `fallbackTheme` seeds first-run theme from the site. */
  initialize: (fallbackTheme?: Preferences["theme"]) => void;
  startTimer: () => void;
  pauseTimer: () => void;
  resetTimer: () => void;
  setMode: (mode: TimerMode) => void;
  /** Called only by startTickInterval — advances the running timer. */
  _tick: (now: number) => void;
  addTask: (draft: TaskDraft) => void;
  selectTask: (taskId: string) => void;
  completeTask: (taskId: string) => void;
  deleteTask: (taskId: string) => void;
  updatePreference: <K extends keyof Preferences>(key: K, value: Preferences[K]) => void;
  requestNotifications: (enabled: boolean) => void;
  restoreDefaultPreferences: () => void;
  setEffectiveTheme: (theme: "light" | "dark") => void;
  selectFriend: (friendId: string) => void;
  unlockFriend: (friendId: string) => void;
}

export interface AffogatoStore extends PersistedAffogatoState {
  initialized: boolean;
  remainingSeconds: number;
  beanPulse: boolean;
  effectiveTheme: "light" | "dark";
  actions: AffogatoActions;
}

export const useAffogatoStore = create<AffogatoStore>()((set, get) => {
  function pulseBeans() {
    window.setTimeout(() => set({ beanPulse: false }), 260);
  }

  function recordSession(draft: SessionDraft) {
    set((state) => ({
      sessions: [{ ...draft, id: newId("session") }, ...state.sessions].slice(0, MAX_SESSIONS),
    }));
  }

  function applyStop(outcome: StopOutcome) {
    const { timer, preferences } = get();
    const result = computeStop(timer, preferences, Date.now(), outcome);
    set((state) => ({
      timer: result.timer,
      remainingSeconds: result.remainingSeconds,
      ...(result.earnedBeans > 0
        ? { beans: state.beans + result.earnedBeans, beanPulse: true }
        : {}),
    }));
    if (result.earnedBeans > 0) pulseBeans();
    if (result.session) recordSession(result.session);
  }

  function applyPreferences(next: Preferences) {
    set({ preferences: next });
    const { timer } = get();
    if (timer.status === "idle") {
      const nextDuration = durationFor(timer.mode, next);
      set((state) =>
        state.timer.status === "idle"
          ? {
              timer: {
                ...state.timer,
                pausedRemainingSeconds: nextDuration,
                currentSessionPlannedSeconds: nextDuration,
              },
              remainingSeconds: nextDuration,
            }
          : {},
      );
    }
  }

  return {
    initialized: false,
    timer: defaultTimer,
    remainingSeconds: defaultTimer.pausedRemainingSeconds,
    preferences: defaultPreferences,
    effectiveTheme: "light",
    tasks: [],
    sessions: [],
    beans: 0,
    beanPulse: false,
    unlockedFriendIds: [STARTER_FRIEND_ID],
    selectedFriendId: STARTER_FRIEND_ID,

    actions: {
      initialize(fallbackTheme) {
        const raw = localStorage.getItem(STORAGE_KEY);
        const state = parsePersistedState(raw);
        const preferences =
          raw || !fallbackTheme
            ? state.preferences
            : normalizePreferences({ ...state.preferences, theme: fallbackTheme });
        set({
          ...state,
          preferences,
          remainingSeconds: getRemainingSeconds(state.timer, preferences),
          initialized: true,
        });
      },

      _tick(now) {
        const { timer, preferences } = get();
        const result = computeTick(timer, preferences, now);
        set((state) => ({
          timer: result.timer,
          remainingSeconds: result.remainingSeconds,
          ...(result.earnedBeans > 0
            ? { beans: state.beans + result.earnedBeans, beanPulse: true }
            : {}),
        }));
        if (result.earnedBeans > 0) pulseBeans();

        if (result.completion) {
          const { session, creditTaskId, completedMode } = result.completion;
          const prefs = get().preferences;
          if (session) recordSession(session);
          if (creditTaskId) {
            set((state) => ({
              tasks: state.tasks.map((task) =>
                task.id === creditTaskId
                  ? {
                      ...task,
                      completedPomodoros: task.completedPomodoros + 1,
                      updatedAt: session?.endedAt ?? now,
                    }
                  : task,
              ),
            }));
          }
          if (prefs.soundEnabled) playBeep(prefs.volume);
          if (
            prefs.notificationsEnabled &&
            "Notification" in window &&
            Notification.permission === "granted"
          ) {
            new Notification("Affogato timer complete", {
              body: `${modeLabels[completedMode]} is done.`,
            });
          }
          toast.success(`${modeLabels[completedMode]} complete`, {
            description: "Beans banked. Nice and steady.",
          });
        }
      },

      startTimer() {
        primeAudio();
        const now = Date.now();
        const { preferences } = get();
        set((state) => ({
          timer: {
            ...state.timer,
            status: "running",
            startedAt: now,
            pausedRemainingSeconds: getRemainingSeconds(state.timer, preferences, now),
            currentSessionStartedAt: state.timer.currentSessionStartedAt ?? now,
            currentSessionPlannedSeconds: state.timer.currentSessionStartedAt
              ? state.timer.currentSessionPlannedSeconds
              : durationFor(state.timer.mode, preferences),
            lastBeanAccruedAt: state.timer.lastBeanAccruedAt ?? now,
          },
        }));
      },

      pauseTimer() {
        applyStop({ kind: "pause" });
      },

      resetTimer() {
        applyStop({ kind: "reset" });
      },

      setMode(mode) {
        applyStop({ kind: "setMode", mode });
      },

      addTask(draft) {
        if (!draft.title.trim()) return;
        const now = Date.now();
        const task = {
          id: newId("task"),
          title: draft.title.trim(),
          estimatedPomodoros: clampInt(draft.estimatedPomodoros, 1, 24, 1),
          completedPomodoros: 0,
          notes: draft.notes.trim(),
          status: "active" as const,
          createdAt: now,
          updatedAt: now,
          completedAt: null,
        };
        set((state) => ({
          tasks: [task, ...state.tasks],
          timer: { ...state.timer, selectedTaskId: task.id },
        }));
      },

      selectTask(taskId) {
        const task = get().tasks.find((item) => item.id === taskId);
        if (!task || task.status === "completed") return;
        set((state) => ({ timer: { ...state.timer, selectedTaskId: taskId } }));
      },

      completeTask(taskId) {
        const now = Date.now();
        set((state) => ({
          tasks: state.tasks.map((task) =>
            task.id === taskId
              ? { ...task, status: "completed" as const, completedAt: now, updatedAt: now }
              : task,
          ),
          // Completed tasks stop receiving session attribution.
          timer:
            state.timer.selectedTaskId === taskId
              ? { ...state.timer, selectedTaskId: null }
              : state.timer,
        }));
      },

      deleteTask(taskId) {
        set((state) => ({
          tasks: state.tasks.filter((task) => task.id !== taskId),
          timer:
            state.timer.selectedTaskId === taskId
              ? { ...state.timer, selectedTaskId: null }
              : state.timer,
        }));
      },

      updatePreference(key, value) {
        applyPreferences(normalizePreferences({ ...get().preferences, [key]: value }));
      },

      requestNotifications(enabled) {
        get().actions.updatePreference("notificationsEnabled", enabled);
        if (enabled && "Notification" in window && Notification.permission === "default") {
          Notification.requestPermission();
        }
      },

      restoreDefaultPreferences() {
        applyPreferences(defaultPreferences);
      },

      setEffectiveTheme(theme) {
        set({ effectiveTheme: theme });
      },

      selectFriend(friendId) {
        if (!get().unlockedFriendIds.includes(friendId)) return;
        set({ selectedFriendId: friendId });
      },

      unlockFriend(friendId) {
        const friend = getFriend(friendId);
        if (friend.id !== friendId) return; // unknown id resolved to starter
        const { unlockedFriendIds, beans } = get();
        if (unlockedFriendIds.includes(friendId) || beans < friend.cost) return;
        set((state) => ({
          beans: Math.max(0, state.beans - friend.cost),
          unlockedFriendIds: state.unlockedFriendIds.includes(friendId)
            ? state.unlockedFriendIds
            : [...state.unlockedFriendIds, friendId],
          selectedFriendId: friendId,
          beanPulse: true,
        }));
        pulseBeans();
        toast.success(`${friend.name} joined your café!`, {
          description: `${friend.cost} beans well spent.`,
        });
      },
    },
  };
});

/* ── Module-level side effects, started once from AffogatoApp's mount ────── */

let tickInterval: number | null = null;

/** The 1s tick lives outside React: store.getState() is always live, so no
 *  refs, no stale closures, no interval teardown on state changes. */
export function startTickInterval() {
  if (tickInterval !== null) return;
  tickInterval = window.setInterval(() => {
    useAffogatoStore.getState().actions._tick(Date.now());
  }, 1000);
}

let persistenceReady = false;

/** 2s-debounced localStorage writes with immediate flushes on run-state
 *  changes, tab hide, and pagehide — same semantics as before the store. */
export function setupPersistence() {
  if (persistenceReady) return;
  persistenceReady = true;

  let snapshot: PersistedAffogatoState | null = null;
  let timeout: number | null = null;

  const write = () => {
    timeout = null;
    if (snapshot) localStorage.setItem(STORAGE_KEY, serializePersistedState(snapshot));
  };
  const flush = () => {
    if (timeout !== null) window.clearTimeout(timeout);
    write();
  };

  useAffogatoStore.subscribe((state, previous) => {
    if (!state.initialized) return;
    snapshot = {
      preferences: state.preferences,
      timer: state.timer,
      tasks: state.tasks,
      sessions: state.sessions,
      beans: state.beans,
      unlockedFriendIds: state.unlockedFriendIds,
      selectedFriendId: state.selectedFriendId,
    };
    if (state.timer.status !== previous.timer.status) {
      flush();
      return;
    }
    timeout ??= window.setTimeout(write, 2000);
  });

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") flush();
  });
  window.addEventListener("pagehide", flush);
}

/** Convenience selector: the selected friend's model path. */
export function selectFriendModelPath(state: AffogatoStore) {
  return getFriend(state.selectedFriendId).modelPath;
}
