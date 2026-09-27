import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { parseState, type State, type Color, type Move, type Ruleset } from "@/lib/chess/engine";
import type { ClockState, TimeControl } from "@/lib/chess/timing";
import type { Database } from "./database.types";
export type Game = Omit<
  Database["public"]["Tables"]["chess_games"]["Row"],
  "position" | "result" | "ruleset" | "creator_color" | "color_preference" | "turn" | "status"
> &
  ClockState & {
    creator_color: Color;
    color_preference: Color | "random";
    ruleset: Ruleset;
    position: State;
    turn: Color;
    status: "waiting" | "active" | "finished";
    white_name: string;
    black_name: string;
    white_ready: boolean;
    black_ready: boolean;
    result: State["outcome"] | { reason: "timeout"; winner: Color };
  };
export interface Invite {
  ruleset: Ruleset;
  rules_version: string;
  time_control: TimeControl;
  side: Color;
}
export type LobbyGame = Pick<
  Game,
  "id" | "white_name" | "black_name" | "ruleset" | "rules_version" | "result" | "created_at"
> &
  ClockState & { side: Color; ply: number };
export interface Snapshot {
  server_time: string;
  game: Game;
  moves: {
    sequence: number;
    move: Move;
    actor: string;
    game_version: number;
    state_hash: string;
  }[];
}
export const configured = Boolean(
  import.meta.env.PUBLIC_SUPABASE_URL && import.meta.env.PUBLIC_SUPABASE_PUBLISHABLE_KEY,
);
let client: SupabaseClient<Database> | undefined;
export function chessClient() {
  if (!configured)
    throw new Error("Online play has not been configured. Local practice is available.");
  return (client ??= createClient<Database>(
    import.meta.env.PUBLIC_SUPABASE_URL,
    import.meta.env.PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      auth: {
        storageKey: "garden-chess-auth",
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
      },
    },
  ));
}
export function parseSnapshot(raw: unknown): Snapshot {
  const s = raw as Snapshot;
  if (!s?.game || !Array.isArray(s.moves)) throw new Error("Game unavailable or not joined yet.");
  const state = parseState(s.game.position);
  if (
    state.ruleset !== s.game.ruleset ||
    state.rulesVersion !== s.game.rules_version ||
    state.turn !== s.game.turn ||
    s.moves.length !== state.ply
  )
    throw new Error("Incomplete game snapshot. Please reconnect.");
  return { ...s, game: { ...s.game, position: state } };
}
export async function invoke(name: string, body: unknown) {
  const { data, error } = await chessClient().functions.invoke(name, {
    body: body as Record<string, unknown>,
  });
  if (error) {
    let message = "Connection interrupted. Refresh the game before retrying.";
    try {
      const response = await error.context?.json();
      if (response?.error) message = response.error;
    } catch {
      /* Transport errors do not contain JSON. */
    }
    throw new Error(message);
  }
  return data;
}
