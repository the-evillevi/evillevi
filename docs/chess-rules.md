# gg³ — Rules

This is the application contract for **Strato Chess `strato-v1`** and **Chess³ `chess3-v1`**. Interpretations and example outcomes were reviewed and approved by the project owner before engine implementation on 24 September 2026. Saved games permanently retain their ruleset and rules version. Changes to these rules require a new version.

## Sources and notation

- [Triple S Games: Strato Chess demonstration](https://www.youtube.com/watch?v=B4ZybGdivzw), especially 0:28–0:49 (pawns), 1:59–2:18 (transfers), 2:19–2:45 (exceptions), and 3:05–3:12 (promotion).
- [Classic Games Company Chess³ description, reproduced by Chess Variant Pages](https://www.chessvariants.org/3d.dir/chess-3.html). Its promised diagrams are absent and its text contains OCR errors.

These explanations are written for this application. The conventions below are not claims about historical rules.

Coordinates consist of level, file and rank: `2e4` means middle level, file e, rank 4. Levels are 1 (bottom), 2 (middle), 3 (top). All boards have identical orientation, with a1 dark. White advances toward rank 8; Black toward rank 1. White moves first, irrespective of the creator's chosen color.

### Algebraic move notation

The interface uses algebraic notation with a Greek suffix on each destination: **α** is bottom (stored level 1), **β** is middle (2), and **γ** is top (3). Thus the stored coordinate `2e4` displays as `e4β`. Numeric coordinates in the technical examples below and in saved games remain unchanged. This is an application-specific 3D extension, not standard SAN or a claim of PGN compatibility.

| Notation | Meaning |
| --- | --- |
| `e3β` | Pawn to e3 on the middle level |
| `Nf3α` | Knight to f3 on the bottom level |
| `Bxe5γ+` | Bishop captures on e5, top level, giving check |
| `e8γ=Q` | Pawn promotes to queen on the top level |
| `exd8β=N` | Pawn from the e-file captures on d8, middle level, and promotes to knight |
| `O-Oβ` | Kingside castling ending on the middle level, including Strato's joint transfer |

Pieces use `K/Q/R/B/N`; pawns have no piece letter. Captures use `x`, including en passant. Pawn captures always include the origin file, even for Chess³ captures that keep the same file while changing levels. Promotion uses `=Q`, `=R`, `=B` or `=N` after the destination level. Castling uses `O-O` or `O-O-O` followed by the final level. Check appends `+`; checkmate appends `#`. Stalemate, timeout, resignation and agreed draws do not add a mate symbol.

When multiple pieces of the same type can legally reach the same full destination, add the first origin qualifier that distinguishes the move: file, rank, file+rank, level, file+level, rank+level, then file+rank+level. Pinned pieces and other illegal alternatives do not count. Examples include `Nbd2α`, `N1d2α`, `Nb1d2α` and `Nαc3β` (the knight from the bottom level). Pawn captures retain their mandatory file and try file+rank, file+level, then the full origin. Quiet pawns can also need qualifiers in 3D: `αe4β` distinguishes a pawn arriving from the bottom level from `γe4β` arriving from the top.

The formatter uses the position before each move and the resulting position. History is replayed under the saved ruleset to recover this context, so older games receive the same display without a database migration or a movement-rules version change. Promotion destinations show `=…` until a piece is chosen; the confirmation button then shows the complete notation for that choice.

```text
3  Black: a8 R N B Q K B N R h8; pawns a7–h7
2  Empty
1  White: a1 R N B Q K B N R h1; pawns a2–h2

Vertical rook line: 1a4 → 2a4 → 3a4
Spatial bishop line: 1c1 → 2d2 → 3e3
```

Each side has the ordinary 16 pieces. The first diagram describes the complete opening for both versions. Placement on separate outer levels is shown by the Strato source; using this precise arrangement for Chess³ is our convention because its setup diagram is missing.

## Strato v1

Pieces retain ordinary same-level chess movement and capture. Each piece must change level on its first move, except when castling or making a same-level capture/block that resolves check. A quiet first king move that merely escapes on the same level is not an exception.

**No move changing levels can capture.** Every traversed transfer square and the destination must be empty. On one level, ordinary blockers and knight jumping apply.

| Piece  | Movement when changing levels                                                                                                                       |
| ------ | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| Pawn   | Ordinary forward advance plus exactly one level up or down. First forward advance may be two ranks, with a clear path. No standalone vertical move. |
| Knight | Ordinary planar L move plus one or two levels up or down. No standalone vertical move.                                                              |
| Bishop | Change file and rank diagonally by one step per level, in one straight direction. No bending or extra planar continuation.                          |
| Rook   | Same file/rank, one or two levels, with a clear intermediate square.                                                                                |
| Queen  | The rook's or bishop's transfer geometry.                                                                                                           |
| King   | Same file/rank, one level. Its first move may also change file/rank by one ordinary king step.                                                      |

For compound pawn, knight and first king moves, our convention resolves the vertical segment first, then the planar segment. The vertical path must be empty; the final square must be empty; forward pawn steps must also be clear. Knights jump over planar blockers. Only the final position determines check for ordinary moves; castling has the extra transit checks below.

Attacks are ordinary same-level chess attacks, independent of movement flags and whether the attacking side is in check. This is an explicit convention avoiding circular attack/legality definitions. Interlevel transfers do not attack; an enemy king on another level is not adjacent for Strato check purposes. Kings cannot be captured, and no move may leave one's own king attacked.

**Castling:** apply ordinary castling on the original level, then optionally transfer both pieces to their corresponding castled squares one level above/below. Both pieces must be original and unmoved. Squares between king and rook must be empty. The king's starting, transit and castled square on the original level must be safe; both transfer destinations must be empty and the final king square safe. This sequencing is our application convention. Moving either piece, including a transfer, permanently removes its associated castling right.

## Chess³ v1

There is no forced first-level-change rule. Quiet moves and captures use the same geometry except for pawns. Cross-level captures are permitted. Sliding pieces stop at the first occupied square; they may capture an enemy there but cannot pass through it. Knights jump.

Use displacements `(file, rank, level)`:

| Piece         | Geometry                                                                                                                                                                              |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Rook          | A nonzero displacement along exactly one axis.                                                                                                                                        |
| Bishop        | Same-level diagonals, or equal nonzero absolute displacement on all three axes.                                                                                                       |
| Queen         | Equal nonzero displacements on any selected axes: rook lines, planar diagonals, level/file or level/rank diagonals, and three-axis diagonals.                                         |
| Knight        | Signed permutations of `(2,1,0)`.                                                                                                                                                     |
| King          | Any adjacent cube: each displacement at most one, at least one nonzero.                                                                                                               |
| Pawn, quiet   | One forward rank OR one level up/down, keeping other coordinates fixed. On its first move, two along either axis are allowed through an empty intermediate square.                    |
| Pawn, capture | One forward rank plus one file on the same level; on an adjacent level, one forward rank plus file displacement −1, 0 or +1. Eight possible destinations before clipping board edges. |

The pawn's quiet move is never a combination of forward and vertical motion. A vertical pawn move consumes its first-move privilege, even if it later returns. The eight capture destinations are an application interpretation of the description's forward diagonals in the absence of its diagrams.

Use ordinary castling on the starting level and original rank only; no interlevel castling. Both original pieces must be unmoved, the path clear, and the king's starting/transit/destination squares unattacked.

## Shared special rules and endings

- On reaching rank 8 (White) or 1 (Black) on any level, a pawn must promote immediately to queen, rook, bishop or knight. Promoted pieces count as moved and cannot gain castling privileges.
- En passant is allowed only immediately after a same-level two-rank pawn advance. The capturing pawn remains on that level, moves one rank diagonally forward into the passed square, and removes the adjacent pawn. A transfer or vertical double move never creates en passant rights. Strato's first-move restriction still applies to the capturing pawn.
- Checkmate: the side to move is attacked and has no legal move. Stalemate: it has no legal move and is not attacked. Test all three levels for escapes.
- Players can resign or mutually agree a draw. A draw offer expires when either side makes a move; only the other player can accept it. Finished games cannot change.
- Repetition, move-count and material-based draw adjudication are deliberately absent from v1. No takebacks, spectators, matchmaking or account recovery. Match clocks are a separate contract described below.

## Resolved ambiguities

| Issue                                            | Adopted interpretation                                                                                                     |
| ------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------- |
| Strato video vs description, pawn first transfer | The spoken video permits only one level even with a two-rank advance. Follow the video, not its contradictory description. |
| Compound transfer path                           | Vertical first, then planar; no transfer capture or occupied intermediate transfer square.                                 |
| Pawn/knight pure Strato transfer                 | Not permitted; these transfer rules supplement their ordinary planar movement.                                             |
| First king move during check                     | Capture a checker is allowed; a quiet same-level escape is not the stated capture/block exception.                         |
| First-move flags in attack maps                  | Ignore them for geometric threats; enforce them in legal moves.                                                            |
| Strato castling sequence                         | Ordinary castle first, optional joint transfer second; validate both stages.                                               |
| Chess³ setup illustrations                       | Use White bottom/Black top ordinary formations shown above.                                                                |
| Chess³ pawn's contradictory “and”                | Quiet forward OR vertical motion, never both.                                                                              |
| Chess³ pawn capture diagram missing              | Eight forward capture destinations as defined above.                                                                       |
| Chess³ promotion and unmentioned special moves   | Q/R/B/N promotion on any far rank; ordinary same-level castling and the restricted en passant above.                       |
| OCR coordinates containing P or ambiguous glyphs | Never admit files beyond a–h; use the specified geometry, not erroneous coordinate spellings.                              |
| Unspecified draw rules                           | Only stalemate and mutual agreement; do not infer orthodox repetition/material rules.                                      |

## Approved fixture examples

Full executable positions are in the engine fixture suite. Opening fixtures use the complete formation above. For isolated geometric fixtures, use White king `1h1`, Black king `3h8`, White to move, all listed pieces marked moved and all unlisted squares empty unless the fixture explicitly changes them. Castling fixtures instead place the White king on `1e1` and original rook on `1h1`, both unmoved.

| Action                                      | Strato     | Chess³           |
| ------------------------------------------- | ---------- | ---------------- |
| Opening pawn `1e2 → 1e4`                    | Illegal    | Legal            |
| Opening pawn `1e2 → 2e3`                    | Legal      | Illegal          |
| Opening pawn `1e2 → 3e2`                    | Illegal    | Legal            |
| Rook `1a4 × 3a4`, enemy pawn at destination | Illegal    | Legal            |
| Rook `1a4 → 3a4`, friendly pawn at `2a4`    | Illegal    | Illegal          |
| Knight `1b1 → 2c3`                          | Legal      | Illegal          |
| Knight `1b1 → 2b3`                          | Illegal    | Legal            |
| Bishop `1c1 → 3e3`                          | Quiet only | Quiet or capture |
| Bishop `1c1 → 2c2`                          | Illegal    | Illegal          |
| Queen `1d4 → 2d5`                           | Illegal    | Legal            |
| Pawn `1e4 × 2e5`, enemy pawn at destination | Illegal    | Legal            |
| Safe castle `1e1/1h1 → 2g1/2f1`             | Legal      | Illegal          |

### Playing online

The creator chooses White, Random or Black. Random is resolved once, equally, by the server and never rerolled. The friend receives the opposite side. White moves first. Anyone holding an unfilled private invite can take the remaining seat; only seated players can read the game. Refresh preserves an anonymous session, but deleting browser storage loses that identity and cannot reclaim a seat in v1.

### Lobby, clocks and match results

The lobby lists games belonging to this browser identity under Your turn, Opponent’s turn, Waiting to start and Finished. Move numbers count pairs of plies, rounded up; a new game has zero moves. Guest names are trimmed plain text, 1–32 characters, and may be shared by different players. Each match retains the names chosen when its seats were filled. The browser remembers your latest name for the next invitation.

Rapid presets are 10 min, 10+5, 15+10, 20 min, 30 min (the default), and 60 min. Custom clocks allow 1–120 initial minutes and 0–60 increment seconds. `10+5` means ten minutes per player plus five seconds after each accepted move. Both players must explicitly click **Ready** before White’s rapid/custom clock starts. Repeating Ready does not restart either clock. Correspondence allows 1, 2, 3, 5, 7 or 14 days **per move**, starts when the friend joins, and resets the full allowance for each new turn without banking unused time.

Clocks keep running during disconnects, closed tabs and draw offers. Server time determines whether a move is on time: a move processed at or after its deadline loses to timeout, regardless of material. Timeout is a match result and does not alter the saved movement-engine position. Existing matches and local practice remain untimed. Timing uses the independent `clock-v1` contract; `strato-v1` and `chess3-v1` movement semantics are unchanged.

The board starts in 3D and remembers your renderer preference. If WebGL fails it automatically opens playable 2D. Both views retain a selected piece when switching levels or renderers. Dots indicate quiet moves, rings indicate captures, a source border remains while a separate destination border marks the pending move, and a checked king is outlined. Promotion requires choosing Q/R/B/N before confirming. Arrow keys navigate the board, Enter/Space selects, and Escape cancels; in 3D All levels view, Page Up/Down moves the keyboard cursor between levels. Reset restores the initial orientation and framing without changing the game.
