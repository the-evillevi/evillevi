import type { DraftExercise, DraftRoutine, Exercise, Routine } from "./types";

export function createId(input: string, fallback = "item"): string {
  const slug = input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return `${slug || fallback}-${Date.now().toString(36)}`;
}

export function createEmptyDraftExercise(): DraftExercise {
  return {
    name: "",
    sets: 3,
    reps: "8-10",
    notes: "",
  };
}

export function createEmptyDraftRoutine(): DraftRoutine {
  return {
    title: "",
    description: "",
    difficulty: "beginner",
    estimatedMinutes: 45,
    exercises: [createEmptyDraftExercise()],
  };
}

export function isDraftRoutineReady(draft: DraftRoutine): boolean {
  return (
    draft.title.trim().length > 0 &&
    draft.description.trim().length > 0 &&
    draft.estimatedMinutes > 0 &&
    draft.exercises.some((exercise) => exercise.name.trim().length > 0)
  );
}

export function draftToRoutine(draft: DraftRoutine): Routine {
  const exercises: Exercise[] = draft.exercises
    .filter((exercise) => exercise.name.trim().length > 0)
    .map((exercise) => ({
      id: createId(exercise.name, "exercise"),
      name: exercise.name.trim(),
      sets: Math.max(1, Math.round(exercise.sets)),
      reps: exercise.reps.trim() || "8-10",
      notes: exercise.notes.trim() || undefined,
    }));

  return {
    id: createId(draft.title, "routine"),
    title: draft.title.trim(),
    description: draft.description.trim(),
    difficulty: draft.difficulty,
    estimatedMinutes: Math.max(1, Math.round(draft.estimatedMinutes)),
    exercises,
    createdBy: "coach",
  };
}

export function sortRoutines(routines: Routine[]): Routine[] {
  return [...routines].sort((a, b) => {
    if (a.createdBy !== b.createdBy) return a.createdBy === "system" ? -1 : 1;
    return a.title.localeCompare(b.title);
  });
}
