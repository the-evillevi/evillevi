import { toast } from "sonner";

import { Button } from "@/components/shadcn/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/shadcn/dialog";
import { Toaster } from "@/components/shadcn/sonner";

const nbAction =
  "rounded-none border-2 border-[var(--nb-ink)] font-black uppercase shadow-[3px_3px_0_0_var(--nb-ink)]";

/** Showcase island demonstrating the neobrutalist-skinned shadcn Dialog and
 *  sonner Toaster used by React apps like Affogato. */
export default function ReactOverlaysDemo() {
  return (
    <div className="flex flex-wrap gap-3">
      <Dialog>
        <DialogTrigger asChild>
          <Button className={`${nbAction} bg-[var(--nb-pink)] text-[var(--nb-button-text)]`}>
            Open React Dialog
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>React dialog</DialogTitle>
            <DialogDescription>
              The shadcn/Radix dialog dressed in nb-* tokens: 4px ink frame, hard shadow, sharp
              corners, surface footer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter showCloseButton />
        </DialogContent>
      </Dialog>
      <Button
        className={`${nbAction} bg-[var(--nb-green)] text-[var(--nb-button-text)]`}
        onClick={() =>
          toast.success("Beans banked", { description: "A neobrutalist success toast." })
        }
      >
        Success toast
      </Button>
      <Button
        className={`${nbAction} bg-[var(--nb-base)] text-[var(--nb-text)]`}
        onClick={() => toast("Plain note", { description: "Default toast on the base surface." })}
      >
        Plain toast
      </Button>
      <Toaster position="bottom-right" />
    </div>
  );
}
