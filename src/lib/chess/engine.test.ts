import { describe, expect, it } from "vitest";
import {
  applyMove,
  attacked,
  inCheck,
  initialState,
  legalMoves,
  parseState,
  status,
  VERSIONS,
  type Ruleset,
} from "./engine.ts";
import { FIXTURES, piece, position } from "./fixtures.ts";

for (const variant of ["strato", "chess3"] as Ruleset[])
  describe(variant, () => {
    it("has the complete versioned opening", () => {
      const s = initialState(variant);
      expect(s.rulesVersion).toBe(VERSIONS[variant]);
      expect(s.pieces).toHaveLength(32);
      expect(
        s.pieces
          .filter((p) => p.color === "white")
          .map((p) => p.square)
          .sort(),
      ).toEqual(
        "a b c d e f g h"
          .split(" ")
          .flatMap((f) => [`1${f}1`, `1${f}2`])
          .sort(),
      );
      expect(
        s.pieces
          .filter((p) => p.color === "black")
          .map((p) => p.square)
          .sort(),
      ).toEqual(
        "a b c d e f g h"
          .split(" ")
          .flatMap((f) => [`3${f}7`, `3${f}8`])
          .sort(),
      );
      expect(s.pieces.filter((p) => p.type === "king").map((p) => p.square)).toEqual([
        "1e1",
        "3e8",
      ]);
      expect(s.pieces.filter((p) => p.type === "queen").map((p) => p.square)).toEqual([
        "1d1",
        "3d8",
      ]);
      expect(inCheck(s)).toBe(false);
    });
    for (const f of FIXTURES)
      it(f.name, () => {
        const s = f.opening ? initialState(variant) : position(variant, f.pieces!);
        const before = JSON.stringify(s);
        if (f[variant]) {
          const next = applyMove(s, f.move);
          expect(next.turn).toBe("black");
          expect(next.ply).toBe(1);
          expect(next.pieces.some((p) => p.square === f.move.to && p.color === "white")).toBe(true);
        } else expect(() => applyMove(s, f.move)).toThrow("Illegal move");
        expect(JSON.stringify(s)).toBe(before);
      });
    it("blocks the intermediate three-axis bishop cube", () => {
      const s = position(variant, [piece("bishop", "1c1"), piece("pawn", "2d2", "black")]);
      expect(() => applyMove(s, { from: "1c1", to: "3e3" })).toThrow();
    });
    it("rejects exposing the king and capture of a king", () => {
      const s = position(variant, [
        piece("king", "1a1"),
        piece("rook", "1a3"),
        piece("rook", "1a8", "black"),
      ]);
      expect(() => applyMove(s, { from: "1a3", to: "1b3" })).toThrow();
      expect(() => applyMove(s, { from: "1a3", to: "3h8" })).toThrow();
    });
    it("requires explicit promotion and allows all four choices", () => {
      const s = position(variant, [piece("pawn", "2e7")]);
      expect(() => applyMove(s, { from: "2e7", to: "2e8" })).toThrow();
      for (const promotion of ["queen", "rook", "bishop", "knight"] as const) {
        const n = applyMove(s, { from: "2e7", to: "2e8", promotion });
        expect(n.pieces.find((p) => p.square === "2e8")).toMatchObject({
          type: promotion,
          moved: true,
        });
      }
    });
    it("supports black promotion and forward movement", () => {
      const s = position(variant, [piece("pawn", "2e2", "black")], "black");
      expect(
        applyMove(s, { from: "2e2", to: "2e1", promotion: "knight" }).pieces.find(
          (p) => p.square === "2e1",
        )?.type,
      ).toBe("knight");
      expect(() => applyMove(s, { from: "2e2", to: "2e3" })).toThrow();
    });
    it("en passant removes exactly the passed pawn and expires", () => {
      const s = position(variant, [piece("pawn", "2e5"), piece("pawn", "2d5", "black")]);
      s.enPassant = { target: "2d6", pawnId: "black-pawn-2d5" };
      const n = applyMove(s, { from: "2e5", to: "2d6" });
      expect(n.pieces.some((p) => p.square === "2d5")).toBe(false);
      expect(n.enPassant).toBeNull();
      const wait = applyMove(s, { from: "1h1", to: "1g1" });
      expect(wait.enPassant).toBeNull();
    });
    it("ordinary castling moves both original pieces", () => {
      const s = position(variant, [
        piece("king", "1e1", "white", false, "white-e"),
        piece("rook", "1h1", "white", false, "white-h"),
      ]);
      const n = applyMove(s, { from: "1e1", to: "1g1", castle: "king" });
      expect(n.pieces.find((p) => p.id === "white-h")).toMatchObject({
        square: "1f1",
        moved: true,
      });
      s.pieces.push(piece("rook", "1f8", "black"));
      expect(legalMoves(s, "1e1").some((m) => m.castle)).toBe(false);
    });
    it("a quiet pawn reaching an en passant target does not capture", () => {
      const s = position(variant, [piece("pawn", "1d6"), piece("pawn", "2d5", "black")]);
      s.enPassant = { target: "2d6", pawnId: "black-pawn-2d5" };
      if (variant === "strato") {
        expect(() => applyMove(s, { from: "1d6", to: "2d6" })).toThrow("Illegal move");
      } else {
        const n = applyMove(s, { from: "1d6", to: "2d6" });
        expect(n.pieces.some((p) => p.id === "black-pawn-2d5")).toBe(true);
      }
    });
    it("detects three-level mate and stalemate", () => {
      const mate = position(variant, [
        piece("king", "1a1"),
        ...["1a8", "1b8", "2a8", "2b8"].map((s) => piece("rook", s, "black")),
      ]);
      expect(status(mate).outcome).toEqual({ reason: "checkmate", winner: "black" });
      const stale = position(variant, [
        piece("king", "1a1"),
        piece("queen", "1b3", "black"),
        piece("queen", "2b3", "black"),
        piece("rook", "2a8", "black"),
      ]);
      expect(status(stale).outcome).toEqual({ reason: "stalemate", winner: null });
    });
    it("round trips and replays deterministically", () => {
      let s = initialState(variant);
      for (let i = 0; i < 12 && !s.outcome; i++) {
        const move = s.pieces.flatMap((p) => legalMoves(s, p.square))[0];
        const copy = parseState(JSON.parse(JSON.stringify(s)));
        expect(applyMove(copy, move)).toEqual(applyMove(s, move));
        s = applyMove(s, move);
      }
    });
    it("rejects malformed state, wrong turns and finished games", () => {
      const s = initialState(variant);
      expect(() => parseState({ ...s, rulesVersion: "future" })).toThrow();
      expect(() => parseState({ ...s, pieces: [...s.pieces, s.pieces[0]] })).toThrow();
      expect(() => applyMove(s, { from: "3e7", to: "2e6" })).toThrow();
      s.outcome = { reason: "agreement", winner: null };
      expect(legalMoves(s, "1e2")).toEqual([]);
    });
  });
