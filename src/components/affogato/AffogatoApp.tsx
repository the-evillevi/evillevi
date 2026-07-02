import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { AffogatoHeader } from "@/components/affogato/AffogatoHeader";
import { FriendsPanel } from "@/components/affogato/FriendsPanel";
import { StatsPanel } from "@/components/affogato/StatsPanel";
import { TasksPanel } from "@/components/affogato/TasksPanel";
import { TimerWorkspace } from "@/components/affogato/TimerWorkspace";
import { Toaster } from "@/components/shadcn/sonner";
import { TooltipProvider } from "@/components/shadcn/tooltip";

import { playBeep, primeAudio } from "@/lib/affogato/audio";
import { computeStop, computeTick, type SessionDraft, type StopOutcome } from "@/lib/affogato/engine";
import { getFriend, STARTER_FRIEND_ID } from "@/lib/affogato/friends";
import { clampInt } from "@/lib/affogato/numbers";
import {
  MAX_SESSIONS,
  normalizePreferences,
  parsePersistedState,
  serializePersistedState,
  STORAGE_KEY,
} from "@/lib/affogato/storage";
import { focusMinutesForSessions, sessionsForDay, sevenDayFocusStats } from "@/lib/affogato/stats";
import {
  defaultPreferences,
  defaultTimer,
  durationFor,
  formatTime,
  getRemainingSeconds,
  modeLabels,
} from "@/lib/affogato/timer";
import type {
  PersistedAffogatoState,
  Preferences,
  Session,
  Task,
  TaskDraft,
  TimerMode,
} from "@/lib/affogato/types";

