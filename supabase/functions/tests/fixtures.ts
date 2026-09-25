import { applyMove, initialState, type Ruleset } from "../_shared/chess/engine.ts";
import { FIXTURES, position } from "../_shared/chess/fixtures.ts";
// Only served locally through the explicit test function configuration; never deploy this entrypoint.
Deno.serve(() => {
  if (Deno.env.get("CHESS_TEST_MODE") !== "true") return new Response("Not found", { status: 404 });
  let passed = 0;
  for (const ruleset of ["strato", "chess3"] as Ruleset[])
    for (const f of FIXTURES) {
      const state = f.opening ? initialState(ruleset) : position(ruleset, f.pieces!);
      let legal = true;
      try {
        applyMove(state, f.move);
      } catch {
        legal = false;
      }
      if (legal !== f[ruleset])
        return Response.json({ failed: `${ruleset}: ${f.name}` }, { status: 500 });
      passed++;
    }
  return Response.json({ passed });
});
