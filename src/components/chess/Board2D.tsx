import { useRef, useState } from "react";
import type { BoardProps } from "./Board3D";
const GLYPHS = {
  white: { pawn: "♙", knight: "♘", bishop: "♗", rook: "♖", queen: "♕", king: "♔" },
  black: { pawn: "♟", knight: "♞", bishop: "♝", rook: "♜", queen: "♛", king: "♚" },
};
export function Board2D(props: BoardProps) {
  const root = useRef<HTMLDivElement>(null);
  const [focus, setFocus] = useState(0);
  const levels = props.level === null ? [0, 1, 2] : [props.level];
  return (
    <div
      ref={root}
      className={`chess-2d ${props.level === null ? "all-levels" : ""}`}
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          props.onCancel?.();
          e.preventDefault();
          return;
        }
        const buttons = Array.from(
          root.current!.querySelectorAll<HTMLButtonElement>("button[data-square]"),
        );
        const index = buttons.indexOf(document.activeElement as HTMLButtonElement);
        const delta = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -8, ArrowDown: 8 }[e.key];
        if (delta !== undefined && index >= 0) {
          e.preventDefault();
          const next = Math.max(0, Math.min(buttons.length - 1, index + delta));
          setFocus(next);
          buttons[next].focus();
        }
      }}
    >
      {levels.map((level, boardIndex) => (
        <section className="chess-flat-level" key={level} aria-label={`Level ${level + 1}`}>
          <h3>Level {level + 1}</h3>
          <div className="chess-text-board" role="group" aria-label={`Level ${level + 1} squares`}>
            {Array.from({ length: 64 }, (_, i) => {
              const f = props.orientation === "white" ? i % 8 : 7 - (i % 8);
              const r = props.orientation === "white" ? 7 - Math.floor(i / 8) : Math.floor(i / 8);
              const sq = `${level + 1}${String.fromCharCode(97 + f)}${r + 1}`;
              const piece = props.state.pieces.find((p) => p.square === sq),
                target = props.targets.includes(sq);
              const capture =
                target &&
                (Boolean(piece) ||
                  (props.state.enPassant?.target === sq &&
                    props.state.pieces.some(
                      (p) => p.square === props.selected && p.type === "pawn",
                    )));
              const last = props.lastMove?.from === sq || props.lastMove?.to === sq;
              const index = boardIndex * 64 + i;
              return (
                <button
                  key={sq}
                  data-square={sq}
                  data-dark={(f + r) % 2 === 0}
                  data-selected={props.selected === sq}
                  data-pending={props.pending === sq}
                  data-last={last}
                  data-check={props.checked === sq}
                  tabIndex={Math.min(focus, levels.length * 64 - 1) === index ? 0 : -1}
                  onFocus={() => setFocus(index)}
                  onClick={() => props.onSelect(sq)}
                  aria-label={`${sq}: ${piece ? `${piece.color} ${piece.type}` : "empty"}${target ? (capture ? ", legal capture" : ", legal destination") : ""}${props.selected === sq ? ", selected source" : ""}${props.pending === sq ? ", selected destination" : ""}${props.checked === sq ? ", check" : ""}${last ? ", last move" : ""}`}
                >
                  {i % 8 === 0 && <small className="rank">{r + 1}</small>}
                  {i >= 56 && <small className="file">{String.fromCharCode(97 + f)}</small>}
                  <span className={`chess-glyph ${piece?.color ?? ""}`} aria-hidden="true">
                    {piece ? GLYPHS[piece.color][piece.type] : ""}
                  </span>
                  {target && (
                    <span aria-hidden="true" className={capture ? "chess-capture" : "chess-dot"} />
                  )}
                </button>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