function newId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

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
  const [preferences, setPreferences] = useState(defaultPreferences);
  const [timer, setTimer] = useState(defaultTimer);
  const [remainingSeconds, setRemainingSeconds] = useState(defaultTimer.pausedRemainingSeconds);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [beans, setBeans] = useState(0);
  const [unlockedFriendIds, setUnlockedFriendIds] = useState<string[]>([STARTER_FRIEND_ID]);
  const [selectedFriendId, setSelectedFriendId] = useState(STARTER_FRIEND_ID);
  const [beanPulse, setBeanPulse] = useState(false);
  const [loaded, setLoaded] = useState(false);
  // Resolved in effects (never during render — matchMedia would break SSR).
  const [effectiveTheme, setEffectiveTheme] = useState<"light" | "dark">("light");
  const initialDocumentTitle = useRef<string | null>(null);

  /* The 1s interval is registered once and reads live state through refs, so
   * task/preference edits don't tear the interval down, and every setState it
   * makes happens at the top level of the callback with pure updaters. */
  const timerRef = useRef(timer);
  const preferencesRef = useRef(preferences);
  useEffect(() => {
    timerRef.current = timer;
  }, [timer]);
  useEffect(() => {
    preferencesRef.current = preferences;
  }, [preferences]);

  const activeTask = tasks.find((task) => task.id === timer.selectedTaskId) ?? null;
  const completedTasks = tasks.filter((task) => task.status === "completed").length;
  const todaySessions = sessionsForDay(sessions);
  const focusMinutesToday = focusMinutesForSessions(todaySessions);

  const sevenDayStats = useMemo(() => {
    return sevenDayFocusStats(sessions);
  }, [sessions]);

  useEffect(() => {
    const state = parsePersistedState(localStorage.getItem(STORAGE_KEY));
    if (localStorage.getItem(STORAGE_KEY)) {
      setPreferences(state.preferences);
      setTimer(state.timer);
      setRemainingSeconds(getRemainingSeconds(state.timer, state.preferences));
      setTasks(state.tasks);
      setSessions(state.sessions);
      setBeans(state.beans);
      setUnlockedFriendIds(state.unlockedFriendIds);
      setSelectedFriendId(state.selectedFriendId);
    } else {
      setPreferences(
        normalizePreferences({
          ...defaultPreferences,
          theme: readSiteTheme(),
        }),
      );
    }
    setLoaded(true);
  }, []);

  /* Persistence: trailing 2s debounce (the timer writes every second
   * otherwise), flushed when the tab hides/unloads or the run state flips. */
  const persistSnapshot = useRef<PersistedAffogatoState | null>(null);
  const persistTimeout = useRef<number | null>(null);

  function flushPersist() {
    if (persistTimeout.current !== null) {
      window.clearTimeout(persistTimeout.current);
      persistTimeout.current = null;
    }
    if (persistSnapshot.current) {
      localStorage.setItem(STORAGE_KEY, serializePersistedState(persistSnapshot.current));
    }
  }

  useEffect(() => {
    if (!loaded) return;
    persistSnapshot.current = {
      preferences,
      timer,
      tasks,
      sessions,
      beans,
      unlockedFriendIds,
      selectedFriendId,
    };
    persistTimeout.current ??= window.setTimeout(() => {
      persistTimeout.current = null;
      if (persistSnapshot.current) {
        localStorage.setItem(STORAGE_KEY, serializePersistedState(persistSnapshot.current));
      }
    }, 2000);
  }, [beans, loaded, preferences, selectedFriendId, sessions, tasks, timer, unlockedFriendIds]);

  const prevStatus = useRef(timer.status);
  useEffect(() => {
    if (!loaded) return;
    if (prevStatus.current !== timer.status) {
      prevStatus.current = timer.status;
      flushPersist();
    }
  }, [loaded, timer.status]);

  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === "hidden") flushPersist();
    };
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", flushPersist);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", flushPersist);
      flushPersist();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!loaded) return;

    const applyPreferenceTheme = () => {
      const resolved = resolvedTheme(preferences.theme);
      applySiteTheme(resolved);
      setEffectiveTheme(resolved);
    };

    applyPreferenceTheme();

    if (preferences.theme !== "system") return;

    const media = window.matchMedia("(prefers-color-scheme: dark)");
    media.addEventListener("change", applyPreferenceTheme);

    return () => media.removeEventListener("change", applyPreferenceTheme);
  }, [loaded, preferences.theme]);

  useEffect(() => {
    const syncPreferenceFromSiteTheme = () => {
      const theme = readSiteTheme();
      setPreferences((current) =>
        current.theme === theme ? current : normalizePreferences({ ...current, theme }),
      );
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
  }, []);

  useEffect(() => {
    initialDocumentTitle.current = document.title;

    return () => {
      if (initialDocumentTitle.current) {
        document.title = initialDocumentTitle.current;
      }
    };
  }, []);

  useEffect(() => {
    const baseTitle = initialDocumentTitle.current ?? document.title;
    document.title =
      timer.status === "running" ? `${formatTime(remainingSeconds)} - ${baseTitle}` : baseTitle;
  }, [remainingSeconds, timer.status]);

  function pulseBeans() {
    setBeanPulse(true);
    window.setTimeout(() => setBeanPulse(false), 260);
  }

  function recordSession(draft: SessionDraft) {
    setSessions((items) => [{ ...draft, id: newId("session") }, ...items].slice(0, MAX_SESSIONS));
  }

  useEffect(() => {
    const interval = window.setInterval(() => {
      const result = computeTick(timerRef.current, preferencesRef.current, Date.now());
      if (result.timer !== timerRef.current) setTimer(result.timer);
      setRemainingSeconds(result.remainingSeconds);
      if (result.earnedBeans > 0) {
        setBeans((value) => value + result.earnedBeans);
        pulseBeans();
      }

      if (result.completion) {
        const { session, creditTaskId, completedMode } = result.completion;
        const prefs = preferencesRef.current;
        if (session) recordSession(session);
        if (creditTaskId) {
          setTasks((items) =>
            items.map((task) =>
              task.id === creditTaskId
                ? {
                    ...task,
                    completedPomodoros: task.completedPomodoros + 1,
                    updatedAt: session?.endedAt ?? Date.now(),
                  }
                : task,
            ),
          );
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
    }, 1000);

    return () => window.clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function startTimer() {
    primeAudio();
    const now = Date.now();
    setTimer((current) => ({
      ...current,
      status: "running",
      startedAt: now,
      pausedRemainingSeconds: getRemainingSeconds(current, preferences, now),
      currentSessionStartedAt: current.currentSessionStartedAt ?? now,
      currentSessionPlannedSeconds: current.currentSessionStartedAt
        ? current.currentSessionPlannedSeconds
        : durationFor(current.mode, preferences),
      lastBeanAccruedAt: current.lastBeanAccruedAt ?? now,
    }));
  }

  function applyStop(outcome: StopOutcome) {
    const result = computeStop(timer, preferences, Date.now(), outcome);
    setTimer(result.timer);
    setRemainingSeconds(result.remainingSeconds);
    if (result.earnedBeans > 0) {
      setBeans((value) => value + result.earnedBeans);
      pulseBeans();
    }
    if (result.session) recordSession(result.session);
  }

  function pauseTimer() {
    applyStop({ kind: "pause" });
  }

  function resetTimer() {
    applyStop({ kind: "reset" });
  }

  function setMode(mode: TimerMode) {
    applyStop({ kind: "setMode", mode });
  }

  function addTask(draft: TaskDraft) {
    if (!draft.title.trim()) return;
    const now = Date.now();
    const task: Task = {
      id: newId("task"),
      title: draft.title.trim(),
      estimatedPomodoros: clampInt(draft.estimatedPomodoros, 1, 24, 1),
      completedPomodoros: 0,
      notes: draft.notes.trim(),
      status: "active",
      createdAt: now,
      updatedAt: now,
      completedAt: null,
    };
    setTasks((items) => [task, ...items]);
    setTimer((current) => ({ ...current, selectedTaskId: task.id }));
  }

  function selectTask(taskId: string) {
    const task = tasks.find((item) => item.id === taskId);
    if (!task || task.status === "completed") return;
    setTimer((current) => ({ ...current, selectedTaskId: taskId }));
  }

  function clearSelectedTask(taskId: string) {
    setTimer((current) =>
      current.selectedTaskId === taskId ? { ...current, selectedTaskId: null } : current,
    );
  }

  function completeTask(taskId: string) {
    const now = Date.now();
    setTasks((items) =>
      items.map((task) =>
        task.id === taskId
          ? { ...task, status: "completed", completedAt: now, updatedAt: now }
          : task,
      ),
    );
    // Completed tasks stop receiving session attribution.
    clearSelectedTask(taskId);
  }

  function deleteTask(taskId: string) {
    setTasks((items) => items.filter((task) => task.id !== taskId));
    clearSelectedTask(taskId);
  }

  function applyPreferences(next: Preferences) {
    setPreferences(next);
    if (timer.status === "idle") {
      const nextDuration = durationFor(timer.mode, next);
      setTimer((current) =>
        current.status === "idle"
          ? {
              ...current,
              pausedRemainingSeconds: nextDuration,
              currentSessionPlannedSeconds: nextDuration,
            }
          : current,
      );
      setRemainingSeconds(nextDuration);
    }
  }

  function updatePreference<K extends keyof Preferences>(key: K, value: Preferences[K]) {
    applyPreferences(normalizePreferences({ ...preferences, [key]: value }));
  }

  function requestNotifications(enabled: boolean) {
    updatePreference("notificationsEnabled", enabled);
    if (enabled && "Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }

  function restoreDefaultPreferences() {
    applyPreferences(defaultPreferences);
  }

  function selectFriend(friendId: string) {
    if (!unlockedFriendIds.includes(friendId)) return;
    setSelectedFriendId(friendId);
  }

  function unlockFriend(friendId: string) {
    const friend = getFriend(friendId);
    if (friend.id !== friendId) return; // unknown id resolved to starter
    if (unlockedFriendIds.includes(friendId) || beans < friend.cost) return;
    setBeans((value) => Math.max(0, value - friend.cost));
    setUnlockedFriendIds((ids) => (ids.includes(friendId) ? ids : [...ids, friendId]));
    setSelectedFriendId(friendId);
    pulseBeans();
    toast.success(`${friend.name} joined your café!`, {
      description: `${friend.cost} beans well spent.`,
    });
  }

  const beanLabel =
    beans >= 10_000
      ? new Intl.NumberFormat(undefined, { notation: "compact", maximumFractionDigits: 1 }).format(
          beans,
        )
      : beans.toLocaleString(undefined, { maximumFractionDigits: 1 });

  return (
    <TooltipProvider>
      <div className="nb-page mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-6 px-4 py-4 sm:px-6 lg:px-8">
        <AffogatoHeader
          beanLabel={beanLabel}
          beanPulse={beanPulse}
          theme={effectiveTheme}
          onToggleTheme={() =>
            updatePreference("theme", effectiveTheme === "dark" ? "light" : "dark")
          }
        >
          <TasksPanel
            activeTaskId={activeTask?.id ?? null}
            tasks={tasks}
            onAddTask={addTask}
            onCompleteTask={completeTask}
            onDeleteTask={deleteTask}
            onSelectTask={selectTask}
          />
          <FriendsPanel
            beanLabel={beanLabel}
            beans={beans}
            selectedFriendId={selectedFriendId}
            unlockedFriendIds={unlockedFriendIds}
            onSelectFriend={selectFriend}
            onUnlockFriend={unlockFriend}
          />
          <StatsPanel
            beans={beans}
            completedTasks={completedTasks}
            currentCycle={timer.cycle}
            focusMinutesToday={focusMinutesToday}
            sevenDayStats={sevenDayStats}
            sessionsToday={todaySessions.length}
          />
        </AffogatoHeader>

        <TimerWorkspace
          friendModelPath={getFriend(selectedFriendId).modelPath}
          preferences={preferences}
          remainingSeconds={remainingSeconds}
          timer={timer}
          onModeChange={setMode}
          onPause={pauseTimer}
          onPreferenceChange={updatePreference}
          onRequestNotifications={requestNotifications}
          onReset={resetTimer}
          onRestoreDefaults={restoreDefaultPreferences}
          onStart={startTimer}
          onToggleSound={() => updatePreference("soundEnabled", !preferences.soundEnabled)}
        />

        <Toaster richColors position="bottom-right" />
      </div>
    </TooltipProvider>
  );
}
