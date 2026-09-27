import { coordinate } from "./geometry.ts";
import { VERSIONS, type State, type Ruleset, type PieceType, type Color } from "./types.ts";
export function initialState(ruleset: Ruleset, version: string = VERSIONS[ruleset]): State {
  if (!Object.hasOwn(VERSIONS, ruleset) || version !== VERSIONS[ruleset])
    throw new Error("Unsupported rules version");
  const state: State = {
    schemaVersion: 1,
    ruleset,
    rulesVersion: version,
    pieces: [],
    turn: "white",
    ply: 0,
    enPassant: null,
    outcome: null,
  };
  const back: PieceType[] = [
    "rook",
    "knight",
    "bishop",
    "queen",
    "king",
    "bishop",
    "knight",
    "rook",
  ];
  for (const color of ["white", "black"] as Color[]) {
    const level = color === "white" ? 1 : 3,
      rank = color === "white" ? 1 : 8,
      pawnRank = color === "white" ? 2 : 7;
    for (let f = 0; f < 8; f++) {
      const file = String.fromCharCode(97 + f);
      state.pieces.push({
        id: `${color}-${file}`,
        color,
        type: back[f],
        square: `${level}${file}${rank}`,
        moved: false,
      });
      state.pieces.push({
        id: `${color}-pawn-${file}`,
        color,
        type: "pawn",
        square: `${level}${file}${pawnRank}`,
        moved: false,
      });
    }
  }
  return state;
}
/** Validate untrusted serialized snapshots without coercion. */
export function parseState(value: unknown): State {
  if (!value || typeof value !== "object") throw new Error("Invalid position");
  const s = value as State;
  if (
    s.schemaVersion !== 1 ||
    !Object.hasOwn(VERSIONS, s.ruleset) ||
    s.rulesVersion !== VERSIONS[s.ruleset] ||
    !["white", "black"].includes(s.turn) ||
    !Number.isSafeInteger(s.ply) ||
    s.ply < 0 ||
    !Array.isArray(s.pieces) ||
    s.pieces.length > 32
  )
    throw new Error("Invalid position metadata");
  const ids = new Set(),
    cells = new Set();
  for (const p of s.pieces) {
    if (
      !p ||
      typeof p.id !== "string" ||
      !p.id ||
      ids.has(p.id) ||
      cells.has(p.square) ||
      !["white", "black"].includes(p.color) ||
      !["pawn", "knight", "bishop", "rook", "queen", "king"].includes(p.type) ||
      typeof p.moved !== "boolean"
    )
      throw new Error("Invalid piece");
    coordinate(p.square);
    ids.add(p.id);
    cells.add(p.square);
    if (p.type === "pawn" && ["1", "8"].includes(p.square[2]))
      throw new Error("Unpromoted pawn on terminal rank");
  }
  for (const color of ["white", "black"])
    if (s.pieces.filter((p) => p.color === color && p.type === "king").length !== 1)
      throw new Error("Position requires two kings");
  if (s.enPassant !== null) {
    if (!s.enPassant || typeof s.enPassant !== "object") throw new Error("Invalid en passant");
    const t = coordinate(s.enPassant.target),
      p = s.pieces.find((p) => p.id === s.enPassant?.pawnId);
    if (!p || p.type !== "pawn" || !p.moved || p.color === s.turn || cells.has(s.enPassant.target))
      throw new Error("Invalid en passant pawn");
    const pos = coordinate(p.square),
      dir = p.color === "white" ? 1 : -1;
    if (t[0] !== pos[0] || t[2] !== pos[2] || pos[1] - t[1] !== dir)
      throw new Error("Invalid en passant target");
  }
  if (
    s.outcome !== null &&
    (!s.outcome ||
      !["checkmate", "stalemate", "resignation", "agreement"].includes(s.outcome.reason) ||
      ![null, "white", "black"].includes(s.outcome.winner) ||
      ["stalemate", "agreement"].includes(s.outcome.reason) !== (s.outcome.winner === null))
  )
    throw new Error("Invalid outcome");
  return structuredClone(s);
}
