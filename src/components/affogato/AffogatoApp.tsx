import {
  BarChart3,
  Bell,
  Cat,
  Check,
  Coffee,
  Expand,
  ListTodo,
  Moon,
  Pause,
  Play,
  RotateCcw,
  Settings,
  Sun,
  User,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import type * as React from "react";
import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/shadcn/badge";
import { Button } from "@/components/shadcn/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/shadcn/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/shadcn/dialog";
import { Input } from "@/components/shadcn/input";
import { Progress } from "@/components/shadcn/progress";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/shadcn/sheet";
import { Slider } from "@/components/shadcn/slider";
import { Switch } from "@/components/shadcn/switch";
import { Textarea } from "@/components/shadcn/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/shadcn/toggle-group";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/shadcn/tooltip";
import { Toaster } from "@/components/shadcn/sonner";
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
  clampProgress,
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
  TimerMode,
  TimerState,
  TimerStatus,
} from "@/lib/affogato/types";
import { cn } from "@/lib/utils";

const VoxelPlaceholder = lazy(() =>
  import("./VoxelPlaceholder").then((module) => ({
    default: module.VoxelPlaceholder,
  })),
);

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

function VoxelFallback({ compact = false }: { compact?: boolean }) {
  return (
    <div
      className={cn(
        "bg-card grid place-items-center overflow-hidden border",
        compact ? "h-full w-full border-0 bg-transparent" : "voxel-shadow h-48 w-full rounded-lg",
      )}
      aria-label="Loading voxel placeholder"
    >
      <div className="grid grid-cols-3 gap-1">
        {Array.from({ length: compact ? 5 : 9 }, (_, index) => (
          <span
            key={index}
            className={cn(
              "bg-primary block border",
              compact ? "size-2" : "size-4",
              index % 3 === 0 && "bg-accent",
            )}
          />
        ))}
      </div>
    </div>
  );
}

