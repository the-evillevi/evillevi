import type { Session } from "./types";

export function todayKey(time = Date.now()) {
  return localDayKey(time);
}

export function localDayKey(time = Date.now()) {
  const date = new Date(time);
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const day = date.getDate().toString().padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function sessionsForDay(sessions: Session[], key = todayKey()) {
  return sessions.filter(
    (session) => session.completed && todayKey(session.endedAt) === key,
  );
}

export function focusMinutesForSessions(sessions: Session[]) {
  return sessions
    .filter((session) => session.mode === "pomodoro")
    .reduce((total, session) => total + session.durationSeconds / 60, 0);
}

export function sevenDayFocusStats(sessions: Session[], now = Date.now()) {
  return Array.from({ length: 7 }, (_, index) => {
    const day = new Date(now);
    day.setDate(day.getDate() - (6 - index));
    const key = todayKey(day.getTime());
    const count = sessions.filter(
      (session) =>
        session.completed &&
        session.mode === "pomodoro" &&
        todayKey(session.endedAt) === key,
    ).length;
    return {
      label: day.toLocaleDateString(undefined, { weekday: "short" }),
      count,
    };
  });
}
