import * as React from "react";
import { cn } from "@/lib/utils";

const Progress = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { value?: number }
>(({ className, value = 0, ...props }, ref) => (
  <div
    ref={ref}
    data-slot="progress"
    className={cn("bg-secondary relative h-3 w-full overflow-hidden rounded-full", className)}
    {...props}
  >
    <div
      className="bg-primary h-full w-full flex-1 transition-all"
      style={{ transform: `translateX(-${100 - value}%)` }}
    />
  </div>
));
Progress.displayName = "Progress";

export { Progress };
