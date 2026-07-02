import { useState } from "react";
import { Check, ListTodo, Target, X } from "lucide-react";

import { Button } from "@/components/shadcn/button";
import { Input } from "@/components/shadcn/input";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/shadcn/tooltip";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/shadcn/sheet";
import { Textarea } from "@/components/shadcn/textarea";
import type { Task, TaskDraft } from "@/lib/affogato/types";
import { cn } from "@/lib/utils";

const defaultTaskDraft: TaskDraft = {
  title: "",
  estimatedPomodoros: 4,
  notes: "",
};

interface TasksPanelProps {
  activeTaskId: string | null;
  tasks: Task[];
  onAddTask: (draft: TaskDraft) => void;
  onCompleteTask: (taskId: string) => void;
  onDeleteTask: (taskId: string) => void;
  onSelectTask: (taskId: string) => void;
}

export function TasksPanel({
  activeTaskId,
  tasks,
  onAddTask,
  onCompleteTask,
  onDeleteTask,
  onSelectTask,
}: TasksPanelProps) {
  const [draft, setDraft] = useState<TaskDraft>(defaultTaskDraft);

  function addTask() {
    if (!draft.title.trim()) return;
    onAddTask(draft);
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
          <div className="grid gap-3 rounded-lg border p-3">
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
                  "rounded-lg border p-3",
                  activeTaskId === task.id && "border-primary bg-primary/5",
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
