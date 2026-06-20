import type { ReactNode } from "react";
import { Cat, Coffee, Expand, Moon, Sun, User } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/shadcn/badge";
import { Button } from "@/components/shadcn/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/shadcn/tooltip";
import type { Preferences } from "@/lib/affogato/types";
import { cn } from "@/lib/utils";

interface AffogatoHeaderProps {
  beanLabel: string;
  beanPulse: boolean;
  children: ReactNode;
  theme: Preferences["theme"];
  onToggleTheme: () => void;
}

export function AffogatoHeader({
  beanLabel,
  beanPulse,
  children,
  theme,
  onToggleTheme,
}: AffogatoHeaderProps) {
  return (
    <header className="nb-panel flex flex-col gap-3 p-3 md:flex-row md:items-center md:justify-between">
      <div className="flex items-center gap-3">
        <div className="nb-shadow-sm flex size-11 items-center justify-center border-4 border-[var(--nb-ink)] bg-[var(--nb-peach)] text-[var(--nb-button-text)]">
          <Cat className="size-6" />
        </div>
        <div>
          <p className="text-xl font-black tracking-normal uppercase">Affogato</p>
          <p className="text-sm font-bold text-[var(--nb-muted)]">
            Focus timer with voxel placeholders
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Badge
          className={cn(
            "h-10 gap-2 px-3 text-sm",
            beanPulse && "bg-accent text-accent-foreground scale-105",
          )}
        >
          <Coffee className="size-4" />
          {beanLabel} beans
        </Badge>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="outline" size="icon" aria-label="Toggle theme" onClick={onToggleTheme}>
              {theme === "dark" ? <Sun /> : <Moon />}
            </Button>
          </TooltipTrigger>
          <TooltipContent>Toggle theme</TooltipContent>
        </Tooltip>
        {children}
        <Button
          variant="outline"
          size="icon"
          aria-label="Toggle fullscreen"
          onClick={() => document.documentElement.requestFullscreen?.()}
        >
          <Expand />
        </Button>
        <Button
          variant="outline"
          size="icon"
          aria-label="Account placeholder"
          onClick={() => toast.info("Accounts arrive later. Affogato works locally today.")}
        >
          <User />
        </Button>
      </div>
    </header>
  );
}
