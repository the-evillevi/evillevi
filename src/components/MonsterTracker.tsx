import * as React from "react";

import { cn } from "@/lib/utils";
import {
  calculateStreakStats,
  createEmptyDraftExercise,
  createEmptyDraftRoutine,
  draftToRoutine,
  getUniqueCompletionDates,
  isDraftRoutineReady,
  loadMonsterTrackerState,
  mockRoutines,
  monsterFeedback,
  saveMonsterTrackerState,
  sortRoutines,
  toLocalDateKey,
  type DraftRoutine,
  type MonsterTrackerRole,
  type Routine,
  type RoutineCompletion,
  type RoutineDifficulty,
} from "@/lib/monster-tracker";

const difficultyStyles: Record<RoutineDifficulty, string> = {
  beginner: "bg-[var(--nb-green)]",
  intermediate: "bg-[var(--nb-yellow)]",
  advanced: "bg-[var(--nb-red)]",
};

const roleLabels: Record<MonsterTrackerRole, string> = {
  user: "Training",
  coach: "Coach",
};

function StatTile({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="border-4 border-[var(--nb-ink)] bg-[var(--nb-base)] p-3 text-center">
      <p className="text-3xl font-black text-[var(--nb-text)]">{value}</p>
      <p className="text-xs font-black text-[var(--nb-muted)] uppercase">{label}</p>
    </div>
  );
}

function FieldLabel({ children, htmlFor }: { children: React.ReactNode; htmlFor: string }) {
  return (
    <label className="text-xs font-black text-[var(--nb-muted)] uppercase" htmlFor={htmlFor}>
      {children}
    </label>
  );
}

function RoutineCard({
  isSelected,
  onSelect,
  routine,
}: {
  isSelected: boolean;
  onSelect: () => void;
  routine: Routine;
}) {
  return (
    <button
      className={cn(
        "grid h-full gap-3 border-4 border-[var(--nb-ink)] bg-[var(--nb-base)] p-4 text-left shadow-[5px_5px_0_0_var(--nb-ink)] transition focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-[var(--nb-blue)]",
        isSelected && "translate-x-1 translate-y-1 shadow-none",
      )}
      type="button"
      onClick={onSelect}
      aria-pressed={isSelected}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={cn(
            "border-2 border-[var(--nb-ink)] px-2 py-1 text-xs font-black text-[var(--nb-button-text)] uppercase",
            difficultyStyles[routine.difficulty],
          )}
        >
          {routine.difficulty}
        </span>
        <span className="border-2 border-[var(--nb-ink)] bg-[var(--nb-surface)] px-2 py-1 text-xs font-black uppercase">
          {routine.createdBy}
        </span>
      </div>
      <div>
        <h3 className="text-2xl leading-none font-black uppercase">{routine.title}</h3>
        <p className="mt-2 font-bold text-[var(--nb-muted)]">{routine.description}</p>
      </div>
      <p className="text-sm font-black uppercase">
        {routine.estimatedMinutes} min / {routine.exercises.length} exercises
      </p>
    </button>
  );
}

function RoutineDetail({
  completedToday,
  feedback,
  onComplete,
  routine,
}: {
  completedToday: boolean;
  feedback: string;
  onComplete: (routineId: string) => void;
  routine: Routine;
}) {
  return (
    <section className="nb-panel p-5">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-sm font-black text-[var(--nb-peach)] uppercase">Routine detail</p>
          <h2 className="mt-1 text-4xl leading-none font-black uppercase">{routine.title}</h2>
          <p className="mt-3 max-w-2xl font-bold text-[var(--nb-muted)]">{routine.description}</p>
        </div>
        <button
          className="nb-action px-4 py-3 text-sm disabled:cursor-not-allowed disabled:opacity-60"
          type="button"
          onClick={() => onComplete(routine.id)}
          disabled={completedToday}
        >
          {completedToday ? "Done today" : "Complete routine"}
        </button>
      </div>

      <div className="mt-5 grid gap-3">
        {routine.exercises.map((exercise, index) => (
          <article
            className="border-4 border-[var(--nb-ink)] bg-[var(--nb-base)] p-4"
            key={exercise.id}
          >
            <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
              <div>
                <p className="text-xs font-black text-[var(--nb-muted)] uppercase">
                  Move {index + 1}
                </p>
                <h3 className="text-xl font-black uppercase">{exercise.name}</h3>
                {exercise.notes ? <p className="mt-1 font-bold">{exercise.notes}</p> : null}
              </div>
              <p className="border-2 border-[var(--nb-ink)] bg-[var(--nb-yellow)] px-3 py-2 text-sm font-black text-[var(--nb-button-text)] uppercase">
                {exercise.sets} sets / {exercise.reps}
              </p>
            </div>
          </article>
        ))}
      </div>

      {feedback ? (
        <p className="mt-5 border-4 border-[var(--nb-ink)] bg-[var(--nb-green)] p-4 text-lg font-black text-[var(--nb-button-text)] uppercase">
          {feedback}
        </p>
      ) : null}
    </section>
  );
}

