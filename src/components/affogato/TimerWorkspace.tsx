import { Coffee, Pause, Play, RotateCcw, Volume2, VolumeX } from "lucide-react";

import { SettingsPanel, type PreferenceChangeHandler } from "@/components/affogato/SettingsPanel";
import TimerScene from "@/components/affogato/TimerScene";
import { Button } from "@/components/shadcn/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/shadcn/toggle-group";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/shadcn/tooltip";
import { formatTime, modeLabels } from "@/lib/affogato/timer";
import type { Preferences, TimerMode, TimerState } from "@/lib/affogato/types";
import { cn } from "@/lib/utils";

interface TimerWorkspaceProps {
  preferences: Preferences;
  remainingSeconds: number;
  timer: TimerState;
  onModeChange: (mode: TimerMode) => void;
  onPause: () => void;
  onPreferenceChange: PreferenceChangeHandler;
  onRequestNotifications: (enabled: boolean) => void;
  onReset: () => void;
  onRestoreDefaults: () => void;
  onStart: () => void;
  onToggleSound: () => void;
}

export function TimerWorkspace({
  preferences,
  remainingSeconds,
  timer,
  onModeChange,
  onPause,
  onPreferenceChange,
  onRequestNotifications,
  onReset,
  onRestoreDefaults,
  onStart,
  onToggleSound,
}: TimerWorkspaceProps) {
  return (
    // SiteLayout already provides the page's <main> landmark.
    <div>
      <section className="nb-panel grid gap-6 p-4 md:grid-cols-[minmax(18rem,0.85fr)_minmax(0,1.15fr)] md:grid-rows-[auto_auto] md:items-center md:gap-8 md:p-6 lg:grid-cols-[minmax(20rem,0.8fr)_minmax(0,1.2fr)]">
        <div className="flex flex-col items-center gap-5 md:col-start-1 md:row-start-1">
          <div className="text-center">
            <p className="text-muted-foreground text-sm font-medium tracking-[0.18em] uppercase">
              {modeLabels[timer.mode]}
            </p>
            <p className="text-6xl font-black tracking-normal tabular-nums sm:text-7xl lg:text-8xl">
              {formatTime(remainingSeconds)}
            </p>
            <p aria-live="polite" className="text-muted-foreground mt-2 text-sm">
              {timer.status === "running" ? "Earning beans in real time" : "Ready when you are"}
            </p>
          </div>

          <ToggleGroup
            type="single"
            value={timer.mode}
            variant="outline"
            spacing={0}
            aria-label="Timer mode"
            className="grid w-full max-w-md grid-cols-3 p-3"
            onValueChange={(value) => {
              if (!value) return;
              onModeChange(value as TimerMode);
            }}
          >
            <ToggleGroupItem value="pomodoro">Focus</ToggleGroupItem>
            <ToggleGroupItem value="shortBreak">Short</ToggleGroupItem>
            <ToggleGroupItem value="longBreak">Long</ToggleGroupItem>
          </ToggleGroup>

          <Tooltip>
            {/* TooltipTrigger renders a <button>: inner nodes must be spans,
                not divs, and the button needs its own accessible name. */}
            <TooltipTrigger
              aria-label={`Cycle ${timer.cycle}: ${Math.min(timer.completedInCycle, preferences.pomodorosPerCycle)} of ${preferences.pomodorosPerCycle} focus sessions complete`}
            >
              <span className="flex flex-wrap items-center justify-center gap-3 border-4 border-[var(--nb-ink)] bg-[var(--nb-surface)] px-4 py-3 shadow-[4px_4px_0_0_var(--nb-ink)]">
                <span className="text-sm font-black text-[var(--nb-muted)] uppercase">
                  cycle {timer.cycle}
                </span>
                <span className="flex gap-2">
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
                </span>
              </span>
            </TooltipTrigger>
            <TooltipContent>
              {Math.min(timer.completedInCycle, preferences.pomodorosPerCycle)} done,{" "}
              {Math.max(0, preferences.pomodorosPerCycle - timer.completedInCycle)} to go
            </TooltipContent>
          </Tooltip>
        </div>

        <div
          className="relative h-80 w-full overflow-hidden sm:h-96 md:col-start-2 md:row-span-2 md:row-start-1 md:h-[30rem] lg:h-[34rem]"
          aria-hidden="true"
        >
          <TimerScene timer={timer} />
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3 md:col-start-1 md:row-start-2 md:self-start">
          <Button
            size="icon"
            aria-label={timer.status === "running" ? "Pause timer" : "Start timer"}
            onClick={timer.status === "running" ? onPause : onStart}
          >
            {timer.status === "running" ? <Pause /> : <Play />}
          </Button>
          <Button variant="outline" size="icon" aria-label="Reset timer" onClick={onReset}>
            <RotateCcw />
          </Button>
          <Button variant="outline" size="icon" aria-label="Toggle sound" onClick={onToggleSound}>
            {preferences.soundEnabled ? <Volume2 /> : <VolumeX />}
          </Button>
          <SettingsPanel
            preferences={preferences}
            onPreferenceChange={onPreferenceChange}
            onRequestNotifications={onRequestNotifications}
            onRestoreDefaults={onRestoreDefaults}
          />
        </div>
      </section>
    </div>
  );
}