export function AffogatoApp() {
  const [preferences, setPreferences] = useState(defaultPreferences);
  const [timer, setTimer] = useState(defaultTimer);
  const [remainingSeconds, setRemainingSeconds] = useState(defaultTimer.pausedRemainingSeconds);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [beans, setBeans] = useState(0);
  const [beanPulse, setBeanPulse] = useState(false);
  const [taskDraft, setTaskDraft] = useState({
    title: "",
    estimatedPomodoros: 4,
    notes: "",
  });
  const [loaded, setLoaded] = useState(false);
  const lastTickAt = useRef(Date.now());
  const initialDocumentTitle = useRef<string | null>(null);

  const activeTask = tasks.find((task) => task.id === timer.selectedTaskId) ?? null;
  const duration = durationFor(timer.mode, preferences);
  const progress = clampProgress(
    duration === 0 ? 0 : ((duration - remainingSeconds) / duration) * 100,
  );
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
          lastTickAt.current = now;
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

        lastTickAt.current = now;
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
    lastTickAt.current = now;
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

  function addTask() {
    if (!taskDraft.title.trim()) return;
    const now = Date.now();
    const task: Task = {
      id: newId("task"),
      title: taskDraft.title.trim(),
      estimatedPomodoros: clampNumber(taskDraft.estimatedPomodoros, 1, 24),
      completedPomodoros: 0,
      notes: taskDraft.notes.trim(),
      status: "active",
      createdAt: now,
      updatedAt: now,
      completedAt: null,
    };
    setTasks((items) => [task, ...items]);
    setTimer((current) => ({ ...current, selectedTaskId: task.id }));
    setTaskDraft({ title: "", estimatedPomodoros: 4, notes: "" });
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

  const beanLabel = beans.toLocaleString(undefined, {
    maximumFractionDigits: 1,
  });

  return (
    <TooltipProvider>
      <div className="nb-page mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-6 px-4 py-4 sm:px-6 lg:px-8">
        <header className="nb-panel flex flex-col gap-3 p-3 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <div className="nb-shadow-sm flex size-11 items-center justify-center border-4 border-[var(--nb-ink)] bg-[var(--nb-peach)] text-[var(--nb-button-text)]">
              <Cat className="size-6" />
            </div>
            <div>
              <p className="text-xl font-black tracking-normal uppercase">Affogato</p>
              <p className="text-sm font-bold text-[var(--nb-muted)]">
                Focus timer with voxel placeholders
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Badge
              className={cn(
                "h-10 gap-2 px-3 text-sm",
                beanPulse && "bg-accent text-accent-foreground scale-105",
              )}
            >
              <Coffee className="size-4" />
              {beanLabel} beans
            </Badge>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  aria-label="Toggle theme"
                  onClick={() =>
                    updatePreference("theme", preferences.theme === "dark" ? "light" : "dark")
                  }
                >
                  {preferences.theme === "dark" ? <Sun /> : <Moon />}
                </Button>
              </TooltipTrigger>
              <TooltipContent>Toggle theme</TooltipContent>
            </Tooltip>
            <TasksPanel
              activeTask={activeTask}
              addTask={addTask}
              taskDraft={taskDraft}
              tasks={tasks}
              setTaskDraft={setTaskDraft}
              setTasks={setTasks}
              setTimer={setTimer}
            />
            <StatsPanel
              beans={beans}
              completedTasks={completedTasks}
              focusMinutesToday={focusMinutesToday}
              sevenDayStats={sevenDayStats}
              sessionsToday={todaySessions.length}
              timer={timer}
            />
            <Button
              variant="outline"
              size="icon"
              aria-label="Toggle fullscreen"
              onClick={() => document.documentElement.requestFullscreen?.()}
            >
              <Expand />
            </Button>
            <Button
              variant="outline"
              size="icon"
              aria-label="Account placeholder"
              onClick={() => toast.info("Accounts arrive later. Affogato works locally today.")}
            >
              <User />
            </Button>
          </div>
        </header>

        <main className="grid items-start gap-6 lg:grid-cols-[1fr_360px]">
          <section className="nb-panel p-4 md:p-6">
            <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
              <div className="flex flex-col items-center gap-5">
                <div className="flex flex-wrap items-center justify-center gap-2">
                  <Button
                    size="icon"
                    aria-label={timer.status === "running" ? "Pause timer" : "Start timer"}
                    onClick={timer.status === "running" ? pauseTimer : startTimer}
                  >
                    {timer.status === "running" ? <Pause /> : <Play />}
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    aria-label="Reset timer"
                    onClick={resetTimer}
                  >
                    <RotateCcw />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    aria-label="Toggle sound"
                    onClick={() => updatePreference("soundEnabled", !preferences.soundEnabled)}
                  >
                    {preferences.soundEnabled ? <Volume2 /> : <VolumeX />}
                  </Button>
                  <SettingsPanel
                    preferences={preferences}
                    requestNotifications={requestNotifications}
                    setPreferences={setPreferences}
                    updatePreference={updatePreference}
                  />
                </div>

                <div className="relative flex size-72 items-center justify-center sm:size-80">
                  <svg
                    className="absolute inset-0 size-full -rotate-90"
                    viewBox="0 0 120 120"
                    aria-hidden="true"
                  >
                    <circle
                      cx="60"
                      cy="60"
                      r="52"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="10"
                      className="text-muted"
                    />
                    <circle
                      cx="60"
                      cy="60"
                      r="52"
                      fill="none"
                      stroke="currentColor"
                      strokeLinecap="round"
                      strokeWidth="10"
                      className="text-primary transition-all duration-500"
                      strokeDasharray={326.7}
                      strokeDashoffset={326.7 - (326.7 * progress) / 100}
                    />
                  </svg>
                  <div className="absolute top-8 h-16 w-24">
                    <Suspense fallback={<VoxelFallback compact />}>
                      <VoxelPlaceholder compact />
                    </Suspense>
                  </div>
                  <div className="relative mt-16 text-center">
                    <p className="text-muted-foreground text-sm font-medium tracking-[0.18em] uppercase">
                      {modeLabels[timer.mode]}
                    </p>
                    <p className="text-6xl font-black tracking-normal tabular-nums sm:text-7xl">
                      {formatTime(remainingSeconds)}
                    </p>
                    <p aria-live="polite" className="text-muted-foreground mt-2 text-sm">
                      {timer.status === "running"
                        ? "Earning beans in real time"
                        : "Ready when you are"}
                    </p>
                  </div>
                </div>

                <ToggleGroup
                  type="single"
                  value={timer.mode}
                  variant="outline"
                  spacing={0}
                  aria-label="Timer mode"
                  className="grid w-full max-w-md grid-cols-3 p-4"
                  onValueChange={(value) => {
                    if (!value) return;
                    setMode(value as TimerMode);
                  }}
                >
                  <ToggleGroupItem value="pomodoro">Focus</ToggleGroupItem>
                  <ToggleGroupItem value="shortBreak">Short</ToggleGroupItem>
                  <ToggleGroupItem value="longBreak">Long</ToggleGroupItem>
                </ToggleGroup>

                <Tooltip>
                  <TooltipTrigger>
                    <div className="flex flex-wrap items-center justify-center gap-3 border-4 border-[var(--nb-ink)] bg-[var(--nb-surface)] px-4 py-3 shadow-[4px_4px_0_0_var(--nb-ink)]">
                      <span className="text-sm font-black text-[var(--nb-muted)] uppercase">
                        cycle {timer.cycle}
                      </span>
                      <div className="flex gap-2">
                        {Array.from({ length: preferences.pomodorosPerCycle }, (_, index) => (
                          <span
                            key={index}
                            className={cn(
                              "flex size-8 items-center justify-center border-4 border-[var(--nb-ink)] text-xs font-black",
                              index < timer.completedInCycle
                                ? "bg-[var(--nb-peach)] text-[var(--nb-button-text)]"
                                : "bg-[var(--nb-base)] text-[var(--nb-muted)]",
                            )}
                          >
                            <Coffee className="size-4" />
                          </span>
                        ))}
                      </div>
                    </div>
                  </TooltipTrigger>

                  <TooltipContent>
                    {Math.min(timer.completedInCycle, preferences.pomodorosPerCycle)} done,{" "}
                    {Math.max(0, preferences.pomodorosPerCycle - timer.completedInCycle)} to go
                  </TooltipContent>
                </Tooltip>
              </div>

              <aside className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Active task</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {activeTask ? (
                      <>
                        <p className="font-semibold">{activeTask.title}</p>
                        <Progress
                          value={
                            (activeTask.completedPomodoros /
                              Math.max(1, activeTask.estimatedPomodoros)) *
                            100
                          }
                        />
                        <p className="text-muted-foreground text-sm">
                          {activeTask.completedPomodoros}/{activeTask.estimatedPomodoros} focus
                          sessions
                        </p>
                      </>
                    ) : (
                      <p className="text-muted-foreground text-sm">
                        Pick or create a task to connect focus time to a goal.
                      </p>
                    )}
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Bean stream</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <p className="text-3xl font-black tabular-nums">{beanLabel}</p>
                    <p className="text-muted-foreground text-sm">
                      Beans rise while focus and break timers are active. Pausing stops the drip.
                    </p>
                  </CardContent>
                </Card>
              </aside>
            </div>
          </section>

          <section className="nb-panel p-4 md:p-6">
            <Suspense fallback={<VoxelFallback />}>
              <VoxelPlaceholder />
            </Suspense>
            <div className="mt-5 space-y-3">
              <Badge variant="secondary">Voxel art placeholder</Badge>
              <h2 className="text-2xl font-bold tracking-normal">Future cozy desk scene</h2>
              <p className="text-muted-foreground text-sm leading-6">
                This canvas marks where Affogato's original 3D voxel assets will live. For now it
                uses simple cube beans, lighting, and motion so the layout and island boundary are
                real.
              </p>
            </div>
          </section>
        </main>
        <Toaster richColors position="bottom-right" />
      </div>
    </TooltipProvider>
  );
}

function TasksPanel({
  activeTask,
  addTask,
  taskDraft,
  tasks,
  setTaskDraft,
  setTasks,
  setTimer,
}: {
  activeTask: Task | null;
  addTask: () => void;
  taskDraft: { title: string; estimatedPomodoros: number; notes: string };
  tasks: Task[];
  setTaskDraft: React.Dispatch<
    React.SetStateAction<{
      title: string;
      estimatedPomodoros: number;
      notes: string;
    }>
  >;
  setTasks: React.Dispatch<React.SetStateAction<Task[]>>;
  setTimer: React.Dispatch<React.SetStateAction<TimerState>>;
}) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" size="icon" aria-label="Open tasks">
          <ListTodo />
        </Button>
      </SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Tasks</SheetTitle>
          <SheetDescription>Select a task to receive completed focus sessions.</SheetDescription>
        </SheetHeader>
        <div className="mt-5 space-y-4">
          <div className="grid gap-3 rounded-lg border p-3">
            <Input
              placeholder="Task title"
              value={taskDraft.title}
              onChange={(event) =>
                setTaskDraft((draft) => ({
                  ...draft,
                  title: event.target.value,
                }))
              }
            />
            <Input
              min={1}
              max={24}
              type="number"
              value={taskDraft.estimatedPomodoros}
              onChange={(event) =>
                setTaskDraft((draft) => ({
                  ...draft,
                  estimatedPomodoros: Number(event.target.value),
                }))
              }
            />
            <Textarea
              placeholder="Notes"
              value={taskDraft.notes}
              onChange={(event) =>
                setTaskDraft((draft) => ({
                  ...draft,
                  notes: event.target.value,
                }))
              }
            />
            <Button onClick={addTask}>Add task</Button>
          </div>
          <div className="space-y-2">
            {tasks.length === 0 ? (
              <p className="text-muted-foreground text-sm">No tasks yet.</p>
            ) : null}
            {tasks.map((task) => (
              <div
                key={task.id}
                className={cn(
                  "rounded-lg border p-3",
                  activeTask?.id === task.id && "border-primary bg-primary/5",
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p
                      className={cn(
                        "font-medium",
                        task.status === "completed" && "text-muted-foreground line-through",
                      )}
                    >
                      {task.title}
                    </p>
                    <p className="text-muted-foreground text-xs">
                      {task.completedPomodoros}/{task.estimatedPomodoros} sessions
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Select task"
                      onClick={() =>
                        setTimer((current) => ({
                          ...current,
                          selectedTaskId: task.id,
                        }))
                      }
                    >
                      <Check />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Complete task"
                      onClick={() =>
                        setTasks((items) =>
                          items.map((item) =>
                            item.id === task.id
                              ? {
                                  ...item,
                                  status: "completed",
                                  completedAt: Date.now(),
                                  updatedAt: Date.now(),
                                }
                              : item,
                          ),
                        )
                      }
                    >
                      <Coffee />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Delete task"
                      onClick={() =>
                        setTasks((items) => items.filter((item) => item.id !== task.id))
                      }
                    >
                      <X />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function StatsPanel({
  beans,
  completedTasks,
  focusMinutesToday,
  sevenDayStats,
  sessionsToday,
  timer,
}: {
  beans: number;
  completedTasks: number;
  focusMinutesToday: number;
  sevenDayStats: { label: string; count: number }[];
  sessionsToday: number;
  timer: TimerState;
}) {
  const max = Math.max(1, ...sevenDayStats.map((day) => day.count));
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="icon" aria-label="Open statistics">
          <BarChart3 />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Stats</DialogTitle>
          <DialogDescription>Local productivity totals for this browser.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 sm:grid-cols-2">
          <Stat label="Pomodoros today" value={sessionsToday.toString()} />
          <Stat label="Focus minutes" value={Math.round(focusMinutesToday).toString()} />
          <Stat label="Current cycle" value={timer.cycle.toString()} />
          <Stat
            label="Beans earned"
            value={beans.toLocaleString(undefined, {
              maximumFractionDigits: 1,
            })}
          />
          <Stat label="Completed tasks" value={completedTasks.toString()} />
        </div>
        <div className="rounded-lg border p-4">
          <p className="mb-3 text-sm font-medium">Last seven days</p>
          <div className="flex h-32 items-end gap-2">
            {sevenDayStats.map((day) => (
              <div key={day.label} className="flex flex-1 flex-col items-center gap-2">
                <div
                  className="bg-primary w-full rounded-md"
                  style={{ height: `${Math.max(8, (day.count / max) * 100)}%` }}
                />
                <span className="text-muted-foreground text-xs">{day.label}</span>
              </div>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border p-4">
      <p className="text-muted-foreground text-sm">{label}</p>
      <p className="text-2xl font-bold tabular-nums">{value}</p>
    </div>
  );
}

function SettingsPanel({
  preferences,
  requestNotifications,
  setPreferences,
  updatePreference,
}: {
  preferences: Preferences;
  requestNotifications: (enabled: boolean) => void;
  setPreferences: React.Dispatch<React.SetStateAction<Preferences>>;
  updatePreference: <K extends keyof Preferences>(key: K, value: Preferences[K]) => void;
}) {
  const durationKeys = [
    ["pomodoroMinutes", "Focus minutes"],
    ["shortBreakMinutes", "Short break"],
    ["longBreakMinutes", "Long break"],
    ["pomodorosPerCycle", "Sessions per cycle"],
  ] as const;

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="icon" aria-label="Open settings">
          <Settings />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
          <DialogDescription>Adjust local timer behavior and preferences.</DialogDescription>
        </DialogHeader>
        <div className="space-y-5">
          <div className="grid gap-3 sm:grid-cols-2">
            {durationKeys.map(([key, label]) => (
              <label key={key} className="grid gap-1 text-sm">
                {label}
                <Input
                  type="number"
                  min={1}
                  max={key === "pomodorosPerCycle" ? 8 : 90}
                  value={preferences[key]}
                  onChange={(event) =>
                    updatePreference(
                      key,
                      clampNumber(
                        Number(event.target.value),
                        1,
                        key === "pomodorosPerCycle" ? 8 : 90,
                      ),
                    )
                  }
                />
              </label>
            ))}
          </div>
          <SettingRow
            label="Auto-start breaks"
            checked={preferences.autoStartBreaks}
            onCheckedChange={(checked) => updatePreference("autoStartBreaks", checked)}
          />
          <SettingRow
            label="Auto-start focus"
            checked={preferences.autoStartPomodoros}
            onCheckedChange={(checked) => updatePreference("autoStartPomodoros", checked)}
          />
          <SettingRow
            label="Notifications"
            checked={preferences.notificationsEnabled}
            onCheckedChange={requestNotifications}
            icon={<Bell className="size-4" />}
          />
          <SettingRow
            label="Sound"
            checked={preferences.soundEnabled}
            onCheckedChange={(checked) => updatePreference("soundEnabled", checked)}
          />
          <div className="space-y-2">
            <p className="text-sm font-medium">Volume</p>
            <Slider
              value={[preferences.volume]}
              max={100}
              step={1}
              onValueChange={([value]) => updatePreference("volume", value)}
            />
          </div>
          <div className="grid grid-cols-3 gap-2">
            {(["light", "dark", "system"] as const).map((theme) => (
              <Button
                key={theme}
                variant={preferences.theme === theme ? "default" : "outline"}
                onClick={() => updatePreference("theme", theme)}
              >
                {theme}
              </Button>
            ))}
          </div>
          <SettingRow
            label="Reduced motion"
            checked={preferences.reducedMotion}
            onCheckedChange={(checked) => updatePreference("reducedMotion", checked)}
          />
          <Button variant="secondary" onClick={() => setPreferences(defaultPreferences)}>
            Restore defaults
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function SettingRow({
  checked,
  icon,
  label,
  onCheckedChange,
}: {
  checked: boolean;
  icon?: React.ReactNode;
  label: string;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between rounded-lg border p-3">
      <span className="flex items-center gap-2 text-sm font-medium">
        {icon}
        {label}
      </span>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  );
}
