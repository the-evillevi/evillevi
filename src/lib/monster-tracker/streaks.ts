import type { RoutineCompletion, StreakStats } from "./types";

export function toLocalDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export function getUniqueCompletionDates(completions: RoutineCompletion[]): string[] {
  return Array.from(
    new Set(completions.map((completion) => toLocalDateKey(new Date(completion.completedAt)))),
  ).sort();
}

function addDays(date: Date, days: number): Date {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + days);
  return nextDate;
}

export function calculateStreakStats(
  completions: RoutineCompletion[],
  now = new Date(),
): StreakStats {
  const uniqueDates = getUniqueCompletionDates(completions);
  const completedDates = new Set(uniqueDates);
  const todayKey = toLocalDateKey(now);
  const completedToday = completedDates.has(todayKey);

  let currentStreak = 0;
  let cursor = completedToday ? new Date(now) : addDays(now, -1);

  while (completedDates.has(toLocalDateKey(cursor))) {
    currentStreak += 1;
    cursor = addDays(cursor, -1);
  }

  let longestStreak = 0;
  let runningStreak = 0;
  let previousDate: Date | null = null;

  for (const dateKey of uniqueDates) {
    const date = new Date(`${dateKey}T12:00:00`);

    if (previousDate && toLocalDateKey(addDays(previousDate, 1)) === dateKey) {
      runningStreak += 1;
    } else {
      runningStreak = 1;
    }

    longestStreak = Math.max(longestStreak, runningStreak);
    previousDate = date;
  }

  return {
    currentStreak,
    longestStreak,
    completedToday,
    totalCompletions: completions.length,
  };
}
