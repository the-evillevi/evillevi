import { Coffee, PawPrint } from "lucide-react";

import { Badge } from "@/components/shadcn/badge";
import { Button } from "@/components/shadcn/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/shadcn/sheet";
import { FRIENDS } from "@/lib/affogato/friends";
import { cn } from "@/lib/utils";

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
                  "flex items-center justify-between gap-3 rounded-lg border p-3",
                  selected && "border-primary bg-primary/5",
                )}
              >
                <div>
                  <p className="font-medium">{friend.name}</p>
                  <p className="text-muted-foreground flex items-center gap-1 text-xs">
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
                  <Badge>Selected</Badge>
                ) : unlocked ? (
                  <Button
                    variant="outline"
                    size="sm"
                    aria-label={`Select ${friend.name}`}
                    onClick={() => onSelectFriend(friend.id)}
                  >
                    Select
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    disabled={!affordable}
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
