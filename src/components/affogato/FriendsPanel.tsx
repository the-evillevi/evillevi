import { Coffee, PawPrint } from "lucide-react";

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
import { FRIENDS } from "@/lib/affogato/friends";
import { cn } from "@/lib/affogato/cn";

interface FriendsPanelProps {
  beanLabel: string;
  beans: number;
  selectedFriendId: string;
  unlockedFriendIds: string[];
  onSelectFriend: (friendId: string) => void;
  onUnlockFriend: (friendId: string) => void;
}

export function FriendsPanel({
  beanLabel,
  beans,
  selectedFriendId,
  unlockedFriendIds,
  onSelectFriend,
  onUnlockFriend,
}: FriendsPanelProps) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" size="icon" aria-label="Open cube friends">
          <PawPrint />
        </Button>
      </SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Cube friends</SheetTitle>
          <SheetDescription>
            Spend beans to unlock companions for the timer scene. Balance: {beanLabel} beans.
          </SheetDescription>
        </SheetHeader>
        <div className="mt-5 max-h-[60vh] space-y-2 overflow-y-auto pr-1">
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
