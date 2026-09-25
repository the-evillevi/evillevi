import { createClient } from "@supabase/supabase-js";
import {
  applyMove,
  initialState,
  opposite,
  parseState,
  type Move,
  type Ruleset,
} from "./chess/engine.ts";
import { isGameId, resolveColor, type ColorPreference } from "./chess/protocol.ts";

import { guestName, timeControl } from "./chess/timing.ts";

class RequestError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
const fail = (status: number, message: string): never => {
  throw new RequestError(status, message);
};
function fields(body: Record<string, unknown>, allowed: string[]) {
  if (Object.keys(body).some((k) => !allowed.includes(k))) fail(400, "Unexpected request field");
}
export function handler(action: "create-game" | "join-game" | "submit-move" | "game-action") {
  return async (req: Request): Promise<Response> => {
    const origin = req.headers.get("Origin");
    const origins = (
      Deno.env.get("CHESS_ALLOWED_ORIGINS") ?? "http://127.0.0.1:4321,http://localhost:4321"
    )
      .split(",")
      .map((s) => s.trim());
    const headers = {
      "Content-Type": "application/json",
      Vary: "Origin",
      "Access-Control-Allow-Origin": origin && origins.includes(origin) ? origin : "",
      "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Cache-Control": "no-store",
    };
    const respond = (data: unknown, status = 200) =>
      new Response(JSON.stringify(data), { status, headers });
    try {
      if (origin && !origins.includes(origin)) fail(403, "Origin is not allowed");
      if (req.method === "OPTIONS") return new Response(null, { status: 204, headers });
      if (req.method !== "POST") fail(405, "Use POST");
      const url = Deno.env.get("SUPABASE_URL")!,
        anon = Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!;
      const secret =
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? Deno.env.get("SUPABASE_SECRET_KEY")!;
      const token = req.headers.get("Authorization")?.match(/^Bearer (.+)$/i)?.[1];
      if (!token) fail(401, "Sign in to play");
      const auth = createClient(url, anon, {
        auth: { persistSession: false, autoRefreshToken: false },
      });
      const { data: identity, error: authError } = await auth.auth.getUser(token);
      if (authError || !identity.user) fail(401, "Session expired; sign in again");
      const actor = identity.user.id;
      const raw = await req.text();
      if (raw.length > 4096) fail(413, "Request too large");
      let body: Record<string, unknown>;
      try {
        body = JSON.parse(raw);
      } catch {
        return respond({ error: "Invalid JSON" }, 400);
      }
      if (!body || typeof body !== "object" || Array.isArray(body)) fail(400, "Invalid request");
      const admin = createClient(url, secret, {
        auth: { persistSession: false, autoRefreshToken: false },
      });
      if (action === "create-game") {
        fields(body, ["requestId", "ruleset", "colorPreference", "guestName", "timeControl"]);
        let name, timing;
        try {
          name = guestName(body.guestName);
          timing = timeControl(body.timeControl);
        } catch (e) {
          return respond({ error: (e as Error).message }, 400);
        }
        if (
          !isGameId(body.requestId) ||
          !["strato", "chess3"].includes(String(body.ruleset)) ||
          !["white", "black", "random"].includes(String(body.colorPreference))
        )
          fail(400, "Invalid game options");
        const position = initialState(body.ruleset as Ruleset);
        const color = resolveColor(
          body.colorPreference as ColorPreference,
          crypto.getRandomValues(new Uint8Array(1))[0],
        );
        const { data, error } = await admin.rpc("chess_create", {
          p_id: body.requestId,
          p_actor: actor,
          p_ruleset: body.ruleset,
          p_preference: body.colorPreference,
          p_color: color,
          p_position: position,
          p_name: name,
          p_time: timing,
        });
        if (error) throw error;
        return respond({ game: data });
      }
      if (!isGameId(body.gameId)) fail(400, "Invalid game ID");
      if (action === "join-game") {
        fields(body, ["gameId", "guestName"]);
        let name;
        try {
          name = guestName(body.guestName);
        } catch (e) {
          return respond({ error: (e as Error).message }, 400);
        }
        const { data, error } = await admin.rpc("chess_join", {
          p_id: body.gameId,
          p_actor: actor,
          p_name: name,
        });
        if (error) throw error;
        return respond({ game: data });
      }
      fields(
        body,
        action === "submit-move"
          ? ["gameId", "expectedVersion", "move"]
          : ["gameId", "expectedVersion", "action"],
      );
      if (!Number.isSafeInteger(body.expectedVersion) || Number(body.expectedVersion) < 0)
        fail(400, "Invalid expected version");
      const { data: game, error: readError } = await admin
        .from("chess_games")
        .select("*")
        .eq("id", body.gameId)
        .maybeSingle();
      if (readError) throw readError;
      if (!game || (game.white_id !== actor && game.black_id !== actor))
        fail(404, "Game unavailable");
      const { data: resolved, error: expiryError } = await admin.rpc("chess_expire", {
        p_id: body.gameId,
      });
      if (expiryError) throw expiryError;
      if (resolved?.result?.reason === "timeout")
        return respond({ error: "Time expired", game: resolved }, 409);
      if (action === "game-action" && body.action === "ready") {
        const { data, error } = await admin.rpc("chess_commit", {
          p_id: body.gameId,
          p_actor: actor,
          p_expected: body.expectedVersion,
          p_action: "ready",
          p_position: game.position,
        });
        if (error) throw error;
        return respond({ game: data });
      }
      if (game.version !== body.expectedVersion)
        fail(409, "Position changed; refresh and choose your move again");
      if (game.status !== "active") fail(409, "Game is not active");
      let position = parseState(game.position);
      const color = game.white_id === actor ? "white" : "black";
      let command: string,
        move: Move | null = null,
        hash: string | null = null;
      if (action === "submit-move") {
        if (position.turn !== color) fail(403, "Not your turn");
        move = body.move as Move;
        try {
          position = applyMove(position, move);
        } catch {
          return respond({ error: "Illegal move" }, 422);
        }
        hash = Array.from(
          new Uint8Array(
            await crypto.subtle.digest(
              "SHA-256",
              new TextEncoder().encode(JSON.stringify(position)),
            ),
          ),
        )
          .map((b) => b.toString(16).padStart(2, "0"))
          .join("");
        command = "move";
      } else {
        command = String(body.action);
        if (!["resign", "offer-draw", "accept-draw", "decline-draw"].includes(command))
          fail(400, "Unknown game action");
        if (command === "offer-draw" && game.draw_offer) fail(409, "A draw is already offered");
        if (
          ["accept-draw", "decline-draw"].includes(command) &&
          (!game.draw_offer || game.draw_offer === actor)
        )
          fail(409, "No opponent draw offer");
        if (command === "resign")
          position.outcome = { reason: "resignation", winner: opposite(color) };
        if (command === "accept-draw") position.outcome = { reason: "agreement", winner: null };
      }
      const { data, error } = await admin.rpc("chess_commit", {
        p_id: body.gameId,
        p_actor: actor,
        p_expected: body.expectedVersion,
        p_action: command,
        p_position: position,
        p_move: move,
        p_hash: hash,
      });
      if (error) throw error;
      if (data?.result?.reason === "timeout")
        return respond({ error: "Time expired", game: data }, 409);
      return respond({ game: data });
    } catch (error) {
      if (error instanceof RequestError) return respond({ error: error.message }, error.status);
      const code = (error as { code?: string })?.code;
      if (code === "PT409" || code === "40001")
        return respond({ error: "Game changed. Refresh and retry." }, 409);
      if (code === "42501")
        return respond({ error: "This action is not allowed for this player." }, 403);
      if (code === "P0002") return respond({ error: "Game unavailable or already full." }, 404);
      if (code === "22023")
        return respond({ error: "Action is not valid for the current game." }, 409);
      console.error("chess request failed", { action, code: code ?? "internal" });
      return respond({ error: "Unable to complete the request." }, 500);
    }
  };
}
