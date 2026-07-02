export type TimerMode = "pomodoro" | "shortBreak" | "longBreak";
export type TimerStatus = "idle" | "running" | "paused";
export type TaskStatus = "active" | "completed" | "archived";

export type Preferences = {
  pomodoroMinutes: number;
  shortBreakMinutes: number;
  longBreakMinutes: number;
  pomodorosPerCycle: number;
  autoStartBreaks: boolean;
  autoStartPomodoros: boolean;
  notificationsEnabled: boolean;
  soundEnabled: boolean;
  volume: number;
  theme: "light" | "dark" | "system";
  reducedMotion: boolean;
};

export type TimerState = {
  mode: TimerMode;
  status: TimerStatus;
  startedAt: number | null;
  pausedRemainingSeconds: number;
  completedInCycle: number;
  cycle: number;
  selectedTaskId: string | null;
  currentSessionStartedAt: number | null;
  /** Duration the session was started with — sessions record this even if
   *  the user changes duration preferences mid-run. */
  currentSessionPlannedSeconds: number;
  currentSessionBeans: number;
  lastBeanAccruedAt: number | null;
};

export type Task = {
  id: string;
  title: string;
  estimatedPomodoros: number;
  completedPomodoros: number;
  notes: string;
  status: TaskStatus;
  createdAt: number;
  updatedAt: number;
  completedAt: number | null;
};

export type TaskDraft = {
  title: string;
  estimatedPomodoros: number;
  notes: string;
};

export type Session = {
  id: string;
  mode: TimerMode;
  taskId: string | null;
  startedAt: number;
  endedAt: number;
  durationSeconds: number;
  completed: boolean;
  beansEarned: number;
};

export type PersistedAffogatoState = {
  preferences: Preferences;
  timer: TimerState;
  tasks: Task[];
  sessions: Session[];
  beans: number;
  unlockedFriendIds: string[];
  selectedFriendId: string;
};
