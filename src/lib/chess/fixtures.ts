import { initialState } from "./state.ts";
import type { Color, Piece, PieceType, Ruleset, State, Move } from "./types.ts";
export function piece(
  type: PieceType,
  square: string,
  color: Color = "white",
  moved = true,
  id = `${color}-${type}-${square}`,
): Piece {
  return { id, type, square, color, moved };
}
export function position(ruleset: Ruleset, pieces: Piece[], turn: Color = "white"): State {
  return {
    ...initialState(ruleset),
    turn,
    pieces: [
      ...(!pieces.some((p) => p.type === "king" && p.color === "white")
        ? [piece("king", "1h1")]
        : []),
      ...(!pieces.some((p) => p.type === "king" && p.color === "black")
        ? [piece("king", "3h8", "black")]
        : []),
      ...pieces,
    ],
  };
}
export interface Fixture {
  name: string;
  opening?: boolean;
  pieces?: Piece[];
  move: Move;
  strato: boolean;
  chess3: boolean;
}
export const FIXTURES: Fixture[] = [
  {
    name: "opening planar pawn",
    opening: true,
    move: { from: "1e2", to: "1e4" },
    strato: false,
    chess3: true,
  },
  {
    name: "opening compound pawn",
    opening: true,
    move: { from: "1e2", to: "2e3" },
    strato: true,
    chess3: false,
  },
  {
    name: "opening vertical double pawn",
    opening: true,
    move: { from: "1e2", to: "3e2" },
    strato: false,
    chess3: true,
  },
  {
    name: "vertical rook capture",
    pieces: [piece("rook", "1a4"), piece("pawn", "3a4", "black")],
    move: { from: "1a4", to: "3a4" },
    strato: false,
    chess3: true,
  },
  {
    name: "vertical rook blocker",
    pieces: [piece("rook", "1a4"), piece("pawn", "2a4")],
    move: { from: "1a4", to: "3a4" },
    strato: false,
    chess3: false,
  },
  {
    name: "compound knight",
    pieces: [piece("knight", "1b1")],
    move: { from: "1b1", to: "2c3" },
    strato: true,
    chess3: false,
  },
  {
    name: "spatial knight",
    pieces: [piece("knight", "1b1")],
    move: { from: "1b1", to: "2b3" },
    strato: false,
    chess3: true,
  },
  {
    name: "three axis bishop",
    pieces: [piece("bishop", "1c1")],
    move: { from: "1c1", to: "3e3" },
    strato: true,
    chess3: true,
  },
  {
    name: "bishop cannot change level and rank only",
    pieces: [piece("bishop", "1c1")],
    move: { from: "1c1", to: "2c2" },
    strato: false,
    chess3: false,
  },
  {
    name: "queen vertical rank diagonal",
    pieces: [piece("queen", "1d4")],
    move: { from: "1d4", to: "2d5" },
    strato: false,
    chess3: true,
  },
  {
    name: "pawn forward level capture",
    pieces: [piece("pawn", "1e4"), piece("pawn", "2e5", "black")],
    move: { from: "1e4", to: "2e5" },
    strato: false,
    chess3: true,
  },
  {
    name: "transfer castling",
    pieces: [
      piece("king", "1e1", "white", false, "white-e"),
      piece("rook", "1h1", "white", false, "white-h"),
    ],
    move: { from: "1e1", to: "2g1", castle: "king" },
    strato: true,
    chess3: false,
  },
];
