import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { AffogatoHeader } from "@/components/affogato/AffogatoHeader";
import { StatsPanel } from "@/components/affogato/StatsPanel";
import { TasksPanel } from "@/components/affogato/TasksPanel";
import { TimerWorkspace } from "@/components/affogato/TimerWorkspace";
import { Toaster } from "@/components/shadcn/sonner";
import { TooltipProvider } from "@/components/shadcn/tooltip";

import { calculateEarnedBeans, elapsedBeanSeconds } from "@/lib/affogato/beans";
import {
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
  nextCompletedInCycleAfterCompletion,
  nextCycleAfterCompletion,
  nextModeAfterCompletion,
  shouldAutoStartNextTimer,
} from "@/lib/affogato/timer";
import type {
  Preferences,
  Session,
  Task,
  TaskDraft,
  TimerMode,
  TimerState,
  TimerStatus,
} from "@/lib/affogato/types";

function newId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function clampNumber(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, Number.isFinite(value) ? value : min));
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
  const [beanPulse, setBeanPulse] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const initialDocumentTitle = useRef<string | null>(null);

  const activeTask = tasks.find((task) => task.id === timer.selectedTaskId) ?? null;
  const completedTasks = tasks.filter((task) => task.status === "completed").length;
  const todaySessions = sessionsForDay(sessions);
  const focusMinutesToday = focusMinutesForSessions(todaySessions);

  const sevenDayStats = useMemo(() => {
    return sevenDayFocusStats(sessions);
  }, [sessions]);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const state = parsePersistedState(saved);
        setPreferences(state.preferences);
        setTimer(state.timer);
        setRemainingSeconds(getRemainingSeconds(state.timer, state.preferences));
        setTasks(state.tasks);
        setSessions(state.sessions);
        setBeans(state.beans);
      } catch {
        localStorage.removeItem(STORAGE_KEY);
      }
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

  useEffect(() => {
    if (!loaded) return;
    localStorage.setItem(
      STORAGE_KEY,
      serializePersistedState({ preferences, timer, tasks, sessions, beans }),
    );
  }, [beans, loaded, preferences, sessions, tasks, timer]);

  useEffect(() => {
    if (!loaded) return;

    const applyPreferenceTheme = () => {
      applySiteTheme(resolvedTheme(preferences.theme));
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

  useEffect(() => {
    const interval = window.setInterval(() => {
      const now = Date.now();
      setTimer((current) => {
        if (current.status !== "running") {
          setRemainingSeconds(getRemainingSeconds(current, preferences, now));
          return current;
        }

        const nextRemaining = getRemainingSeconds(current, preferences, now);
        const earnedSeconds = Math.min(
          elapsedBeanSeconds(current.lastBeanAccruedAt, now),
          getRemainingSeconds(current, preferences, current.lastBeanAccruedAt ?? now),
        );

        if (earnedSeconds > 0) {
          const earnedBeans = calculateEarnedBeans(earnedSeconds);
          setBeans((value) => value + earnedBeans);
          setBeanPulse(true);
          window.setTimeout(() => setBeanPulse(false), 260);
          current = {
            ...current,
            currentSessionBeans: current.currentSessionBeans + earnedBeans,
            lastBeanAccruedAt: now,
          };
        }

        setRemainingSeconds(nextRemaining);

        if (nextRemaining > 0) {
          return current;
        }

        return completeTimer(current, now);
      });
    }, 1000);

    return () => window.clearInterval(interval);
  }, [preferences, tasks]);

  function pendingBeanAccrual(current: TimerState, at: number) {
    if (current.status !== "running") return 0;
    return Math.min(
      elapsedBeanSeconds(current.lastBeanAccruedAt, at),
      getRemainingSeconds(current, preferences, current.lastBeanAccruedAt ?? at),
    );
  }

  function finalizeCurrentSession(
    current: TimerState,
    endedAt: number,
    remaining: number,
    completed: boolean,
  ) {
    if (!current.currentSessionStartedAt) return;
    const elapsed = completed
      ? durationFor(current.mode, preferences)
      : Math.max(0, durationFor(current.mode, preferences) - remaining);
    if (!completed && elapsed === 0 && current.currentSessionBeans === 0) {
      return;
    }
    setSessions((items) => [
      {
        id: newId("session"),
        mode: current.mode,
        taskId: current.selectedTaskId,
        startedAt: current.currentSessionStartedAt ?? endedAt,
        endedAt,
        durationSeconds: elapsed,
        completed,
        beansEarned: current.currentSessionBeans,
      },
      ...items,
    ]);
  }

  function completeTimer(current: TimerState, endedAt: number): TimerState {
    const wasFocus = current.mode === "pomodoro";
    const nextMode = nextModeAfterCompletion(current, preferences);
    const nextCycle = nextCycleAfterCompletion(current);
    const resetCompleted = nextCompletedInCycleAfterCompletion(current, preferences);
    const shouldAutoStart = shouldAutoStartNextTimer(current.mode, preferences);
    const nextDuration = durationFor(nextMode, preferences);

    finalizeCurrentSession(current, endedAt, 0, true);

    if (wasFocus && current.selectedTaskId) {
      setTasks((items) =>
        items.map((task) =>
          task.id === current.selectedTaskId
            ? {
                ...task,
                completedPomodoros: task.completedPomodoros + 1,
                updatedAt: endedAt,
              }
            : task,
        ),
      );
    }

    if (preferences.soundEnabled) {
      const context = new AudioContext();
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.connect(gain);
      gain.connect(context.destination);
      gain.gain.value = preferences.volume / 300;
      oscillator.frequency.value = 660;
      oscillator.start();
      oscillator.stop(context.currentTime + 0.16);
    }

    if (preferences.notificationsEnabled && Notification.permission === "granted") {
      new Notification("Affogato timer complete", {
        body: `${modeLabels[current.mode]} is done.`,
      });
    }

    toast.success(`${modeLabels[current.mode]} complete`, {
      description: "Beans banked. Nice and steady.",
    });

    return {
      ...current,
      mode: nextMode,
      status: shouldAutoStart ? "running" : "idle",
      startedAt: shouldAutoStart ? endedAt : null,
      pausedRemainingSeconds: nextDuration,
      completedInCycle: resetCompleted,
      cycle: nextCycle,
      currentSessionStartedAt: shouldAutoStart ? endedAt : null,
      currentSessionBeans: 0,
      lastBeanAccruedAt: shouldAutoStart ? endedAt : null,
    };
  }

  function startTimer() {
    const now = Date.now();
    setTimer((current) => ({
      ...current,
      status: "running",
      startedAt: now,
      pausedRemainingSeconds: getRemainingSeconds(current, preferences, now),
      currentSessionStartedAt: current.currentSessionStartedAt ?? now,
      lastBeanAccruedAt: current.lastBeanAccruedAt ?? now,
    }));
  }

  function pauseTimer() {
    const now = Date.now();
    setTimer((current) => {
      const nextRemaining = getRemainingSeconds(current, preferences, now);
      const earnedSeconds = pendingBeanAccrual(current, now);
      const earnedBeans = calculateEarnedBeans(earnedSeconds);
      if (earnedBeans > 0) {
        setBeans((value) => value + earnedBeans);
      }
      setRemainingSeconds(nextRemaining);
      return {
        ...current,
        status: "paused",
        startedAt: null,
        pausedRemainingSeconds: nextRemaining,
        currentSessionBeans: current.currentSessionBeans + earnedBeans,
        lastBeanAccruedAt: null,
      };
    });
  }

  function resetTimer() {
    const now = Date.now();
    setTimer((current) => {
      const nextRemaining = getRemainingSeconds(current, preferences, now);
      const earnedBeans = calculateEarnedBeans(pendingBeanAccrual(current, now));
      const currentWithAccrual = {
        ...current,
        currentSessionBeans: current.currentSessionBeans + earnedBeans,
      };
      if (earnedBeans > 0) {
        setBeans((value) => value + earnedBeans);
      }
      finalizeCurrentSession(currentWithAccrual, now, nextRemaining, false);
      const next = {
        ...current,
        status: "idle" as TimerStatus,
        startedAt: null,
        pausedRemainingSeconds: durationFor(current.mode, preferences),
        currentSessionStartedAt: null,
        currentSessionBeans: 0,
        lastBeanAccruedAt: null,
      };
      setRemainingSeconds(next.pausedRemainingSeconds);
      return next;
    });
  }

  function setMode(mode: TimerMode) {
    const now = Date.now();
    const nextDuration = durationFor(mode, preferences);
    setTimer((current) => {
      const nextRemaining = getRemainingSeconds(current, preferences, now);
      const earnedBeans = calculateEarnedBeans(pendingBeanAccrual(current, now));
      const currentWithAccrual = {
        ...current,
        currentSessionBeans: current.currentSessionBeans + earnedBeans,
      };
      if (earnedBeans > 0) {
        setBeans((value) => value + earnedBeans);
      }
      if (current.status !== "idle") {
        finalizeCurrentSession(currentWithAccrual, now, nextRemaining, false);
      }
      return {
        ...current,
        mode,
        status: "idle",
        startedAt: null,
        pausedRemainingSeconds: nextDuration,
        currentSessionStartedAt: null,
        currentSessionBeans: 0,
        lastBeanAccruedAt: null,
      };
    });
    setRemainingSeconds(nextDuration);
  }

  function addTask(draft: TaskDraft) {
    if (!draft.title.trim()) return;
    const now = Date.now();
    const task: Task = {
      id: newId("task"),
      title: draft.title.trim(),
      estimatedPomodoros: clampNumber(draft.estimatedPomodoros, 1, 24),
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
    setTimer((current) => ({ ...current, selectedTaskId: taskId }));
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
  }

  function deleteTask(taskId: string) {
    setTasks((items) => items.filter((task) => task.id !== taskId));
  }

  function updatePreference<K extends keyof Preferences>(key: K, value: Preferences[K]) {
    setPreferences((current) => {
      const next = normalizePreferences({ ...current, [key]: value });
      if (key === "pomodoroMinutes" || key === "shortBreakMinutes" || key === "longBreakMinutes") {
        setTimer((timerState) => {
          if (timerState.status !== "idle") return timerState;
          const nextDuration = durationFor(timerState.mode, next);
          setRemainingSeconds(nextDuration);
          return {
            ...timerState,
            pausedRemainingSeconds: nextDuration,
          };
        });
      }
      return next;
    });
  }

  function requestNotifications(enabled: boolean) {
    updatePreference("notificationsEnabled", enabled);
    if (enabled && "Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }

  function restoreDefaultPreferences() {
    setPreferences(defaultPreferences);
  }

  const beanLabel = beans.toLocaleString(undefined, {
    maximumFractionDigits: 1,
  });

  return (
    <TooltipProvider>
      <div className="nb-page mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-6 px-4 py-4 sm:px-6 lg:px-8">
        <AffogatoHeader
          beanLabel={beanLabel}
          beanPulse={beanPulse}
          theme={preferences.theme}
          onToggleTheme={() =>
            updatePreference("theme", preferences.theme === "dark" ? "light" : "dark")
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
