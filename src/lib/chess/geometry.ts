import type { Coordinate, Piece, Square, State } from "./types.ts";
export function coordinate(square: Square): Coordinate {
  if (!/^[123][a-h][1-8]$/.test(square)) throw new Error("Invalid square");
  return [square.charCodeAt(1) - 97, Number(square[2]) - 1, Number(square[0]) - 1];
}
export function square([f, r, l]: Coordinate): Square {
  return `${l + 1}${String.fromCharCode(97 + f)}${r + 1}`;
}
export const SQUARES: Square[] = Array.from({ length: 192 }, (_, i) =>
  square([i % 8, Math.floor(i / 8) % 8, Math.floor(i / 64)]),
);
export const at = (state: State, sq: Square) => state.pieces.find((p) => p.square === sq);
export function delta(from: Square, to: Square): Coordinate {
  const a = coordinate(from),
    b = coordinate(to);
  return [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
}
export function clearLine(state: State, from: Square, to: Square): boolean {
  const a = coordinate(from),
    d = delta(from, to),
    n = Math.max(...d.map(Math.abs));
  for (let i = 1; i < n; i++) {
    const cell = a.map((v, j) => v + (d[j] * i) / n) as Coordinate;
    if (cell.some((v) => !Number.isInteger(v)) || at(state, square(cell))) return false;
  }
  return true;
}
export function planar(state: State, piece: Piece, to: Square, capture: boolean): boolean {
  const [x, y, z] = delta(piece.square, to),
    a = Math.abs(x),
    b = Math.abs(y);
  if (z || (!x && !y)) return false;
  const forward = piece.color === "white" ? 1 : -1;
  switch (piece.type) {
    case "pawn":
      return capture
        ? a === 1 && y === forward
        : x === 0 &&
            (y === forward || (!piece.moved && y === 2 * forward)) &&
            clearLine(state, piece.square, to);
    case "knight":
      return a * b === 2;
    case "king":
      return Math.max(a, b) === 1;
    case "bishop":
      return a === b && clearLine(state, piece.square, to);
    case "rook":
      return (x === 0 || y === 0) && clearLine(state, piece.square, to);
    case "queen":
      return (x === 0 || y === 0 || a === b) && clearLine(state, piece.square, to);
  }
}
