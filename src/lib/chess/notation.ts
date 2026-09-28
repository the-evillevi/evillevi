import { applyMove, inCheck, legalMoves } from "./engine.ts";
import { at, coordinate } from "./geometry.ts";
import type { Move, Piece, PieceType, Square, State } from "./types.ts";

export const LEVELS = [
  { symbol: "α", name: "Alpha", position: "Bottom" },
  { symbol: "β", name: "Beta", position: "Middle" },
  { symbol: "γ", name: "Gamma", position: "Top" },
] as const;
const LETTERS: Record<PieceType, string> = {
  pawn: "",
  knight: "N",
  bishop: "B",
  rook: "R",
  queen: "Q",
  king: "K",
};

export function formatSquare(square: Square): string {
  const [, , level] = coordinate(square);
  return square.slice(1) + LEVELS[level].symbol;
}

export function describeSquare(square: Square): string {
  const [, , level] = coordinate(square);
  return `${square.slice(1)}, ${LEVELS[level].name}, ${LEVELS[level].position.toLowerCase()} level`;
}

function origin(state: State, move: Move, piece: Piece, capture: boolean): string {
  const others = state.pieces.filter(
    (p) =>
      p.color === piece.color &&
      p.type === piece.type &&
      p.square !== move.from &&
      legalMoves(state, p.square).some(
        (m) => m.to === move.to && m.promotion === move.promotion && m.castle === move.castle,
      ),
  );
  const parts = (square: Square) => [square[1], square[2], LEVELS[coordinate(square)[2]].symbol];
  const source = parts(move.from);
  // Keep SAN's file/rank preference. Add the level only when planar details cannot distinguish.
  // Pawn captures always include the source file; quiet pawns can also be ambiguous in 3D.
  const candidates =
    piece.type === "pawn" && capture
      ? [[0], [0, 1], [0, 2], [0, 1, 2]]
      : [[], [0], [1], [0, 1], [2], [0, 2], [1, 2], [0, 1, 2]];
  const chosen = candidates.find((indices) =>
    others.every((p) => indices.some((i) => source[i] !== parts(p.square)[i])),
  )!;
  return chosen.map((i) => source[i]).join("");
}

function render(state: State, move: Move, next: State): string {
  const piece = at(state, move.from)!;
  // Comparing piece counts also handles en passant without duplicating its movement rules.
  const capture = next.pieces.length < state.pieces.length;
  const destination = formatSquare(move.to);
  const base = move.castle
    ? `${move.castle === "king" ? "O-O" : "O-O-O"}${LEVELS[coordinate(move.to)[2]].symbol}`
    : `${LETTERS[piece.type]}${origin(state, move, piece, capture)}${capture ? "x" : ""}${destination}${move.promotion ? `=${LETTERS[move.promotion]}` : ""}`;
  return base + (next.outcome?.reason === "checkmate" ? "#" : inCheck(next) ? "+" : "");
}

/** SAN with a Greek destination level; rejects illegal moves and never mutates the position. */
export function formatMove(state: State, move: Move): string {
  return render(state, move, applyMove(state, move));
}

/** Replay canonical moves once, preserving the context for captures, ambiguity and checks. */
export function formatHistory(initial: State, moves: readonly Move[]): string[] {
  let state = initial;
  return moves.map((move) => {
    const next = applyMove(state, move);
    const text = render(state, move, next);
    state = next;
    return text;
  });
}
