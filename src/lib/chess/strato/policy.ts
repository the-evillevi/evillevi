import { at, clearLine, coordinate, delta, planar, square } from "../geometry.ts";
import type { Piece, Square, State } from "../types.ts";
export function attacks(state: State, piece: Piece, to: Square): boolean {
  return planar(state, piece, to, true);
}
export function movement(state: State, piece: Piece, to: Square, capture: boolean): boolean {
  const [x, y, z] = delta(piece.square, to),
    a = Math.abs(x),
    b = Math.abs(y),
    c = Math.abs(z);
  if (!z) return planar(state, piece, to, capture);
  if (capture || at(state, to)) return false;
  if (piece.type === "rook" || piece.type === "bishop" || piece.type === "queen") {
    const rook = x === 0 && y === 0;
    const bishop = a === c && b === c;
    return (
      (piece.type === "rook" ? rook : piece.type === "bishop" ? bishop : rook || bishop) &&
      clearLine(state, piece.square, to)
    );
  }
  const origin = coordinate(piece.square),
    target = coordinate(to);
  const transferred = square([origin[0], origin[1], target[2]]);
  if (at(state, transferred) || !clearLine(state, piece.square, transferred)) return false;
  if (piece.type === "king")
    return c === 1 && (a + b === 0 || (!piece.moved && Math.max(a, b) === 1));
  if (piece.type === "pawn" && c !== 1) return false;
  return planar(state, { ...piece, square: transferred }, to, false);
}
