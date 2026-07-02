import { useState } from "react";
import { Check, ListTodo, Target, X } from "lucide-react";

import { Button } from "@/components/affogato/ui/button";
import { Input } from "@/components/affogato/ui/input";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/affogato/ui/tooltip";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/affogato/ui/sheet";
import { Textarea } from "@/components/affogato/ui/textarea";
import { cn } from "@/lib/affogato/cn";
import { useAffogatoStore } from "@/lib/affogato/store";
import type { TaskDraft } from "@/lib/affogato/types";

const defaultTaskDraft: TaskDraft = {
  title: "",
  estimatedPomodoros: 4,
  notes: "",
};

export function TasksPanel() {
  const tasks = useAffogatoStore((state) => state.tasks);
  const activeTaskId = useAffogatoStore((state) => state.timer.selectedTaskId);
  const actions = useAffogatoStore((state) => state.actions);
  const onCompleteTask = actions.completeTask;
  const onDeleteTask = actions.deleteTask;
  const onSelectTask = actions.selectTask;

  // Ephemeral form state stays local — it never leaves this panel.
  const [draft, setDraft] = useState<TaskDraft>(defaultTaskDraft);

  function addTask() {
    if (!draft.title.trim()) return;
    actions.addTask(draft);
    setDraft(defaultTaskDraft);
  }

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
          <div className="grid gap-3 rounded-none border-2 border-[var(--nb-ink)] p-3">
            <Input
              placeholder="Task title"
              value={draft.title}
              onChange={(event) =>
                setDraft((current) => ({ ...current, title: event.target.value }))
              }
            />
            <label className="grid gap-1 text-sm">
              Estimated pomodoros
              <Input
                min={1}
                max={24}
                type="number"
                value={draft.estimatedPomodoros}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    estimatedPomodoros: Number(event.target.value),
                  }))
                }
              />
            </label>
            <Textarea
              placeholder="Notes"
              value={draft.notes}
              onChange={(event) =>
                setDraft((current) => ({ ...current, notes: event.target.value }))
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
                  "rounded-none border-2 border-[var(--nb-ink)] p-3",
                  activeTaskId === task.id &&
                    "bg-[var(--nb-surface)] shadow-[3px_3px_0_0_var(--nb-ink)]",
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
                    {task.status !== "completed" ? (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant={activeTaskId === task.id ? "default" : "ghost"}
                            size="icon"
                            aria-label="Select task"
                            onClick={() => onSelectTask(task.id)}
                          >
                            <Target />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          {activeTaskId === task.id ? "Selected task" : "Select task"}
                        </TooltipContent>
                      </Tooltip>
                    ) : null}
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Complete task"
                      onClick={() => onCompleteTask(task.id)}
                    >
                      <Check />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Delete task"
                      onClick={() => onDeleteTask(task.id)}
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
