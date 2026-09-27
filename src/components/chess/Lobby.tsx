import { useState } from "react";
import type { Ruleset } from "@/lib/chess/engine";
import type { ColorPreference } from "@/lib/chess/protocol";
import { clockText, remaining, timeLabel, type TimeControl } from "@/lib/chess/timing";
import type { LobbyGame } from "@/lib/supabase/chess";
import { TimeControlDialog } from "./TimeControlDialog";
export function Lobby(props: {
  ruleset: Ruleset;
  setRuleset: (r: Ruleset) => void;
  color: ColorPreference;
  setColor: (c: ColorPreference) => void;
  name: string;
  setName: (n: string) => void;
  start: () => void;
  resume: () => void;
  saved: boolean;
  games: LobbyGame[];
  now: number;
  open: (id: string) => void;
  create: (t: TimeControl) => Promise<boolean>;
  busy: boolean;
  configured: boolean;
  error: string;
}) {
  const [modal, setModal] = useState(false);
  const group = (g: LobbyGame) =>
    g.status === "finished"
      ? "Finished"
      : g.status === "waiting" || (g.time_control.mode === "rapid" && !g.started_at)
        ? "Waiting to start"
        : g.turn === g.side
          ? "Your turn"
          : "Opponent’s turn";
  const list = (title: string) => {
    const games = props.games
      .filter((g) => group(g) === title)
      .sort(
        (a, b) =>
          (a.deadline ? Date.parse(a.deadline) : Infinity) -
            (b.deadline ? Date.parse(b.deadline) : Infinity) ||
          b.created_at.localeCompare(a.created_at),
      );
    return (
      <div className="chess-game-list">
        {games.length ? (
          games.map((g) => {
            const opponent =
              g.status === "waiting"
                ? "Open seat"
                : g.side === "white"
                  ? g.black_name
                  : g.white_name;
            const text = g.result
              ? `${g.result.winner ? `${g.result.winner === "white" ? "White" : "Black"} wins` : "Draw"} · ${g.result.reason}`
              : g.status === "waiting" || (g.time_control.mode === "rapid" && !g.started_at)
                ? "Not started"
                : g.time_control.mode === "untimed"
                  ? "Untimed"
                  : clockText(remaining(g, g.turn, props.now));
            return (
              <article className="chess-game-row" key={g.id}>
                <span className="chess-initials" aria-hidden="true">
                  {opponent
                    .split(/\s+/)
                    .slice(0, 2)
                    .map((s) => [...s][0])
                    .join("")}
                </span>
                <div>
                  <a
                    href={`?game=${g.id}`}
                    onClick={(e) => {
                      if (!e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey) {
                        e.preventDefault();
                        props.open(g.id);
                      }
                    }}
                  >
                    {g.ruleset === "strato" ? "Strato Chess" : "Chess³"} · {g.id.slice(0, 8)}
                  </a>
                  <p>
                    {opponent} · {timeLabel(g.time_control)} · {Math.ceil(g.ply / 2)}{" "}
                    {g.ply > 0 && g.ply <= 2 ? "move" : "moves"}
                  </p>
                </div>
                <span className="chess-clock">{text}</span>
              </article>
            );
          })
        ) : (
          <p className="chess-muted">No games here yet.</p>
        )}
      </div>
    );
  };
  return (
    <div className="chess-lobby">
      <section className="chess-panel">
        <h2>New game</h2>
        <label htmlFor="guest-name">Guest name</label>
        <input
          id="guest-name"
          autoComplete="nickname"
          value={props.name}
          onChange={(e) => props.setName(e.target.value)}
          placeholder="Your name"
        />
        <label htmlFor="chess-ruleset">Ruleset</label>
        <select
          id="chess-ruleset"
          value={props.ruleset}
          onChange={(e) => props.setRuleset(e.target.value as Ruleset)}
        >
          <option value="strato">Strato Chess</option>
          <option value="chess3">Chess³</option>
        </select>
        <label>Your side</label>
        <div className="chess-choice" role="group" aria-label="Your side">
          {(["white", "random", "black"] as const).map((c) => (
            <button key={c} aria-pressed={props.color === c} onClick={() => props.setColor(c)}>
              {c[0].toUpperCase() + c.slice(1)}
            </button>
          ))}
        </div>
        <button
          className="chess-primary"
          disabled={!props.configured || props.busy}
          onClick={() => setModal(true)}
        >
          Play with a friend
        </button>
        <button className="chess-wide" onClick={props.start}>
          Start local practice
        </button>
        {props.saved && (
          <button className="chess-wide" onClick={props.resume}>
            Resume local practice
          </button>
        )}
        <p className="chess-muted">
          Your name and anonymous seat are remembered in this browser. Practice is untimed; a new
          practice game replaces the saved one.
        </p>
        {!props.configured && (
          <p className="chess-muted">Online play is not configured. Local practice is available.</p>
        )}
      </section>
      <section aria-label="Your games">
        {["Your turn", "Opponent’s turn", "Waiting to start"].map((title) => (
          <section className="chess-panel" key={title}>
            <h2>{title}</h2>
            {list(title)}
          </section>
        ))}
        <details className="chess-panel">
          <summary>Finished</summary>
          {list("Finished")}
        </details>
      </section>
      {modal && (
        <TimeControlDialog
          busy={props.busy}
          error={props.error}
          onClose={() => setModal(false)}
          onCreate={props.create}
        />
      )}
    </div>
  );
}