describe("variant-specific exceptions", () => {
  it("Strato unmoved pieces block check and still exert planar attacks", () => {
    const s = position("strato", [
      piece("king", "1e1", "white", false, "white-e"),
      piece("rook", "1e8", "black"),
      piece("bishop", "1c1", "white", false),
    ]);
    expect(
      applyMove(s, { from: "1c1", to: "1e3" }).pieces.find((p) => p.square === "1e3"),
    ).toBeDefined();
    expect(() => applyMove(s, { from: "1e1", to: "1d1" })).toThrow();
    expect(attacked(s, "1d2", "white")).toBe(true);
  });
  it("Strato king gets a compound transfer only before moving", () => {
    const s = position("strato", [piece("king", "1e1", "white", false, "white-e")]);
    expect(legalMoves(s, "1e1").some((m) => m.to === "2f2")).toBe(true);
    s.pieces.find((p) => p.type === "king" && p.color === "white")!.moved = true;
    expect(legalMoves(s, "1e1").some((m) => m.to === "2f2")).toBe(false);
  });
  it("Strato compound transfers cannot jump a vertical blocker", () => {
    const s = position("strato", [piece("knight", "1b1"), piece("bishop", "2b1")]);
    expect(() => applyMove(s, { from: "1b1", to: "3c3" })).toThrow();
  });
  it("Chess³ knight ignores intermediate blockers", () => {
    const s = position("chess3", [piece("knight", "1b1"), piece("bishop", "2b1")]);
    expect(applyMove(s, { from: "1b1", to: "3c1" })).toBeDefined();
  });
  it("Chess³ pawn has eight capture geometries and consumes vertical double privilege", () => {
    const s = position("chess3", [piece("pawn", "2e4")]);
    const expected = ["2d5", "2f5", "1d5", "1e5", "1f5", "3d5", "3e5", "3f5"];
    for (const sq of expected) expect(attacked(s, sq, "white")).toBe(true);
    const start = position("chess3", [piece("pawn", "1e2", "white", false)]);
    const n = applyMove(start, { from: "1e2", to: "3e2" });
    n.turn = "white";
    expect(n.enPassant).toBeNull();
    expect(legalMoves(n, "3e2").some((m) => m.to === "1e2")).toBe(false);
  });
});
