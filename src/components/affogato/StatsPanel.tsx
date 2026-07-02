import { BarChart3 } from "lucide-react";

import { Button } from "@/components/affogato/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/affogato/ui/dialog";

interface StatsPanelProps {
  beans: number;
  completedTasks: number;
  currentCycle: number;
  focusMinutesToday: number;
  sessionsToday: number;
  sevenDayStats: { label: string; count: number }[];
}

export function StatsPanel({
  beans,
  completedTasks,
  currentCycle,
  focusMinutesToday,
  sessionsToday,
  sevenDayStats,
}: StatsPanelProps) {
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
          <Stat label="Current cycle" value={currentCycle.toString()} />
          <Stat
            label="Beans earned"
            value={beans.toLocaleString(undefined, { maximumFractionDigits: 1 })}
          />
          <Stat label="Completed tasks" value={completedTasks.toString()} />
        </div>
        <div className="rounded-none border-2 border-[var(--nb-ink)] p-4">
          <p className="mb-3 text-sm font-black uppercase">Last seven days</p>
          <div
            role="img"
            aria-label={`Focus sessions, last seven days: ${sevenDayStats
              .map((day) => `${day.label} ${day.count}`)
              .join(", ")}`}
            className="flex h-32 items-end gap-2"
          >
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
    <div className="rounded-none border-2 border-[var(--nb-ink)] p-4">
      <p className="text-sm font-bold text-[var(--nb-muted)] uppercase">{label}</p>
      <p className="text-2xl font-black tabular-nums">{value}</p>
    </div>
  );
}
