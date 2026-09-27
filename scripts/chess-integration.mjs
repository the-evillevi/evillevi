import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";
import { localSupabase } from "./local-supabase.mjs";
import { readJson, waitForFixtures } from "./chess-test-http.mjs";
import { RAPID, DAYS, rapid } from "../src/lib/chess/timing.ts";
import { applyMove, initialState, legalMoves } from "../src/lib/chess/engine.ts";
const cfg = localSupabase(),
  url = cfg.API_URL,
  key = cfg.PUBLISHABLE_KEY ?? cfg.ANON_KEY;
const make = () =>
  createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
const clients = [];
const identities = [];
for (let i = 0; i < 3; i++) {
  const client = make();
  const { data, error } = await client.auth.signInAnonymously();
  assert.ifError(error);
  clients.push(client);
  identities.push(data.user.id);
}
async function call(index, name, body, signal = AbortSignal.timeout(15_000)) {
  const {
    data: { session },
  } = await clients[index].auth.getSession();
  const response = await fetch(`${url}/functions/v1/${name}`, {
    signal,
    method: "POST",
    headers: {
      apikey: key,
      Authorization: `Bearer ${session.access_token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      ...(name === "create-game"
        ? { guestName: " Player One ", timeControl: { version: "clock-v1", mode: "untimed" } }
        : name === "join-game"
          ? { guestName: "Player Two" }
          : {}),
      ...body,
    }),
  });
  return readJson(response, name);
}
async function snapshot(index, id) {
  const { data, error } = await clients[index].rpc("chess_snapshot", { p_game_id: id });
  assert.ifError(error);
  return data;
}
async function create(ruleset, colorPreference = "white") {
  const requestId = crypto.randomUUID();
  const result = await call(0, "create-game", { requestId, ruleset, colorPreference });
  assert.equal(result.status, 200, JSON.stringify(result));
  return { id: requestId, game: result.data.game };
}

await waitForFixtures((signal) => call(0, "chess-fixtures", {}, signal));
console.log("24 approved fixtures pass inside the actual Edge runtime.");
const noAuth = await fetch(`${url}/functions/v1/create-game`, {
  method: "POST",
  headers: { apikey: key, "Content-Type": "application/json" },
  body: "{}",
});
assert.equal(noAuth.status, 401);
for (const ruleset of ["strato", "chess3"]) {
  for (const preference of ["white", "black", "random"]) {
    const { id, game } = await create(ruleset, preference);
    assert.equal(game.turn, "white");
    assert.equal(game.rules_version, `${ruleset}-v1`);
    if (preference !== "random") assert.equal(game.creator_color, preference);
    const retry = await call(0, "create-game", {
      requestId: id,
      ruleset,
      colorPreference: preference,
    });
    assert.equal(retry.status, 200);
    assert.equal(retry.data.game.creator_color, game.creator_color);
    assert.equal(await snapshot(2, id), null, "Outsider must not read a waiting game");
    assert.equal(
      (await call(0, "join-game", { gameId: id })).status,
      403,
      "Creator cannot occupy both seats",
    );
    const joins = await Promise.all([
      call(1, "join-game", { gameId: id }),
      call(2, "join-game", { gameId: id }),
    ]);
    assert.equal(
      joins.filter((r) => r.status === 200).length,
      1,
      "Exactly one concurrent join succeeds",
    );
    const opponent = joins[0].status === 200 ? 1 : 2,
      outsider = opponent === 1 ? 2 : 1;
    const joined = (await snapshot(0, id)).game;
    assert.equal(
      joined.white_id,
      game.creator_color === "white" ? identities[0] : identities[opponent],
    );
    assert.equal(
      joined.black_id,
      game.creator_color === "black" ? identities[0] : identities[opponent],
    );
    assert.equal(await snapshot(outsider, id), null);
    const initial = initialState(ruleset),
      white = game.creator_color === "white" ? 0 : opponent,
      black = white === 0 ? opponent : 0;
    const moves = initial.pieces.flatMap((p) => legalMoves(initial, p.square));
    assert.equal(
      (
        await call(black, "submit-move", {
          gameId: id,
          expectedVersion: joined.version,
          move: moves[0],
        })
      ).status,
      403,
    );
    assert.equal(
      (
        await call(outsider, "submit-move", {
          gameId: id,
          expectedVersion: joined.version,
          move: moves[0],
        })
      ).status,
      404,
    );
    assert.equal(
      (
        await call(white, "submit-move", {
          gameId: id,
          expectedVersion: joined.version,
          move: { from: "1e1", to: "3h8" },
        })
      ).status,
      422,
    );
    assert.equal(
      (
        await call(white, "submit-move", {
          gameId: id,
          expectedVersion: joined.version,
          move: moves[0],
          actor: identities[black],
        })
      ).status,
      400,
    );
    const concurrent = await Promise.all(
      moves
        .slice(0, 2)
        .map((move) =>
          call(white, "submit-move", { gameId: id, expectedVersion: joined.version, move }),
        ),
    );
    assert.equal(concurrent.filter((r) => r.status === 200).length, 1, JSON.stringify(concurrent));
    assert.equal(concurrent.filter((r) => r.status === 409).length, 1, JSON.stringify(concurrent));
    const after = await snapshot(0, id);
    assert.equal(after.moves.length, 1);
    assert.equal(after.game.version, joined.version + 1);
    assert.deepEqual(after.game.position, applyMove(initial, after.moves[0].move));
    assert.equal(after.moves[0].state_hash.length, 64);
    const direct = await clients[white]
      .from("chess_games")
      .update({ turn: "white", position: initial })
      .eq("id", id);
    assert.ok(direct.error, "Client board writes must be denied");
    const append = await clients[white].from("chess_moves").insert({
      game_id: id,
      sequence: 2,
      game_version: 3,
      actor: identities[white],
      move: moves[0],
      state_hash: "fake",
    });
    assert.ok(append.error);
    const rpc = await clients[white].rpc("chess_commit", {
      p_id: id,
      p_actor: identities[white],
      p_expected: after.game.version,
      p_action: "move",
      p_position: initial,
      p_move: moves[0],
      p_hash: "fake",
    });
    assert.ok(rpc.error);
    const offered = await call(white, "game-action", {
      gameId: id,
      expectedVersion: after.game.version,
      action: "offer-draw",
    });
    assert.equal(offered.status, 200);
    assert.equal(
      (
        await call(white, "game-action", {
          gameId: id,
          expectedVersion: offered.data.game.version,
          action: "accept-draw",
        })
      ).status,
      409,
    );
    const accepted = await call(black, "game-action", {
      gameId: id,
      expectedVersion: offered.data.game.version,
      action: "accept-draw",
    });
    assert.equal(accepted.status, 200);
    assert.equal(accepted.data.game.status, "finished");
    assert.equal(
      (
        await call(white, "game-action", {
          gameId: id,
          expectedVersion: accepted.data.game.version,
          action: "resign",
        })
      ).status,
      409,
    );
    console.log(
      `${ruleset}/${preference}: colors, idempotency, joins, RLS, move race, rules and agreed draw passed.`,
    );
  }
  const { id } = await create(ruleset);
  await call(1, "join-game", { gameId: id });
  const before = await snapshot(0, id),
    move = before.game.position.pieces.flatMap((p) =>
      legalMoves(before.game.position, p.square),
    )[0];
  const race = await Promise.all([
    call(0, "submit-move", { gameId: id, expectedVersion: before.game.version, move }),
    call(1, "game-action", { gameId: id, expectedVersion: before.game.version, action: "resign" }),
  ]);
  assert.equal(race.filter((r) => r.status === 200).length, 1);
  assert.equal(race.filter((r) => r.status === 409).length, 1);
  const after = await snapshot(0, id);
  if (after.game.status !== "finished")
    assert.equal(
      (
        await call(1, "game-action", {
          gameId: id,
          expectedVersion: after.game.version,
          action: "resign",
        })
      ).status,
      200,
    );
  assert.deepEqual((await snapshot(1, id)).game.result, { reason: "resignation", winner: "white" });
}
console.log(
  "All local Supabase integration checks passed. Test games are retained for inspection.",
);

// All administrative fixture writes are guarded by localSupabase's exact loopback URL.
const admin = createClient(url, cfg.SERVICE_ROLE_KEY ?? cfg.SECRET_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});
async function rpc(name, args) {
  const result = await admin.rpc(name, args);
  assert.ifError(result.error);
  return result.data;
}
async function patch(id, values) {
  const result = await admin.from("chess_games").update(values).eq("id", id);
  assert.ifError(result.error);
}
async function timed(ruleset, control) {
  const id = crypto.randomUUID();
  const created = await call(0, "create-game", {
    requestId: id,
    ruleset,
    colorPreference: "white",
    guestName: "  Ada  ",
    timeControl: control,
  });
  assert.equal(created.status, 200, JSON.stringify(created));
  assert.equal(created.data.game.white_name, "Ada");
  const invalidJoin = await call(1, "join-game", { gameId: id, guestName: "   " });
  assert.equal(invalidJoin.status, 400);
  const differentTime = await call(0, "create-game", {
    requestId: id,
    ruleset,
    colorPreference: "white",
    guestName: "Ada",
    timeControl:
      control.mode === "rapid"
        ? { version: "clock-v1", mode: "correspondence", days: 1 }
        : rapid(30),
  });
  assert.equal(differentTime.status, 409, "A retry cannot change its original time control");
  const preview = await make().rpc("chess_invite", { p_game_id: id });
  assert.ifError(preview.error);
  assert.deepEqual(Object.keys(preview.data).sort(), [
    "rules_version",
    "ruleset",
    "side",
    "time_control",
  ]);
  assert.deepEqual(preview.data.time_control, control);
  const retry = await call(0, "create-game", {
    requestId: id,
    ruleset,
    colorPreference: "white",
    guestName: "Ada",
    timeControl: control,
  });
  assert.equal(retry.status, 200);
  const changed = await call(0, "create-game", {
    requestId: id,
    ruleset,
    colorPreference: "white",
    guestName: "Changed",
    timeControl: control,
  });
  assert.equal(changed.status, 409);
  assert.equal((await call(1, "join-game", { gameId: id, guestName: "Ada" })).status, 200); // Duplicate display names are allowed.
  assert.equal((await make().rpc("chess_invite", { p_game_id: id })).data, null);
  return id;
}
for (const name of ["", "  ", "x".repeat(33), "bad\nname", null]) {
  assert.equal(
    (
      await call(0, "create-game", {
        requestId: crypto.randomUUID(),
        ruleset: "strato",
        colorPreference: "white",
        guestName: name,
        timeControl: rapid(30),
      })
    ).status,
    400,
  );
}
for (const control of [
  rapid(0),
  rapid(121),
  rapid(1, -1),
  rapid(1, 61),
  rapid(1.1),
  { version: "clock-v2", mode: "untimed" },
  { version: "clock-v1", mode: "correspondence", days: 4 },
]) {
  assert.equal(
    (
      await call(0, "create-game", {
        requestId: crypto.randomUUID(),
        ruleset: "strato",
        colorPreference: "white",
        timeControl: control,
      })
    ).status,
    400,
  );
}
for (const variant of ["strato", "chess3"]) {
  for (const control of [
    ...RAPID.map(([m, i]) => rapid(m, i)),
    rapid(1, 0),
    rapid(120, 60),
    ...DAYS.map((days) => ({ version: "clock-v1", mode: "correspondence", days })),
  ]) {
    const id = await timed(variant, control);
    let before = await snapshot(0, id);
    const move = before.game.position.pieces.flatMap((p) =>
      legalMoves(before.game.position, p.square),
    )[0];
    if (control.mode === "rapid") {
      assert.equal(before.game.started_at, null);
      assert.equal(before.game.deadline, null);
      assert.equal(
        (await call(0, "submit-move", { gameId: id, expectedVersion: before.game.version, move }))
          .status,
        409,
      );
      const readies = await Promise.all(
        [0, 1, 0, 1].map((i) =>
          call(i, "game-action", {
            gameId: id,
            expectedVersion: before.game.version,
            action: "ready",
          }),
        ),
      );
      assert.ok(
        readies.every((r) => r.status === 200),
        JSON.stringify(readies),
      );
      const started = await snapshot(0, id);
      assert.equal(started.game.version, before.game.version + 2);
      assert.equal(started.game.white_ready, true);
      assert.equal(started.game.black_ready, true);
      assert.ok(started.game.deadline);
      assert.ok(started.game.started_at);
      await call(0, "game-action", { gameId: id, expectedVersion: 0, action: "ready" });
      assert.equal(
        (await snapshot(0, id)).game.deadline,
        started.game.deadline,
        "Repeated readiness never restarts clock",
      );
    } else assert.ok(before.game.deadline, "Correspondence starts at join");
    // Simulate elapsed time without slowing the suite; timing settings remain immutable.
    await patch(id, {
      deadline: new Date(Date.now() + 20000).toISOString(),
      turn_started_at: new Date(Date.now() - 10000).toISOString(),
    });
    before = await snapshot(0, id);
    const result = await call(0, "submit-move", {
      gameId: id,
      expectedVersion: before.game.version,
      move,
    });
    assert.equal(result.status, 200, JSON.stringify(result));
    const after = await snapshot(1, id);
    assert.equal(after.game.turn, "black");
    assert.equal(after.moves.length, 1);
    if (control.mode === "rapid") {
      assert.ok(after.game.white_ms <= 20000 + control.incrementSeconds * 1000);
      assert.ok(after.game.white_ms > 10000 + control.incrementSeconds * 1000);
      assert.equal(after.game.black_ms, control.initialSeconds * 1000);
      assert.ok(
        Math.abs(
          Date.parse(after.game.deadline) -
            Date.parse(after.game.turn_started_at) -
            after.game.black_ms,
        ) < 2,
      );
    } else
      assert.equal(
        Date.parse(after.game.deadline) - Date.parse(after.game.turn_started_at),
        control.days * 86400000,
      );
    const offer = await call(1, "game-action", {
      gameId: id,
      expectedVersion: after.game.version,
      action: "offer-draw",
    });
    assert.equal(offer.status, 200);
    assert.equal(offer.data.game.deadline, after.game.deadline, "Draw offers do not pause clocks");
    const outsider = (await clients[2].rpc("chess_lobby")).data;
    assert.ok(!outsider.games.some((g) => g.id === id));
    const lobby = (await clients[0].rpc("chess_lobby")).data;
    const summary = lobby.games.find((g) => g.id === id);
    assert.equal(summary.ply, 1);
    assert.equal(summary.side, "white");
    assert.ok(!("position" in summary));
    assert.ok(!("white_id" in summary));
    // End each test fixture to keep the active deadline queue bounded.
    await call(0, "game-action", {
      gameId: id,
      expectedVersion: offer.data.game.version,
      action: "resign",
    });
  }
  console.log(
    `${variant}: every preset, custom boundaries, names, previews, readiness, increments and correspondence resets passed.`,
  );
  // Exercise the DB transaction itself: expiration must commit despite stale expected version.
  const id = await timed(variant, rapid(1, 5));
  const before = await snapshot(0, id),
    move = before.game.position.pieces.flatMap((p) =>
      legalMoves(before.game.position, p.square),
    )[0];
  const next = applyMove(before.game.position, move);
  await patch(id, {
    started_at: new Date().toISOString(),
    deadline: new Date(Date.now() - 1).toISOString(),
  });
  const race = await Promise.all([
    rpc("chess_commit", {
      p_id: id,
      p_actor: identities[0],
      p_expected: before.game.version,
      p_action: "move",
      p_position: next,
      p_move: move,
      p_hash: "timeout-must-not-append",
    }),
    rpc("chess_expiry_sweep", {}),
  ]);
  assert.equal(race[0].result.reason, "timeout");
  const after = await snapshot(0, id);
  assert.equal(after.moves.length, 0);
  assert.deepEqual(after.game.position, before.game.position);
  assert.deepEqual(after.game.result, { reason: "timeout", winner: "black" });
  assert.equal(after.game.version, before.game.version + 1);
  assert.equal(
    (await call(0, "submit-move", { gameId: id, expectedVersion: after.game.version, move }))
      .status,
    409,
  );
  // Closed tabs: the scheduled database job must resolve without a snapshot or action.
  const unattended = await timed(variant, { version: "clock-v1", mode: "correspondence", days: 1 });
  await patch(unattended, { deadline: new Date(Date.now() - 1).toISOString() });
  let ended = false;
  for (let attempt = 0; attempt < 12; attempt++) {
    const row = await admin
      .from("chess_games")
      .select("status,result")
      .eq("id", unattended)
      .single();
    assert.ifError(row.error);
    if (row.data.status === "finished") {
      ended = true;
      assert.equal(row.data.result.reason, "timeout");
      break;
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  assert.ok(ended, "Five-second Cron must finish unattended matches");
  // Snapshot resolution is participant-only, and uses authoritative time after lock acquisition.
  const expiry = await timed(variant, rapid(30));
  await patch(expiry, {
    deadline: new Date(Date.now() - 1).toISOString(),
    started_at: new Date().toISOString(),
  });
  assert.equal(await snapshot(2, expiry), null);
  assert.equal((await snapshot(0, expiry)).game.result.reason, "timeout");
}
for (const ruleset of ["strato", "chess3"]) {
  const id = crypto.randomUUID(),
    state = initialState(ruleset),
    first = state.pieces.flatMap((p) => legalMoves(state, p.square))[0];
  const inserted = await admin.from("chess_games").insert({
    id,
    creator_id: identities[0],
    creator_color: "white",
    color_preference: "white",
    white_id: identities[0],
    black_id: identities[1],
    ruleset,
    rules_version: `${ruleset}-v1`,
    position: state,
    status: "active",
  });
  assert.ifError(inserted.error);
  const legacy = await snapshot(0, id);
  assert.equal(legacy.game.time_control.mode, "untimed");
  assert.equal(legacy.game.white_name, "Guest White");
  assert.equal(legacy.game.black_name, "Guest Black");
  assert.deepEqual(legacy.game.position, state);
  assert.equal(
    (
      await call(0, "submit-move", {
        gameId: id,
        expectedVersion: legacy.game.version,
        move: first,
      })
    ).status,
    200,
  );
  assert.equal((await snapshot(0, id)).game.deadline, null);
}
for (const name of ["chess_expire", "chess_expiry_sweep", "chess_commit_position"]) {
  const args =
    name === "chess_expire"
      ? { p_id: crypto.randomUUID() }
      : name === "chess_commit_position"
        ? {
            p_id: crypto.randomUUID(),
            p_actor: identities[0],
            p_expected: 0,
            p_action: "ready",
            p_position: {},
          }
        : {};
  assert.ok((await clients[0].rpc(name, args)).error, `${name} must not be callable by clients`);
}
console.log("Authoritative clocks, timeout persistence/races, Cron and lobby privacy passed.");
