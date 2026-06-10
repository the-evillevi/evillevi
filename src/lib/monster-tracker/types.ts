export type MonsterTrackerRole = "user" | "coach";

export type RoutineDifficulty = "beginner" | "intermediate" | "advanced";

export interface Exercise {
  id: string;
  name: string;
  sets: number;
  reps: string;
  notes?: string;
}

export interface Routine {
  id: string;
  title: string;
  description: string;
  difficulty: RoutineDifficulty;
  estimatedMinutes: number;
  exercises: Exercise[];
  createdBy: "system" | "coach";
}

export interface RoutineCompletion {
  routineId: string;
  completedAt: string;
}

export interface StreakStats {
  currentStreak: number;
  longestStreak: number;
  completedToday: boolean;
  totalCompletions: number;
}

export interface MonsterTrackerStorageState {
  role: MonsterTrackerRole;
  createdRoutines: Routine[];
  completions: RoutineCompletion[];
}

export interface DraftExercise {
  name: string;
  sets: number;
  reps: string;
  notes: string;
}

export interface DraftRoutine {
  title: string;
  description: string;
  difficulty: RoutineDifficulty;
  estimatedMinutes: number;
  exercises: DraftExercise[];
}
