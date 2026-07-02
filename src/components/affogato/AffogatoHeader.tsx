import { useEffect, useState, type ReactNode } from "react";
import { Cat, Coffee, Expand, Moon, Shrink, Sun, User } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/affogato/ui/badge";
import { Button } from "@/components/affogato/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/affogato/ui/tooltip";
import { formatBeanLabel } from "@/lib/affogato/beans";
import { cn } from "@/lib/affogato/cn";
import { useAffogatoStore } from "@/lib/affogato/store";

export function AffogatoHeader({ children }: { children: ReactNode }) {
  const beans = useAffogatoStore((state) => state.beans);
  const beanPulse = useAffogatoStore((state) => state.beanPulse);
  const theme = useAffogatoStore((state) => state.effectiveTheme);
  const actions = useAffogatoStore((state) => state.actions);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const onChange = () => setIsFullscreen(Boolean(document.fullscreenElement));
    onChange();
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  function toggleFullscreen() {
    const request = document.fullscreenElement
      ? document.exitFullscreen?.()
      : document.documentElement.requestFullscreen?.();
    request?.catch(() => toast.error("Fullscreen is unavailable right now."));
  }

  return (
    <header className="nb-panel flex flex-col gap-3 p-3 md:flex-row md:items-center md:justify-between">
      <div className="flex items-center gap-3">
        <div className="nb-shadow-sm flex size-11 items-center justify-center border-4 border-[var(--nb-ink)] bg-[var(--nb-peach)] text-[var(--nb-button-text)]">
          <Cat className="size-6" />
        </div>
        <div>
          <p className="text-xl font-black tracking-normal uppercase">Affogato</p>
          <p className="text-sm font-bold text-[var(--nb-muted)]">Focus timer with cube friends</p>
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
          {formatBeanLabel(beans)} beans
        </Badge>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              aria-label="Toggle theme"
              onClick={() => actions.updatePreference("theme", theme === "dark" ? "light" : "dark")}
            >
              {theme === "dark" ? <Sun /> : <Moon />}
            </Button>
          </TooltipTrigger>
          <TooltipContent>Toggle theme</TooltipContent>
        </Tooltip>
        {children}
        <Button
          variant="outline"
          size="icon"
          aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
          onClick={toggleFullscreen}
        >
          {isFullscreen ? <Shrink /> : <Expand />}
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
