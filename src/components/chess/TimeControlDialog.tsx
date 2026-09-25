import { useEffect, useRef, useState } from "react";
import { DAYS, RAPID, rapid, timeLabel, type TimeControl } from "@/lib/chess/timing";
export function TimeControlDialog({
  onClose,
  onCreate,
  busy,
  error,
}: {
  onClose: () => void;
  onCreate: (t: TimeControl) => Promise<boolean>;
  busy: boolean;
  error: string;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [choice, setChoice] = useState("r4"),
    [minutes, setMinutes] = useState(10),
    [increment, setIncrement] = useState(0);
  const [mode, setMode] = useState("rapid");
  useEffect(() => {
    const previous = document.activeElement as HTMLElement;
    const node = dialog.current;
    node?.showModal();
    return () => {
      node?.close();
      previous?.focus();
    };
  }, []);
  const timing =
    mode === "custom"
      ? rapid(minutes, increment)
      : mode === "correspondence"
        ? ({
            version: "clock-v1",
            mode: "correspondence",
            days: Number(choice.slice(1)),
          } as TimeControl)
        : rapid(RAPID[Number(choice.slice(1))][0], RAPID[Number(choice.slice(1))][1]);
  const valid =
    Number.isInteger(minutes) &&
    minutes >= 1 &&
    minutes <= 120 &&
    Number.isInteger(increment) &&
    increment >= 0 &&
    increment <= 60;
  return (
    <dialog
      ref={dialog}
      className="chess-dialog chess-panel"
      aria-labelledby="invitation-title"
      onKeyDown={(e) => {
        if (e.key !== "Tab") return;
        const items = Array.from(
          dialog.current!.querySelectorAll<HTMLElement>(
            'button:not(:disabled), input:not(:disabled), select:not(:disabled), [tabindex="0"]',
          ),
        );
        const first = items[0],
          last = items.at(-1);
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }}
      onCancel={(e) => {
        e.preventDefault();
        if (!busy) onClose();
      }}
    >
      <h2 id="invitation-title">Play with a friend</h2>
      <p className="chess-muted">Choose a clock. Share the invitation after creating your game.</p>
      <div className="chess-choice" aria-label="Clock type">
        {["rapid", "correspondence", "custom"].map((m) => (
          <button
            key={m}
            aria-pressed={mode === m}
            onClick={() => {
              setMode(m);
              setChoice(m === "correspondence" ? "d1" : "r4");
            }}
          >
            {m[0].toUpperCase() + m.slice(1)}
          </button>
        ))}
      </div>
      {mode === "rapid" && (
        <div className="chess-presets">
          {RAPID.map(([m, i], n) => (
            <button key={n} aria-pressed={choice === `r${n}`} onClick={() => setChoice(`r${n}`)}>
              {timeLabel(rapid(m, i))}
            </button>
          ))}
        </div>
      )}
      {mode === "correspondence" && (
        <div className="chess-presets">
          {DAYS.map((d) => (
            <button key={d} aria-pressed={choice === `d${d}`} onClick={() => setChoice(`d${d}`)}>
              {d} {d === 1 ? "day" : "days"} per move
            </button>
          ))}
        </div>
      )}
      {mode === "custom" && (
        <>
          {[
            ["Initial minutes", minutes, 1, 120, setMinutes],
            ["Increment seconds", increment, 0, 60, setIncrement],
          ].map(([label, value, min, max, set]) => (
            <div key={String(label)}>
              <label htmlFor={String(label)}>{String(label)}</label>
              <div className="chess-custom-pair">
                <input
                  type="range"
                  aria-label={`${label} slider`}
                  min={Number(min)}
                  max={Number(max)}
                  step="1"
                  value={Number(value)}
                  onChange={(e) => (set as (v: number) => void)(Number(e.target.value))}
                />
                <input
                  id={String(label)}
                  type="number"
                  min={Number(min)}
                  max={Number(max)}
                  step="1"
                  value={Number.isNaN(value) ? "" : Number(value)}
                  onChange={(e) => (set as (v: number) => void)(e.target.valueAsNumber)}
                />
              </div>
            </div>
          ))}
        </>
      )}
      <p className="chess-muted">
        {mode === "correspondence"
          ? "White’s first turn starts when your friend joins."
          : "Both players click Ready before White’s clock starts."}
      </p>
      {error && <p role="alert">{error}</p>}
      <button
        className="chess-primary"
        disabled={busy || (mode === "custom" && !valid)}
        onClick={async () => {
          if (await onCreate(timing)) onClose();
        }}
      >
        Create invitation
      </button>
      <button disabled={busy} onClick={onClose}>
        Cancel
      </button>
    </dialog>
  );
}
