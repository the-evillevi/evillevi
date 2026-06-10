import type { Routine } from "./types";

export const mockRoutines: Routine[] = [
  {
    id: "push-day",
    title: "Push Day",
    description: "Chest, shoulders, and triceps",
    difficulty: "beginner",
    estimatedMinutes: 45,
    createdBy: "system",
    exercises: [
      {
        id: "bench-press",
        name: "Bench Press",
        sets: 3,
        reps: "8-10",
        notes: "Keep your feet planted.",
      },
      {
        id: "shoulder-press",
        name: "Shoulder Press",
        sets: 3,
        reps: "8-10",
        notes: "Brace before each rep.",
      },
      {
        id: "triceps-rope",
        name: "Triceps Rope Pushdown",
        sets: 3,
        reps: "12-15",
      },
    ],
  },
  {
    id: "pull-day",
    title: "Pull Day",
    description: "Back, biceps, and posture work",
    difficulty: "beginner",
    estimatedMinutes: 40,
    createdBy: "system",
    exercises: [
      {
        id: "lat-pulldown",
        name: "Lat Pulldown",
        sets: 3,
        reps: "10-12",
        notes: "Pull elbows toward your ribs.",
      },
      {
        id: "seated-row",
        name: "Seated Cable Row",
        sets: 3,
        reps: "10-12",
      },
      {
        id: "hammer-curl",
        name: "Hammer Curl",
        sets: 2,
        reps: "12-15",
      },
    ],
  },
  {
    id: "leg-day",
    title: "Leg Day",
    description: "Squats, hinges, and sturdy ankles",
    difficulty: "intermediate",
    estimatedMinutes: 55,
    createdBy: "system",
    exercises: [
      {
        id: "goblet-squat",
        name: "Goblet Squat",
        sets: 4,
        reps: "8-10",
        notes: "Pause for one count at the bottom.",
      },
      {
        id: "romanian-deadlift",
        name: "Romanian Deadlift",
        sets: 3,
        reps: "8-10",
      },
      {
        id: "walking-lunge",
        name: "Walking Lunge",
        sets: 3,
        reps: "10 each side",
      },
    ],
  },
];

export const monsterFeedback = [
  "Tiny horns, huge momentum. Training complete.",
  "Your pocket monster is flexing respectfully.",
  "Rep beast fed. Streak energy rising.",
  "That session added claws to your consistency.",
  "The training cave echoes with approval.",
] as const;
