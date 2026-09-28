import { useEffect, useMemo, useState } from "react";
import {
  applyMove,
  initialState,
  legalMoves,
  opposite,
  parseState,
  status,
  type Color,
  type Move,
  type Ruleset,
  type State,
} from "@/lib/chess/engine";
import { LEVELS, formatSquare, formatMove, formatHistory } from "@/lib/chess/notation";
import type { ColorPreference } from "@/lib/chess/protocol";
import { clockText, guestName, remaining, timeLabel } from "@/lib/chess/timing";
import { Board3D } from "./Board3D";
import { Board2D } from "./Board2D";
import { Lobby } from "./Lobby";
import { useChessOnline } from "@/lib/supabase/useChessOnline";
const LOCAL_KEY = "garden-chess-practice-v1";
type Practice = { position: State; history: Move[]; orientation: Color };
const label = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const mobile = () => window.matchMedia("(max-width: 767px)").matches;
export function ChessApp() {
  const online = useChessOnline();
  const [practice, setPractice] = useState<Practice>(() => ({
    position: initialState("strato"),
    history: [],
    orientation: "white",
  }));
  const [loaded, setLoaded] = useState(false),
    [saved, setSaved] = useState(false),
    [name, setName] = useState("Guest");
  const [ruleset, setRuleset] = useState<Ruleset>("strato"),
    [color, setColor] = useState<ColorPreference>("random");
  const [selected, setSelected] = useState(""),
    [pending, setPending] = useState<Move | null>(null),
    [promotion, setPromotion] = useState("");
  const [error, setError] = useState(""),
    [level, setLevel] = useState<number | null>(null),
    [cameraKey, setCameraKey] = useState(0);
  const [renderer, setRenderer] = useState<"3d" | "2d">("3d"),
    [webglFailed, setWebglFailed] = useState(false);
  const [viewSide, setViewSide] = useState<Color | null>(null),
    [confirmEnd, setConfirmEnd] = useState<"resign" | "draw" | null>(null);
  const game = online.snapshot?.game;
  const inGame = Boolean(online.gameId || online.practiceView);
  const playerSide: Color | null = game
    ? game.white_id === online.userId
      ? "white"
      : game.black_id === online.userId
        ? "black"
        : null
    : null;
  const state = game?.position ?? practice.position,
    orientation = viewSide ?? playerSide ?? practice.orientation;
  const history = useMemo(
    () => (online.gameId ? (online.snapshot?.moves.map((m) => m.move) ?? []) : practice.history),
    [online.gameId, online.snapshot?.moves, practice.history],
  );
  const historyLabels = useMemo(
    () => formatHistory(initialState(state.ruleset), history),
    [state.ruleset, history],
  );
  const outcome = game?.result ?? state.outcome;
  const clear = () => {
    setSelected("");
    setPending(null);
    setPromotion("");
  };
  useEffect(() => {
    clear();
    setViewSide(null);
    setConfirmEnd(null);
    setCameraKey((k) => k + 1);
  }, [online.gameId, online.practiceView]);
  // Draw offers and readiness do not invalidate a position selection.
  const positionKey = JSON.stringify(state);
  useEffect(() => {
    clear();
    setConfirmEnd(null);
  }, [positionKey, game?.status]);
  const currentStatus = useMemo(() => status(state), [state]);
  const moves = useMemo(() => legalMoves(state, selected), [state, selected]);
  const moveLabels = useMemo(
    () => new Map(moves.map((m) => [JSON.stringify(m), formatMove(state, m)])),
    [state, moves],
  );
  const pendingLabel =
    pending && (!pending.promotion || promotion)
      ? moveLabels.get(JSON.stringify(pending.promotion ? { ...pending, promotion } : pending))
      : undefined;
  const movable = useMemo(
    () => state.pieces.filter((p) => p.color === state.turn && legalMoves(state, p.square).length),
    [state],
  );
  const needsReady =
    game?.status === "active" && game.time_control.mode === "rapid" && !game.started_at;
  const canPlay =
    loaded &&
    !outcome &&
    (!online.gameId ||
      (game?.status === "active" &&
        !needsReady &&
        playerSide === state.turn &&
        !online.busy &&
        online.connection !== "Offline"));
  useEffect(() => {
    try {
      setName(localStorage.getItem("garden-chess-name") ?? "Guest");
      const pref = localStorage.getItem("garden-chess-renderer");
      if (pref === "2d") {
        setRenderer("2d");
        if (mobile()) setLevel(0);
      }
      const raw = localStorage.getItem(LOCAL_KEY);
      if (raw) {
        const stored = JSON.parse(raw);
        if (!Array.isArray(stored.history) || !["white", "black"].includes(stored.orientation))
          throw new Error();
        let replay = initialState(stored.position.ruleset, stored.position.rulesVersion);
        for (const move of stored.history) replay = applyMove(replay, move);
        const parsed = parseState(stored.position);
        if (
          JSON.stringify({ ...parsed, outcome: null }) !==
          JSON.stringify({ ...replay, outcome: null })
        )
          throw new Error();
        setPractice({ position: parsed, history: stored.history, orientation: stored.orientation });
        setSaved(true);
      }
    } catch {
      setError("Browser storage could not be restored. You can start a new practice game.");
    }
    setLoaded(true);
  }, []);
  useEffect(() => {
    if (loaded && saved)
      try {
        localStorage.setItem(LOCAL_KEY, JSON.stringify(practice));
      } catch {
        setError("Browser storage is unavailable. Practice is saved for this visit only.");
      }
  }, [practice, loaded, saved]);
  const rememberName = (value: string) => {
    setName(value);
    try {
      localStorage.setItem("garden-chess-name", value);
    } catch {
      /* In-memory name still works. */
    }
  };
  const changeRenderer = (r: "3d" | "2d") => {
    setRenderer(r);
    if (r === "2d" && mobile() && level === null) setLevel(0);
    try {
      localStorage.setItem("garden-chess-renderer", r);
    } catch {
      /* Preference is optional. */
    }
  };
  const fallback = () => {
    setWebglFailed(true);
    setRenderer("2d");
    if (mobile()) setLevel(0);
  };
  const choose = (m: Move | null) => {
    setPending(m);
    setPromotion("");
  };
  const select = (sq: string) => {
    if (!canPlay) return;
    const move = moves.find((m) => m.to === sq);
    if (move) {
      choose(move);
      return;
    }
    if (state.pieces.some((p) => p.square === sq && p.color === state.turn)) {
      setSelected(sq);
      choose(null);
    }
  };
  const commit = async () => {
    if (!pending || !canPlay || (pending.promotion && !promotion)) return;
    const move = pending.promotion
      ? { ...pending, promotion: promotion as Move["promotion"] }
      : pending;
    if (online.gameId) {
      await online.move(move);
      return;
    }
    try {
      setPractice((p) => ({
        ...p,
        position: applyMove(p.position, move),
        history: [...p.history, move],
      }));
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Move failed");
    }
  };
  const start = () => {
    const orientation: Color =
      color === "random"
        ? crypto.getRandomValues(new Uint8Array(1))[0] % 2
          ? "white"
          : "black"
        : color;
    setPractice({ position: initialState(ruleset), history: [], orientation });
    setSaved(true);
    clear();
    setViewSide(null);
    setConfirmEnd(null);
    setCameraKey((k) => k + 1);
    online.practice();
  };
  const end = async () => {
    if (online.gameId) await online.action(confirmEnd === "resign" ? "resign" : "offer-draw");
    else
      setPractice((p) => ({
        ...p,
        position: {
          ...p.position,
          outcome:
            confirmEnd === "resign"
              ? { reason: "resignation", winner: opposite(p.position.turn) }
              : { reason: "agreement", winner: null },
        },
      }));
    setConfirmEnd(null);
    clear();
  };
  const resultText =
    game?.status === "waiting"
      ? "Waiting for a friend"
      : outcome
        ? outcome.winner
          ? `${label(outcome.winner)} wins · ${outcome.reason}`
          : `Draw · ${outcome.reason}`
        : needsReady
          ? "Waiting for both players to be ready"
          : `${label(state.turn)} to move${currentStatus.check ? " · Check" : ""}`;
  const playerBar = (side: Color) => (
    <div className="chess-player-bar">
      <div className="chess-player-name">
        <span className={`chess-side ${side}`} />
        <span>
          {game
            ? game[side === "white" ? "white_id" : "black_id"]
              ? game[side === "white" ? "white_name" : "black_name"]
              : "Open seat"
            : `${label(side)} · Local player`}
        </span>
        {side === playerSide && <span className="chess-badge">You</span>}
      </div>
      <span className="chess-clock" aria-label={`${label(side)} clock`}>
        {!game || game.time_control.mode === "untimed"
          ? "Untimed"
          : game.status === "waiting" || needsReady
            ? "Not started"
            : game.status === "finished"
              ? "Finished"
              : clockText(remaining(game, side, online.now))}
        {state.turn === side && !outcome && game?.started_at && <small> · To move</small>}
      </span>
    </div>
  );
  const boardProps = {
    state,
    selected,
    targets: moves.map((m) => m.to),
    onSelect: select,
    orientation,
    level,
    lastMove: history.at(-1),
    cameraKey,
    pending: pending?.to,
    checked: currentStatus.check
      ? state.pieces.find((p) => p.type === "king" && p.color === state.turn)?.square
      : undefined,
    onCancel: clear,
    onFailure: fallback,
  };
  return (
    <div
      className={`chess-app ${inGame ? "chess-game" : ""}`}
      onKeyDown={(e) => {
        if (e.key === "Escape") clear();
      }}
    >
      <div className="chess-heading">
        <div>
          <div className="chess-eyebrow">Good game, G.</div>
          <h1>gg³</h1>
          {!inGame && <p>Familiar pieces. A whole new dimension.</p>}
        </div>
        <div className="chess-heading-links">
          {inGame && (
            <a
              className="chess-button"
              href="/projects/3d-chess/"
              onClick={(e) => {
                e.preventDefault();
                online.leave();
              }}
            >
              Back to games
            </a>
          )}
          <a className="chess-button" href="/projects/3d-chess/rules/">
            How to play ↗
          </a>
        </div>
      </div>
      {(error || online.error) && (
        <div role="alert" className="chess-error">
          {error || online.error}{" "}
          <button
            aria-label="Dismiss message"
            onClick={() => {
              setError("");
              online.setError("");
            }}
          >
            ×
          </button>
        </div>
      )}
      {!inGame ? (
        <Lobby
          ruleset={ruleset}
          setRuleset={setRuleset}
          color={color}
          setColor={setColor}
          name={name}
          setName={rememberName}
          start={start}
          resume={online.practice}
          saved={saved}
          games={online.games}
          now={online.now}
          open={online.open}
          busy={online.busy}
          configured={online.configured}
          error={online.error}
          create={async (t) => {
            try {
              rememberName(guestName(name));
            } catch (e) {
              online.setError((e as Error).message);
              return false;
            }
            return online.create(ruleset, color, name, t);
          }}
        />
      ) : online.gameId && !game ? (
        <section className="chess-panel chess-invite">
          <h2>A seat at the table</h2>
          {online.invite ? (
            <>
              <p>
                {online.invite.ruleset === "strato" ? "Strato Chess" : "Chess³"} ·{" "}
                {online.invite.rules_version} · {timeLabel(online.invite.time_control)} · You’ll
                play {label(online.invite.side)}
              </p>
              <label htmlFor="join-name">Guest name</label>
              <input
                id="join-name"
                value={name}
                onChange={(e) => rememberName(e.target.value)}
                autoComplete="nickname"
              />
              <p className="chess-muted">Your anonymous seat is saved in this browser.</p>
              <button
                className="chess-primary"
                disabled={online.busy || !online.initialized}
                onClick={() => {
                  try {
                    const normalized = guestName(name);
                    rememberName(normalized);
                    void online.join(normalized);
                  } catch (e) {
                    online.setError((e as Error).message);
                  }
                }}
              >
                Join game
              </button>
            </>
          ) : (
            <p>
              {!online.configured
                ? "Online play is not configured."
                : !online.initialized
                  ? "Loading invitation…"
                  : "Loading your seat, or this invitation is no longer available in this browser."}
            </p>
          )}
        </section>
      ) : (
        <div className="chess-layout">
          <section className="chess-board-panel" aria-label="Game board">
            {playerBar(opposite(orientation))}
            <div className={`chess-canvas ${renderer === "2d" ? "is-2d" : ""}`}>
              {renderer === "3d" ? <Board3D {...boardProps} /> : <Board2D {...boardProps} />}
            </div>
            {playerBar(orientation)}
            <div className="chess-toolbar">
              <div aria-label="Visible levels">
                {[null, 0, 1, 2].map((l) => (
                  <button
                    key={String(l)}
                    title={
                      l === null
                        ? "All levels"
                        : `${LEVELS[l].name}, ${LEVELS[l].position.toLowerCase()} level`
                    }
                    aria-pressed={level === l}
                    onClick={() => setLevel(l)}
                  >
                    {l === null ? "All levels" : `${LEVELS[l].symbol} · ${LEVELS[l].position}`}
                    {selected && (
                      <small>
                        {" "}
                        (
                        {
                          new Set(
                            moves
                              .filter((m) => l === null || Number(m.to[0]) === l + 1)
                              .map((m) => m.to),
                          ).size
                        }
                        )
                      </small>
                    )}
                  </button>
                ))}
              </div>
              <div aria-label="Board renderer">
                <button
                  aria-pressed={renderer === "3d"}
                  disabled={webglFailed}
                  onClick={() => changeRenderer("3d")}
                >
                  3D
                </button>
                <button aria-pressed={renderer === "2d"} onClick={() => changeRenderer("2d")}>
                  2D
                </button>
              </div>
              <div>
                <button
                  onClick={() => {
                    setViewSide(opposite(orientation));
                    setCameraKey((k) => k + 1);
                  }}
                >
                  Flip
                </button>
                <button
                  onClick={() => {
                    setViewSide(null);
                    setLevel(renderer === "2d" && mobile() ? 0 : null);
                    setCameraKey((k) => k + 1);
                  }}
                >
                  Reset view
                </button>
              </div>
            </div>
            {webglFailed && (
              <p className="chess-fallback-note" role="status">
                3D graphics are unavailable. The 2D board is ready to play.
              </p>
            )}
          </section>
          <aside className="chess-sidebar">
            <section className="chess-panel chess-status-panel">
              <div className="chess-status" role="status">
                {resultText}
              </div>
              <p className="chess-muted">
                {state.ruleset === "strato" ? "Strato Chess" : "Chess³"} ·{" "}
                {game ? timeLabel(game.time_control) : "Untimed practice"}
              </p>
              {game && (
                <p className="chess-muted">
                  {online.connection} · You are {playerSide}
                </p>
              )}
              {needsReady && (
                <>
                  <p className="chess-muted">
                    White {game.white_ready ? "ready" : "not ready"} · Black{" "}
                    {game.black_ready ? "ready" : "not ready"}
                  </p>
                  <button
                    disabled={
                      online.busy || (playerSide === "white" ? game.white_ready : game.black_ready)
                    }
                    onClick={() => void online.action("ready")}
                  >
                    {(playerSide === "white" ? game.white_ready : game.black_ready)
                      ? "You are ready"
                      : "Ready"}
                  </button>
                </>
              )}
              {game?.status === "waiting" && (
                <>
                  <button
                    onClick={() =>
                      void navigator.clipboard
                        .writeText(location.href)
                        .then(() => setError("Invite link copied."))
                        .catch(() => setError("Copy the invitation from the address bar."))
                    }
                  >
                    Copy invite link
                  </button>
                  <input
                    aria-label="Invite link"
                    readOnly
                    value={typeof location === "undefined" ? "" : location.href}
                    onFocus={(e) => e.target.select()}
                  />
                </>
              )}
            </section>
            <section className="chess-panel chess-move-panel">
              <h2>Make a move</h2>
              <div className="chess-move-fields">
                <div>
                  <label htmlFor="chess-from">Piece</label>
                  <select
                    id="chess-from"
                    value={selected}
                    disabled={!canPlay}
                    onChange={(e) => {
                      setSelected(e.target.value);
                      choose(null);
                    }}
                  >
                    <option value="">Choose a piece</option>
                    {movable.map((p) => (
                      <option key={p.id} value={p.square}>
                        {label(p.type)} · {formatSquare(p.square)}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="chess-to">Destination / promotion</label>
                  <select
                    id="chess-to"
                    disabled={!canPlay || !moves.length}
                    value={pending ? JSON.stringify(pending) : ""}
                    onChange={(e) => choose(e.target.value ? JSON.parse(e.target.value) : null)}
                  >
                    <option value="">Choose a move</option>
                    {moves
                      .filter((m, i, a) => a.findIndex((n) => n.to === m.to) === i)
                      .map((m) => (
                        <option key={JSON.stringify(m)} value={JSON.stringify(m)}>
                          {m.promotion
                            ? moveLabels.get(JSON.stringify(m))?.replace(/=[QRBN][+#]?$/, "=…")
                            : moveLabels.get(JSON.stringify(m))}
                        </option>
                      ))}
                  </select>
                </div>
              </div>
              {pending?.promotion && (
                <fieldset className="chess-promotion">
                  <legend>Promote to</legend>
                  {(
                    [
                      ["queen", "Q"],
                      ["rook", "R"],
                      ["bishop", "B"],
                      ["knight", "N"],
                    ] as const
                  ).map(([p, l]) => (
                    <label key={p} title={label(p)}>
                      <input
                        aria-label={`${l} · ${label(p)}`}
                        type="radio"
                        name="promotion"
                        value={p}
                        checked={promotion === p}
                        onChange={() => setPromotion(p)}
                      />
                      {l}
                    </label>
                  ))}
                </fieldset>
              )}
              <div className="chess-confirm">
                <button
                  className="chess-primary"
                  disabled={!pending || !canPlay || Boolean(pending.promotion && !promotion)}
                  onClick={commit}
                >
                  Confirm {pendingLabel ?? "move"}
                </button>
                {pending && (
                  <button className="chess-wide" onClick={clear}>
                    Cancel selection
                  </button>
                )}
              </div>
            </section>
            <section className="chess-panel chess-actions">
              {!outcome && (!game || game.status === "active") && (
                <div className="chess-choice">
                  <button disabled={online.busy} onClick={() => setConfirmEnd("resign")}>
                    Resign
                  </button>
                  <button
                    disabled={online.busy || Boolean(game?.draw_offer)}
                    onClick={() => setConfirmEnd("draw")}
                  >
                    {game ? "Offer draw" : "Agree draw"}
                  </button>
                </div>
              )}
              {confirmEnd && (
                <div>
                  <p>
                    {confirmEnd === "resign"
                      ? `${label(playerSide ?? state.turn)} resigns?`
                      : game
                        ? "Offer your opponent a draw?"
                        : "Both players agree to a draw?"}
                  </p>
                  <div className="chess-choice">
                    <button disabled={online.busy} onClick={end}>
                      Confirm
                    </button>
                    <button onClick={() => setConfirmEnd(null)}>Cancel</button>
                  </div>
                </div>
              )}
              {game?.draw_offer && (
                <div>
                  <p>
                    {game.draw_offer === online.userId
                      ? "Draw offered. Clocks keep running."
                      : "Your friend offered a draw."}
                  </p>
                  {game.draw_offer !== online.userId && (
                    <div className="chess-choice">
                      <button
                        disabled={online.busy}
                        onClick={() => void online.action("accept-draw")}
                      >
                        Accept draw
                      </button>
                      <button
                        disabled={online.busy}
                        onClick={() => void online.action("decline-draw")}
                      >
                        Decline draw
                      </button>
                    </div>
                  )}
                </div>
              )}
              {game && (
                <button
                  className="chess-wide"
                  disabled={online.busy}
                  onClick={() => void online.refresh()}
                >
                  Reconnect / refresh
                </button>
              )}
            </section>
            <section className="chess-panel chess-history-panel">
              <h2>
                Move history · {Math.ceil(state.ply / 2)}{" "}
                {state.ply > 0 && state.ply <= 2 ? "move" : "moves"}
              </h2>
              <ol className="chess-history">
                {historyLabels.map((text, i) => (
                  <li key={i}>
                    <span>
                      {Math.floor(i / 2) + 1}
                      {i % 2 ? "…" : "."}
                    </span>
                    <span>{text}</span>
                  </li>
                ))}
              </ol>
              {!history.length && <p className="chess-muted">No moves yet.</p>}
            </section>
          </aside>
        </div>
      )}
    </div>
  );
}
