import { clearLine, delta } from "../geometry.ts";
import type { Piece, Square, State } from "../types.ts";
export function movement(state: State, piece: Piece, to: Square, capture: boolean): boolean {
  const [x, y, z] = delta(piece.square, to),
    a = Math.abs(x),
    b = Math.abs(y),
    c = Math.abs(z);
  if (a + b + c === 0) return false;
  const nonzero = [a, b, c].filter(Boolean);
  switch (piece.type) {
    case "pawn": {
      const forward = piece.color === "white" ? 1 : -1;
      if (capture) return y === forward && (c === 0 ? a === 1 : c === 1 && a <= 1);
      return (
        x === 0 &&
        ((z === 0 && (y === forward || (!piece.moved && y === 2 * forward))) ||
          (y === 0 && (c === 1 || (!piece.moved && c === 2)))) &&
        clearLine(state, piece.square, to)
      );
    }
    case "knight":
      return [a, b, c].sort((u, v) => u - v).join() === "0,1,2";
    case "king":
      return Math.max(a, b, c) === 1;
    case "rook":
      return nonzero.length === 1 && clearLine(state, piece.square, to);
    case "bishop":
      return a === b && a > 0 && (c === 0 || c === a) && clearLine(state, piece.square, to);
    case "queen":
      return nonzero.every((v) => v === nonzero[0]) && clearLine(state, piece.square, to);
  }
}
export const attacks = (state: State, piece: Piece, to: Square) => movement(state, piece, to, true);
