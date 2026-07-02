import type { ReactNode } from "react";
import { Bell, Settings } from "lucide-react";

import { Button } from "@/components/shadcn/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/shadcn/dialog";
import { Input } from "@/components/shadcn/input";
import { Slider } from "@/components/shadcn/slider";
import { Switch } from "@/components/shadcn/switch";
import { clampInt } from "@/lib/affogato/numbers";
import type { Preferences } from "@/lib/affogato/types";

export type PreferenceChangeHandler = <K extends keyof Preferences>(
  key: K,
  value: Preferences[K],
) => void;

interface SettingsPanelProps {
  preferences: Preferences;
  onPreferenceChange: PreferenceChangeHandler;
  onRequestNotifications: (enabled: boolean) => void;
  onRestoreDefaults: () => void;
}

const durationKeys = [
  ["pomodoroMinutes", "Focus minutes"],
  ["shortBreakMinutes", "Short break"],
  ["longBreakMinutes", "Long break"],
  ["pomodorosPerCycle", "Sessions per cycle"],
] as const;

export function SettingsPanel({
  preferences,
  onPreferenceChange,
  onRequestNotifications,
  onRestoreDefaults,
}: SettingsPanelProps) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="icon" aria-label="Open settings">
          <Settings />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
          <DialogDescription>Adjust local timer behavior and preferences.</DialogDescription>
        </DialogHeader>
        <div className="space-y-5">
          <div className="grid gap-3 sm:grid-cols-2">
            {durationKeys.map(([key, label]) => (
              <label key={key} className="grid gap-1 text-sm">
                {label}
                <Input
                  type="number"
                  min={1}
                  max={key === "pomodorosPerCycle" ? 8 : 90}
                  value={preferences[key]}
                  onChange={(event) =>
                    onPreferenceChange(
                      key,
                      clampInt(Number(event.target.value), 1, key === "pomodorosPerCycle" ? 8 : 90),
                    )
                  }
                />
              </label>
            ))}
          </div>
          <SettingRow
            label="Auto-start breaks"
            checked={preferences.autoStartBreaks}
            onCheckedChange={(checked) => onPreferenceChange("autoStartBreaks", checked)}
          />
          <SettingRow
            label="Auto-start focus"
            checked={preferences.autoStartPomodoros}
            onCheckedChange={(checked) => onPreferenceChange("autoStartPomodoros", checked)}
          />
          <SettingRow
            label="Notifications"
            checked={preferences.notificationsEnabled}
            onCheckedChange={onRequestNotifications}
            icon={<Bell className="size-4" />}
          />
          <SettingRow
            label="Sound"
            checked={preferences.soundEnabled}
            onCheckedChange={(checked) => onPreferenceChange("soundEnabled", checked)}
          />
          <div className="space-y-2">
            <p className="text-sm font-medium">Volume</p>
            <Slider
              value={[preferences.volume]}
              max={100}
              step={1}
              onValueChange={([value]) => onPreferenceChange("volume", value)}
            />
          </div>
          <div className="grid grid-cols-3 gap-2">
            {(["light", "dark", "system"] as const).map((theme) => (
              <Button
                key={theme}
                variant={preferences.theme === theme ? "default" : "outline"}
                onClick={() => onPreferenceChange("theme", theme)}
              >
                {theme}
              </Button>
            ))}
          </div>
          <SettingRow
            label="Reduced motion"
            checked={preferences.reducedMotion}
            onCheckedChange={(checked) => onPreferenceChange("reducedMotion", checked)}
          />
          <Button variant="secondary" onClick={onRestoreDefaults}>
            Restore defaults
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function SettingRow({
  checked,
  icon,
  label,
  onCheckedChange,
}: {
  checked: boolean;
  icon?: ReactNode;
  label: string;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between rounded-lg border p-3">
      <span className="flex items-center gap-2 text-sm font-medium">
        {icon}
        {label}
      </span>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  );
}
