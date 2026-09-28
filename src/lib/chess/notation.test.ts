import { describe, expect, it } from "vitest";
import { applyMove, initialState, legalMoves } from "./engine.ts";
import { piece, position } from "./fixtures.ts";
import { describeSquare, formatHistory, formatMove, formatSquare } from "./notation.ts";
import type { Move, Ruleset } from "./types.ts";

it("formats coordinates without changing their stored representation", () => {
  expect(["1a1", "2e4", "3h8"].map(formatSquare)).toEqual(["a1α", "e4β", "h8γ"]);
  expect(describeSquare("2e4")).toBe("e4, Beta, middle level");
  expect(() => formatSquare("4e4")).toThrow("Invalid square");
});

for (const ruleset of ["strato", "chess3"] as Ruleset[])
  describe(ruleset, () => {
    it("replays existing coordinate histories without mutating moves or positions", () => {
      const start = initialState(ruleset);
      const moves: Move[] =
        ruleset === "strato"
          ? [
              { from: "1e2", to: "2e3" },
              { from: "3e7", to: "2e6" },
            ]
          : [
              { from: "1e2", to: "1e4" },
              { from: "3e7", to: "3e5" },
            ];
      const before = JSON.stringify({ start, moves });
      expect(formatHistory(start, moves)).toEqual(
        ruleset === "strato" ? ["e3β", "e6β"] : ["e4α", "e5γ"],
      );
      expect(JSON.stringify({ start, moves })).toBe(before);
    });

    it("marks captures and en passant using the actual resulting position", () => {
      const capture = position(ruleset, [piece("bishop", "1c1"), piece("pawn", "1g5", "black")]);
      expect(formatMove(capture, { from: "1c1", to: "1g5" })).toBe("Bxg5α");
      const ep = position(ruleset, [piece("pawn", "2e5"), piece("pawn", "2d5", "black")]);
      ep.enPassant = { target: "2d6", pawnId: "black-pawn-2d5" };
      expect(formatMove(ep, { from: "2e5", to: "2d6" })).toBe("exd6β");
    });

    it.each([
      ["queen", "Q"],
      ["rook", "R"],
      ["bishop", "B"],
      ["knight", "N"],
    ] as const)("formats %s promotion", (promotion, letter) => {
      const state = position(ruleset, [piece("pawn", "2e7"), piece("rook", "2d8", "black")]);
      expect(formatMove(state, { from: "2e7", to: "2e8", promotion })).toBe(`e8β=${letter}`);
      expect(formatMove(state, { from: "2e7", to: "2d8", promotion })).toBe(`exd8β=${letter}`);
      const black = position(ruleset, [piece("pawn", "2e2", "black")], "black");
      expect(formatMove(black, { from: "2e2", to: "2e1", promotion })).toBe(`e1β=${letter}`);
    });

    it.each(["king", "queen"] as const)("formats %s-side castling", (castle) => {
      const rookFile = castle === "king" ? "h" : "a";
      const state = position(ruleset, [
        piece("king", "1e1", "white", false, "white-e"),
        piece("rook", `1${rookFile}1`, "white", false, `white-${rookFile}`),
      ]);
      expect(
        formatMove(state, { from: "1e1", to: castle === "king" ? "1g1" : "1c1", castle }),
      ).toBe(castle === "king" ? "O-Oα" : "O-O-Oα");
    });

    it("uses file, rank, or both to distinguish legal identical pieces", () => {
      for (const [squares, expected] of [
        [["1b1", "1f1"], "Nbd2α"],
        [["1b1", "1b3"], "N1d2α"],
        [["1b1", "1b3", "1f1"], "Nb1d2α"],
      ] as const) {
        expect(
          formatMove(
            position(
              ruleset,
              squares.map((s) => piece("knight", s)),
            ),
            { from: "1b1", to: "1d2" },
          ),
        ).toBe(expected);
      }
    });

    it("adds source levels when pieces share planar coordinates", () => {
      const to = ruleset === "strato" ? "2c3" : "2b3";
      const state = position(ruleset, [piece("knight", "1b1"), piece("knight", "3b1")]);
      expect(formatMove(state, { from: "1b1", to })).toBe(`Nα${formatSquare(to)}`);
      expect(formatMove(state, { from: "3b1", to })).toBe(`Nγ${formatSquare(to)}`);
      state.pieces.push(piece("knight", "1b5"));
      expect(formatMove(state, { from: "1b1", to })).toBe(`N1α${formatSquare(to)}`);
    });

    it("can require file and level, or all three origin coordinates", () => {
      const role = ruleset === "strato" ? "knight" : "bishop";
      const to = ruleset === "strato" ? "2d2" : "2c2";
      const other = ruleset === "strato" ? "1f1" : "1d1";
      const letter = ruleset === "strato" ? "N" : "B";
      const state = position(
        ruleset,
        ["1b1", "3b1", other].map((s) => piece(role, s)),
      );
      expect(formatMove(state, { from: "1b1", to })).toBe(`${letter}bα${formatSquare(to)}`);
      state.pieces.push(piece(role, "1b3"));
      expect(formatMove(state, { from: "1b1", to })).toBe(`${letter}b1α${formatSquare(to)}`);
    });

    it("excludes pinned pieces from disambiguation", () => {
      const state = position(ruleset, [
        piece("king", "1b1"),
        piece("knight", "1b3"),
        piece("rook", "1b8", "black"),
        piece("knight", "1f3"),
      ]);
      expect(formatMove(state, { from: "1f3", to: "1d2" })).toBe("Nd2α");
    });

    it("marks check and mate, but never stalemate as mate", () => {
      const check = position(ruleset, [piece("rook", "3a4")]);
      expect(formatMove(check, { from: "3a4", to: "3h4" })).toBe("Rh4γ+");
      const state = position(
        ruleset,
        [
          piece("king", "1a1"),
          piece("queen", "1b3", "black"),
          piece("queen", "2b3", "black"),
          piece("rook", "2a8", "black"),
          piece("rook", "1c2", "black"),
        ],
        "black",
      );
      expect(formatMove(state, { from: "1c2", to: "1a2" })).toBe("Ra2α#");
      expect(applyMove(state, { from: "1c2", to: "2c2" }).outcome?.reason).toBe("stalemate");
      expect(formatMove(state, { from: "1c2", to: "2c2" })).toBe("Rc2β");
    });

    it("places check after the promotion and evaluates the chosen piece", () => {
      const state = position(ruleset, [piece("pawn", "3e7")]);
      expect(formatMove(state, { from: "3e7", to: "3e8", promotion: "queen" })).toBe("e8γ=Q+");
      expect(formatMove(state, { from: "3e7", to: "3e8", promotion: "knight" })).toBe("e8γ=N");
    });

    it("rejects illegal moves instead of producing misleading notation", () => {
      const state = initialState(ruleset);
      expect(() => formatMove(state, { from: "1e2", to: "3h8" })).toThrow("Illegal move");
      const promotion = position(ruleset, [piece("pawn", "2e7")]);
      expect(() => formatMove(promotion, { from: "2e7", to: "2e8" })).toThrow("Illegal move");
    });

    it("gives every legal move a unique label through a replay", () => {
      let state = initialState(ruleset);
      for (let ply = 0; ply < 8; ply++) {
        const moves = state.pieces.flatMap((p) => legalMoves(state, p.square));
        const labels = moves.map((move) => formatMove(state, move));
        expect(new Set(labels).size).toBe(moves.length);
        state = applyMove(state, moves[(ply * 7) % moves.length]);
      }
    });
  });

it("uses the final level for Strato's transferred castling", () => {
  const state = position("strato", [
    piece("king", "1e1", "white", false, "white-e"),
    piece("rook", "1h1", "white", false, "white-h"),
  ]);
  expect(formatMove(state, { from: "1e1", to: "2g1", castle: "king" })).toBe("O-Oβ");
});

it("distinguishes Chess³ quiet pawns and same-file cross-level captures", () => {
  const quiet = position("chess3", [piece("pawn", "1e4"), piece("pawn", "3e4")]);
  expect(formatMove(quiet, { from: "1e4", to: "2e4" })).toBe("αe4β");
  expect(formatMove(quiet, { from: "3e4", to: "2e4" })).toBe("γe4β");
  const capture = position("chess3", [
    piece("pawn", "1e4"),
    piece("pawn", "3e4"),
    piece("knight", "2e5", "black"),
  ]);
  expect(formatMove(capture, { from: "1e4", to: "2e5" })).toBe("eαxe5β");
});
