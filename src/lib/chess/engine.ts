import * as strato from "./strato/policy.ts";
import * as chess3 from "./chess3/policy.ts";
import { at, coordinate, delta, SQUARES, square } from "./geometry.ts";
import {
  opposite,
  PROMOTIONS,
  VERSIONS,
  type Color,
  type Move,
  type Piece,
  type State,
  type Square,
} from "./types.ts";
export { initialState, parseState } from "./state.ts";
export * from "./types.ts";
export { coordinate, SQUARES } from "./geometry.ts";
function policy(state: State) {
  if (!Object.hasOwn(VERSIONS, state.ruleset) || state.rulesVersion !== VERSIONS[state.ruleset])
    throw new Error("Unsupported rules version");
  return state.ruleset === "strato" ? strato : chess3;
}
export function attacked(state: State, target: Square, by: Color): boolean {
  const rules = policy(state);
  return state.pieces.some((p) => p.color === by && rules.attacks(state, p, target));
}
export function inCheck(state: State, color: Color = state.turn): boolean {
  const king = state.pieces.find((p) => p.type === "king" && p.color === color);
  if (!king) throw new Error("Missing king");
  return attacked(state, king.square, opposite(color));
}
function enact(state: State, move: Move): State {
  const next = structuredClone(state),
    p = at(next, move.from)!;
  const victim = at(next, move.to);
  const displacement = delta(move.from, move.to);
  const ep =
    p.type === "pawn" &&
    displacement[2] === 0 &&
    Math.abs(displacement[0]) === 1 &&
    displacement[1] === (p.color === "white" ? 1 : -1) &&
    move.to === state.enPassant?.target &&
    !victim
      ? state.enPassant.pawnId
      : null;
  next.pieces = next.pieces.filter((v) => v.id !== victim?.id && v.id !== ep);
  const [f, r, l] = coordinate(move.from),
    dest = coordinate(move.to);
  next.enPassant =
    p.type === "pawn" && l === dest[2] && Math.abs(dest[1] - r) === 2
      ? { target: square([f, (dest[1] + r) / 2, l]), pawnId: p.id }
      : null;
  p.square = move.to;
  p.moved = true;
  if (move.promotion) p.type = move.promotion;
  if (move.castle) {
    const rook = next.pieces.find(
      (v) => v.id === `${p.color}-${move.castle === "king" ? "h" : "a"}`,
    )!;
    rook.square = square([move.castle === "king" ? 5 : 3, r, dest[2]]);
    rook.moved = true;
  }
  next.turn = opposite(state.turn);
  next.ply++;
  next.outcome = null;
  return next;
}
function castles(state: State, king: Piece): Move[] {
  const white = king.color === "white",
    rank = white ? 0 : 7,
    level = white ? 0 : 2;
  if (
    king.type !== "king" ||
    king.moved ||
    king.id !== `${king.color}-e` ||
    king.square !== square([4, rank, level]) ||
    inCheck(state, king.color)
  )
    return [];
  const moves: Move[] = [];
  for (const side of ["king", "queen"] as const) {
    const rookFile = side === "king" ? 7 : 0,
      kingFile = side === "king" ? 6 : 2,
      rookDest = side === "king" ? 5 : 3;
    const rook = at(state, square([rookFile, rank, level]));
    if (
      !rook ||
      rook.id !== `${king.color}-${side === "king" ? "h" : "a"}` ||
      rook.type !== "rook" ||
      rook.color !== king.color ||
      rook.moved
    )
      continue;
    const between = side === "king" ? [5, 6] : [1, 2, 3];
    if (between.some((f) => at(state, square([f, rank, level])))) continue;
    const transit = structuredClone(state);
    at(transit, king.square)!.square = square([rookDest, rank, level]);
    if (inCheck(transit, king.color)) continue;
    const base: Move = { from: king.square, to: square([kingFile, rank, level]), castle: side };
    if (inCheck(enact(state, base), king.color)) continue;
    moves.push(base);
    if (state.ruleset === "strato")
      for (const z of [level - 1, level + 1]) {
        if (
          z < 0 ||
          z > 2 ||
          at(state, square([kingFile, rank, z])) ||
          at(state, square([rookDest, rank, z]))
        )
          continue;
        const move = { ...base, to: square([kingFile, rank, z]) };
        if (!inCheck(enact(state, move), king.color)) moves.push(move);
      }
  }
  return moves;
}
export function legalMoves(state: State, from: Square): Move[] {
  const rules = policy(state),
    piece = at(state, from);
  if (state.outcome || !piece || piece.color !== state.turn) return [];
  const checked = inCheck(state),
    moves: Move[] = [];
  for (const to of SQUARES) {
    const target = at(state, to);
    if (to === from || target?.color === piece.color || target?.type === "king") continue;
    const d = delta(from, to);
    const epPawn = state.pieces.find((p) => p.id === state.enPassant?.pawnId);
    const ep =
      piece.type === "pawn" &&
      to === state.enPassant?.target &&
      !target &&
      d[2] === 0 &&
      Math.abs(d[0]) === 1 &&
      epPawn?.square === square([coordinate(to)[0], coordinate(from)[1], coordinate(from)[2]]);
    if (!rules.movement(state, piece, to, Boolean(target || ep))) continue;
    if (state.ruleset === "strato" && !piece.moved && d[2] === 0) {
      if (!checked || (piece.type === "king" && (!target || !rules.attacks(state, target, from))))
        continue;
    }
    const promote =
      piece.type === "pawn" && coordinate(to)[1] === (piece.color === "white" ? 7 : 0);
    for (const promotion of promote ? PROMOTIONS : [undefined]) {
      const move: Move = { from, to, ...(promotion ? { promotion } : {}) };
      if (!inCheck(enact(state, move), piece.color)) moves.push(move);
    }
  }
  return moves.concat(castles(state, piece));
}
export function status(state: State) {
  policy(state);
  const check = inCheck(state);
  if (state.outcome) return { check, outcome: state.outcome };
  const canMove = state.pieces.some(
    (p) => p.color === state.turn && legalMoves(state, p.square).length > 0,
  );
  return {
    check,
    outcome: canMove
      ? null
      : {
          reason: check ? ("checkmate" as const) : ("stalemate" as const),
          winner: check ? opposite(state.turn) : null,
        },
  };
}
export function applyMove(state: State, move: Move): State {
  if (
    !move ||
    typeof move !== "object" ||
    Object.keys(move).some((k) => !["from", "to", "promotion", "castle"].includes(k))
  )
    throw new Error("Invalid move payload");
  coordinate(move.from);
  coordinate(move.to);
  const legal = legalMoves(state, move.from).find(
    (m) => m.to === move.to && m.promotion === move.promotion && m.castle === move.castle,
  );
  if (!legal) throw new Error("Illegal move");
  const next = enact(state, legal);
  next.outcome = status(next).outcome;
  return next;
}
