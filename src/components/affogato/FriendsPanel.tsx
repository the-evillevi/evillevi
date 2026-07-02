import { lazy, Suspense, useState } from "react";
import { Coffee, PawPrint } from "lucide-react";

import { SceneErrorBoundary } from "@/components/affogato/SceneErrorBoundary";
import { Badge } from "@/components/affogato/ui/badge";
import { Button } from "@/components/affogato/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/affogato/ui/sheet";
import { formatBeanLabel } from "@/lib/affogato/beans";
import { cn } from "@/lib/affogato/cn";
import { FRIENDS, getFriend } from "@/lib/affogato/friends";
import { useAffogatoStore } from "@/lib/affogato/store";

/* Lazy so three/drei stay out of the eager island chunk; the sheet content
 * only mounts when opened, and models stream via the in-canvas Suspense
 * (deliberately no useGLTF.preload here — importing drei would drag the 3D
 * stack into this chunk). */
const FriendPreviewCanvas = lazy(() => import("@/components/affogato/FriendPreview"));

function PreviewSlotFallback() {
  return <div className="size-24 border-2 border-[var(--nb-ink)] bg-[var(--nb-base)]" />;
}

export function FriendsPanel() {
  const beans = useAffogatoStore((state) => state.beans);
  const selectedFriendId = useAffogatoStore((state) => state.selectedFriendId);
  const unlockedFriendIds = useAffogatoStore((state) => state.unlockedFriendIds);
  const actions = useAffogatoStore((state) => state.actions);
  const onSelectFriend = actions.selectFriend;
  const onUnlockFriend = actions.unlockFriend;
  const beanLabel = formatBeanLabel(beans);

  // Hovering/focusing a row previews that pet; defaults to the active friend.
  const [previewFriendId, setPreviewFriendId] = useState<string | null>(null);
  const previewFriend = getFriend(previewFriendId ?? selectedFriendId);

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" size="icon" aria-label="Open cube friends">
          <PawPrint />
        </Button>
      </SheetTrigger>
      {/* Without this, Radix auto-focuses the first row's button on open and
          its bubbled onFocus overrides the selected-friend default preview. */}
      <SheetContent onOpenAutoFocus={(event) => event.preventDefault()}>
        <SheetHeader>
          <SheetTitle>Cube friends</SheetTitle>
          <SheetDescription>
            Spend beans to unlock companions for the timer scene. Balance: {beanLabel} beans.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-4 flex items-center gap-3 border-2 border-[var(--nb-ink)] bg-[var(--nb-surface)] p-2">
          <SceneErrorBoundary>
            <Suspense fallback={<PreviewSlotFallback />}>
              <FriendPreviewCanvas modelPath={previewFriend.modelPath} />
            </Suspense>
          </SceneErrorBoundary>
          <div>
            <p className="font-black uppercase">{previewFriend.name}</p>
            <p className="text-xs font-bold text-[var(--nb-muted)]">
              Hover a friend to preview it here.
            </p>
          </div>
        </div>

        <div className="mt-3 max-h-[52vh] space-y-2 overflow-y-auto pr-1">
          {FRIENDS.map((friend) => {
            const unlocked = unlockedFriendIds.includes(friend.id);
            const selected = friend.id === selectedFriendId;
            const affordable = beans >= friend.cost;
            const shortfall = Math.ceil(friend.cost - beans);
            return (
              <div
                key={friend.id}
                className={cn(
                  "flex items-center justify-between gap-3 rounded-none border-2 border-[var(--nb-ink)] p-3",
                  selected && "bg-[var(--nb-surface)] shadow-[3px_3px_0_0_var(--nb-ink)]",
                )}
                onMouseEnter={() => setPreviewFriendId(friend.id)}
                onFocus={() => setPreviewFriendId(friend.id)}
              >
                <div>
                  <p className="font-black uppercase">{friend.name}</p>
                  <p className="flex items-center gap-1 text-xs font-bold text-[var(--nb-muted)]">
                    {unlocked ? (
                      selected ? (
                        "In the scene"
                      ) : (
                        "Unlocked"
                      )
                    ) : (
                      <>
                        <Coffee className="size-3" aria-hidden="true" />
                        {friend.cost} beans
                        {affordable ? "" : ` — ${shortfall} more to go`}
                      </>
                    )}
                  </p>
                </div>
                {selected ? (
                  <Badge className="rounded-none border-2 border-[var(--nb-ink)] bg-[var(--nb-green)] font-black text-[var(--nb-button-text)] uppercase">
                    Selected
                  </Badge>
                ) : unlocked ? (
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-none border-2 border-[var(--nb-ink)] bg-[var(--nb-base)] font-black text-[var(--nb-text)] uppercase shadow-[2px_2px_0_0_var(--nb-ink)]"
                    aria-label={`Select ${friend.name}`}
                    onClick={() => onSelectFriend(friend.id)}
                  >
                    Select
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    disabled={!affordable}
                    className="rounded-none border-2 border-[var(--nb-ink)] bg-[var(--nb-peach)] font-black text-[var(--nb-button-text)] uppercase shadow-[2px_2px_0_0_var(--nb-ink)]"
                    aria-label={`Unlock ${friend.name} for ${friend.cost} beans`}
                    onClick={() => onUnlockFriend(friend.id)}
                  >
                    Unlock
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      </SheetContent>
    </Sheet>
  );
}