function CompletionHistory({ completions }: { completions: RoutineCompletion[] }) {
  const dateKeys = getUniqueCompletionDates(completions).slice(-7).reverse();

  return (
    <section className="nb-panel p-4">
      <h2 className="mb-3 text-sm font-black uppercase">Completion history</h2>
      {dateKeys.length > 0 ? (
        <div className="grid gap-2">
          {dateKeys.map((dateKey) => {
            const count = completions.filter(
              (completion) => toLocalDateKey(new Date(completion.completedAt)) === dateKey,
            ).length;

            return (
              <div
                className="flex items-center justify-between border-2 border-[var(--nb-ink)] bg-[var(--nb-base)] px-3 py-2"
                key={dateKey}
              >
                <span className="font-black uppercase">{dateKey}</span>
                <span className="font-black text-[var(--nb-green)]">
                  {count} {count === 1 ? "routine" : "routines"}
                </span>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="font-bold text-[var(--nb-muted)]">Complete a routine to start the log.</p>
      )}
    </section>
  );
}

function CoachRoutineForm({
  draft,
  onAddExercise,
  onDraftChange,
  onSave,
}: {
  draft: DraftRoutine;
  onAddExercise: () => void;
  onDraftChange: (draft: DraftRoutine) => void;
  onSave: () => void;
}) {
  const canSave = isDraftRoutineReady(draft);

  return (
    <form
      className="nb-panel grid gap-4 p-5"
      onSubmit={(event) => {
        event.preventDefault();
        if (canSave) onSave();
      }}
    >
      <div>
        <p className="text-sm font-black text-[var(--nb-peach)] uppercase">Routine builder</p>
        <h2 className="mt-1 text-4xl leading-none font-black uppercase">Coach lab</h2>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="grid gap-2">
          <FieldLabel htmlFor="routine-title">Title</FieldLabel>
          <input
            className="min-h-12 border-4 border-[var(--nb-ink)] bg-[var(--nb-base)] px-3 font-black text-[var(--nb-text)] focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-[var(--nb-blue)]"
            id="routine-title"
            value={draft.title}
            onChange={(event) => onDraftChange({ ...draft, title: event.target.value })}
            placeholder="Upper Body Spark"
          />
        </div>
        <div className="grid gap-2">
          <FieldLabel htmlFor="routine-minutes">Estimated minutes</FieldLabel>
          <input
            className="min-h-12 border-4 border-[var(--nb-ink)] bg-[var(--nb-base)] px-3 font-black text-[var(--nb-text)] focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-[var(--nb-blue)]"
            id="routine-minutes"
            min={1}
            type="number"
            value={draft.estimatedMinutes}
            onChange={(event) =>
              onDraftChange({ ...draft, estimatedMinutes: Number(event.target.value) })
            }
          />
        </div>
      </div>

      <div className="grid gap-2">
        <FieldLabel htmlFor="routine-description">Description</FieldLabel>
        <textarea
          className="min-h-24 border-4 border-[var(--nb-ink)] bg-[var(--nb-base)] px-3 py-2 font-black text-[var(--nb-text)] focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-[var(--nb-blue)]"
          id="routine-description"
          value={draft.description}
          onChange={(event) => onDraftChange({ ...draft, description: event.target.value })}
          placeholder="A focused session for steady progress."
        />
      </div>

      <div className="grid gap-2">
        <FieldLabel htmlFor="routine-difficulty">Difficulty</FieldLabel>
        <select
          className="min-h-12 border-4 border-[var(--nb-ink)] bg-[var(--nb-yellow)] px-3 font-black text-[var(--nb-button-text)] focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-[var(--nb-blue)]"
          id="routine-difficulty"
          value={draft.difficulty}
          onChange={(event) =>
            onDraftChange({ ...draft, difficulty: event.target.value as RoutineDifficulty })
          }
        >
          <option value="beginner">Beginner</option>
          <option value="intermediate">Intermediate</option>
          <option value="advanced">Advanced</option>
        </select>
      </div>

      <div className="grid gap-3">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <h3 className="text-2xl font-black uppercase">Exercises</h3>
          <button
            className="nb-action bg-[var(--nb-blue)] px-4 py-3 text-sm"
            type="button"
            onClick={onAddExercise}
          >
            Add exercise
          </button>
        </div>
        {draft.exercises.map((exercise, index) => (
          <div
            className="grid gap-3 border-4 border-[var(--nb-ink)] bg-[var(--nb-base)] p-4"
            key={index}
          >
            <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_120px_160px]">
              <div className="grid gap-2">
                <FieldLabel htmlFor={`exercise-name-${index}`}>Exercise name</FieldLabel>
                <input
                  className="min-h-12 border-4 border-[var(--nb-ink)] bg-[var(--nb-surface)] px-3 font-black text-[var(--nb-text)] focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-[var(--nb-blue)]"
                  id={`exercise-name-${index}`}
                  value={exercise.name}
                  onChange={(event) => {
                    const exercises = [...draft.exercises];
                    exercises[index] = { ...exercise, name: event.target.value };
                    onDraftChange({ ...draft, exercises });
                  }}
                  placeholder="Bench Press"
                />
              </div>
              <div className="grid gap-2">
                <FieldLabel htmlFor={`exercise-sets-${index}`}>Sets</FieldLabel>
                <input
                  className="min-h-12 border-4 border-[var(--nb-ink)] bg-[var(--nb-surface)] px-3 font-black text-[var(--nb-text)] focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-[var(--nb-blue)]"
                  id={`exercise-sets-${index}`}
                  min={1}
                  type="number"
                  value={exercise.sets}
                  onChange={(event) => {
                    const exercises = [...draft.exercises];
                    exercises[index] = { ...exercise, sets: Number(event.target.value) };
                    onDraftChange({ ...draft, exercises });
                  }}
                />
              </div>
              <div className="grid gap-2">
                <FieldLabel htmlFor={`exercise-reps-${index}`}>Reps</FieldLabel>
                <input
                  className="min-h-12 border-4 border-[var(--nb-ink)] bg-[var(--nb-surface)] px-3 font-black text-[var(--nb-text)] focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-[var(--nb-blue)]"
                  id={`exercise-reps-${index}`}
                  value={exercise.reps}
                  onChange={(event) => {
                    const exercises = [...draft.exercises];
                    exercises[index] = { ...exercise, reps: event.target.value };
                    onDraftChange({ ...draft, exercises });
                  }}
                />
              </div>
            </div>
            <div className="grid gap-2">
              <FieldLabel htmlFor={`exercise-notes-${index}`}>Notes</FieldLabel>
              <input
                className="min-h-12 border-4 border-[var(--nb-ink)] bg-[var(--nb-surface)] px-3 font-black text-[var(--nb-text)] focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-[var(--nb-blue)]"
                id={`exercise-notes-${index}`}
                value={exercise.notes}
                onChange={(event) => {
                  const exercises = [...draft.exercises];
                  exercises[index] = { ...exercise, notes: event.target.value };
                  onDraftChange({ ...draft, exercises });
                }}
                placeholder="Useful cue or reminder"
              />
            </div>
          </div>
        ))}
      </div>

      <button
        className="nb-action w-fit px-5 py-4 disabled:cursor-not-allowed disabled:opacity-60"
        type="submit"
        disabled={!canSave}
      >
        Save routine locally
      </button>
    </form>
  );
}

export default function MonsterTracker() {
  const [role, setRole] = React.useState<MonsterTrackerRole>("user");
  const [createdRoutines, setCreatedRoutines] = React.useState<Routine[]>([]);
  const [completions, setCompletions] = React.useState<RoutineCompletion[]>([]);
  const [selectedRoutineId, setSelectedRoutineId] = React.useState(mockRoutines[0]?.id ?? "");
  const [draft, setDraft] = React.useState<DraftRoutine>(() => createEmptyDraftRoutine());
  const [feedback, setFeedback] = React.useState("");
  const [hasLoadedStorage, setHasLoadedStorage] = React.useState(false);

  const routines = React.useMemo(
    () => sortRoutines([...mockRoutines, ...createdRoutines]),
    [createdRoutines],
  );
  const selectedRoutine =
    routines.find((routine) => routine.id === selectedRoutineId) ?? routines[0];
  const streakStats = React.useMemo(() => calculateStreakStats(completions), [completions]);

  React.useEffect(() => {
    const storedState = loadMonsterTrackerState();
    setRole(storedState.role);
    setCreatedRoutines(storedState.createdRoutines);
    setCompletions(storedState.completions);
    setHasLoadedStorage(true);
  }, []);

  React.useEffect(() => {
    if (!hasLoadedStorage) return;
    saveMonsterTrackerState({ role, createdRoutines, completions });
  }, [completions, createdRoutines, hasLoadedStorage, role]);

  React.useEffect(() => {
    if (selectedRoutine && !routines.some((routine) => routine.id === selectedRoutineId)) {
      setSelectedRoutineId(selectedRoutine.id);
    }
  }, [routines, selectedRoutine, selectedRoutineId]);

  const completeRoutine = (routineId: string) => {
    const completion: RoutineCompletion = {
      routineId,
      completedAt: new Date().toISOString(),
    };
    const nextCompletions = [...completions, completion];
    setCompletions(nextCompletions);
    setFeedback(
      monsterFeedback[nextCompletions.length % monsterFeedback.length] ?? monsterFeedback[0],
    );
  };

  const saveDraftRoutine = () => {
    const routine = draftToRoutine(draft);
    setCreatedRoutines((currentRoutines) => [...currentRoutines, routine]);
    setSelectedRoutineId(routine.id);
    setDraft(createEmptyDraftRoutine());
    setRole("user");
  };

  const routineCompletedToday =
    selectedRoutine &&
    completions.some(
      (completion) =>
        completion.routineId === selectedRoutine.id &&
        toLocalDateKey(new Date(completion.completedAt)) === toLocalDateKey(new Date()),
    );

  return (
    <div className="grid gap-8">
      <section className="border-b-4 border-[var(--nb-ink)] bg-[var(--nb-base)] px-4 py-10 md:px-6">
        <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-[minmax(0,1fr)_420px] lg:items-end">
          <div>
            <p className="mb-4 inline-flex border-4 border-[var(--nb-ink)] bg-[var(--nb-green)] px-3 py-2 text-sm font-black text-[var(--nb-button-text)] uppercase shadow-[4px_4px_0_0_var(--nb-ink)]">
              Monster training log
            </p>
            <h1 className="max-w-5xl text-5xl leading-[0.94] font-black uppercase md:text-7xl">
              MonsterTracker
            </h1>
            <p className="mt-5 max-w-3xl text-lg font-bold text-[var(--nb-muted)] md:text-xl">
              Pick a routine, complete the session, and keep a simple streak while coaches sketch
              new training plans locally.
            </p>
          </div>

          <div className="nb-shadow grid gap-4 border-4 border-[var(--nb-ink)] bg-[var(--nb-surface)] p-5">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <p className="text-sm font-black text-[var(--nb-peach)] uppercase">Mode</p>
              <div className="grid grid-cols-2 border-4 border-[var(--nb-ink)]">
                {(["user", "coach"] as const).map((nextRole) => (
                  <button
                    className={cn(
                      "px-3 py-2 text-sm font-black uppercase focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-[var(--nb-blue)]",
                      role === nextRole
                        ? "bg-[var(--nb-blue)] text-[var(--nb-button-text)]"
                        : "bg-[var(--nb-base)] text-[var(--nb-text)]",
                    )}
                    key={nextRole}
                    type="button"
                    onClick={() => setRole(nextRole)}
                    aria-pressed={role === nextRole}
                  >
                    {roleLabels[nextRole]}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <StatTile label="Current" value={streakStats.currentStreak} />
              <StatTile label="Longest" value={streakStats.longestStreak} />
              <StatTile label="Total" value={streakStats.totalCompletions} />
              <StatTile label="Today" value={streakStats.completedToday ? "Yes" : "No"} />
            </div>
          </div>
        </div>
      </section>

      {role === "user" ? (
        <section className="mx-auto grid max-w-7xl gap-8 px-4 md:px-6 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="grid gap-6">
            <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-sm font-black text-[var(--nb-muted)] uppercase">
                  Available routines
                </p>
                <h2 className="text-4xl font-black uppercase">Choose your session</h2>
              </div>
              <p className="font-black text-[var(--nb-muted)] uppercase">
                {routines.length} routines
              </p>
            </div>
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {routines.map((routine) => (
                <RoutineCard
                  isSelected={selectedRoutine?.id === routine.id}
                  key={routine.id}
                  routine={routine}
                  onSelect={() => setSelectedRoutineId(routine.id)}
                />
              ))}
            </div>
            {selectedRoutine ? (
              <RoutineDetail
                completedToday={Boolean(routineCompletedToday)}
                feedback={feedback}
                routine={selectedRoutine}
                onComplete={completeRoutine}
              />
            ) : null}
          </div>

          <aside className="grid h-fit gap-5">
            <CompletionHistory completions={completions} />
            <section className="nb-panel bg-[var(--nb-peach)] p-4 text-[var(--nb-button-text)]">
              <h2 className="mb-3 text-sm font-black uppercase">Training nudge</h2>
              <p className="text-2xl leading-tight font-black uppercase">
                {streakStats.completedToday
                  ? "The log is fed for today. Recovery counts too."
                  : "One completed routine starts today's streak spark."}
              </p>
            </section>
          </aside>
        </section>
      ) : (
        <section className="mx-auto grid max-w-7xl gap-8 px-4 md:px-6 lg:grid-cols-[minmax(0,1fr)_360px]">
          <CoachRoutineForm
            draft={draft}
            onAddExercise={() =>
              setDraft((currentDraft) => ({
                ...currentDraft,
                exercises: [...currentDraft.exercises, createEmptyDraftExercise()],
              }))
            }
            onDraftChange={setDraft}
            onSave={saveDraftRoutine}
          />

          <aside className="grid h-fit gap-5">
            <section className="nb-panel p-4">
              <h2 className="mb-3 text-sm font-black uppercase">Preview</h2>
              <article className="border-4 border-[var(--nb-ink)] bg-[var(--nb-base)] p-4">
                <h3 className="text-2xl font-black uppercase">
                  {draft.title || "Untitled routine"}
                </h3>
                <p className="mt-2 font-bold text-[var(--nb-muted)]">
                  {draft.description || "Add a short description for athletes."}
                </p>
                <p className="mt-3 text-sm font-black uppercase">
                  {draft.estimatedMinutes || 0} min / {draft.difficulty}
                </p>
                <div className="mt-4 grid gap-2">
                  {draft.exercises
                    .filter((exercise) => exercise.name.trim().length > 0)
                    .map((exercise, index) => (
                      <p
                        className="border-2 border-[var(--nb-ink)] bg-[var(--nb-surface)] px-3 py-2 text-sm font-black uppercase"
                        key={`${exercise.name}-${index}`}
                      >
                        {exercise.name}: {exercise.sets} x {exercise.reps}
                      </p>
                    ))}
                </div>
              </article>
            </section>

            <section className="nb-panel p-4">
              <h2 className="mb-3 text-sm font-black uppercase">Coach routines</h2>
              {createdRoutines.length > 0 ? (
                <div className="grid gap-2">
                  {createdRoutines.map((routine) => (
                    <button
                      className="border-2 border-[var(--nb-ink)] bg-[var(--nb-base)] px-3 py-2 text-left font-black uppercase focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-[var(--nb-blue)]"
                      key={routine.id}
                      type="button"
                      onClick={() => {
                        setSelectedRoutineId(routine.id);
                        setRole("user");
                      }}
                    >
                      {routine.title}
                    </button>
                  ))}
                </div>
              ) : (
                <p className="font-bold text-[var(--nb-muted)]">Saved routines will appear here.</p>
              )}
            </section>
          </aside>
        </section>
      )}
    </div>
  );
}
