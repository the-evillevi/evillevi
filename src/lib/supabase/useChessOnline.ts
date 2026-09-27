import { useCallback, useEffect, useRef, useState } from "react";
import type { Move, Ruleset } from "@/lib/chess/engine";
import { isGameId, type ColorPreference } from "@/lib/chess/protocol";
import { guestName, synchronizedNow, timeControl, type TimeControl } from "@/lib/chess/timing";
import {
  chessClient,
  configured,
  invoke,
  parseSnapshot,
  type Snapshot,
  type Invite,
  type LobbyGame,
} from "./chess";

export function useChessOnline() {
  const [gameId, setGameId] = useState<string | null>(null),
    [practiceView, setPracticeView] = useState(false);
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null),
    [invite, setInvite] = useState<Invite | null>(null);
  const [games, setGames] = useState<LobbyGame[]>([]),
    [userId, setUserId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const [connection, setConnection] = useState("Connecting"),
    [initialized, setInitialized] = useState(false);
  const [now, setNow] = useState(0);
  const anchor = useRef<{ server: string; at: number } | null>(null);
  const active = useRef<string | null>(null),
    fetching = useRef(0),
    locked = useRef(false);
  const lastSnapshot = useRef<Snapshot | null>(null);
  const creation = useRef<{
    requestId: string;
    ruleset: Ruleset;
    colorPreference: ColorPreference;
    guestName: string;
    timeControl: TimeControl;
  } | null>(null);
  const syncTime = useCallback((server: string) => {
    anchor.current = { server, at: performance.now() };
    setNow(Date.parse(server));
  }, []);
  useEffect(() => {
    const timer = setInterval(() => {
      const a = anchor.current;
      if (a) setNow(synchronizedNow(a.server, a.at, performance.now()));
    }, 250);
    return () => clearInterval(timer);
  }, []);
  const refreshLobby = useCallback(async () => {
    const { data, error } = await chessClient().rpc("chess_lobby");
    if (error) throw new Error("Unable to refresh your games.");
    const lobby = data as unknown as { games: LobbyGame[]; server_time: string };
    setGames(lobby.games);
    syncTime(lobby.server_time);
  }, [syncTime]);
  const refresh = useCallback(async () => {
    if (!configured) return;
    const id = active.current;
    if (!id) {
      await refreshLobby();
      return;
    }
    const sequence = ++fetching.current;
    const { data, error } = await chessClient().rpc("chess_snapshot", { p_game_id: id });
    if (active.current !== id || sequence !== fetching.current) return;
    if (error) throw new Error("Unable to refresh the game. Check your connection.");
    if (!data) {
      const preview = await chessClient().rpc("chess_invite", { p_game_id: id });
      if (active.current !== id || sequence !== fetching.current) return;
      if (preview.error) throw new Error("Unable to load invitation.");
      setInvite(preview.data as unknown as Invite | null);
      setSnapshot(null);
      lastSnapshot.current = null;
      return;
    }
    const s = parseSnapshot(data);
    if (lastSnapshot.current?.game.id === id && lastSnapshot.current.game.version > s.game.version)
      return;
    lastSnapshot.current = s;
    setSnapshot(s);
    setInvite(null);
    syncTime(s.server_time);
  }, [refreshLobby, syncTime]);
  const readRoute = useCallback(() => {
    const url = new URL(location.href),
      id = url.searchParams.get("game");
    const valid = id && isGameId(id) ? id : null;
    active.current = valid;
    fetching.current++;
    lastSnapshot.current = null;
    setSnapshot(null);
    setInvite(null);
    setGameId(valid);
    setPracticeView(!id && url.searchParams.has("practice"));
    setError(id && !valid ? "This invite has an invalid game ID." : "");
  }, []);
  const navigate = useCallback(
    (id: string | null, practice = false) => {
      const url = new URL(location.href);
      url.searchParams.delete("game");
      url.searchParams.delete("practice");
      if (id) url.searchParams.set("game", id);
      else if (practice) url.searchParams.set("practice", "1");
      history.pushState(null, "", url);
      readRoute();
    },
    [readRoute],
  );
  useEffect(() => {
    readRoute();
    window.addEventListener("popstate", readRoute);
    let alive = true;
    if (!configured) {
      setInitialized(true);
      return () => window.removeEventListener("popstate", readRoute);
    }
    const client = chessClient();
    client.auth
      .getSession()
      .then(({ data, error }) => {
        if (!alive) return;
        if (error) setError("Unable to restore your player session.");
        setUserId(data.session?.user.id ?? null);
        setInitialized(true);
      })
      .catch(() => {
        if (alive) {
          setError("Unable to restore your session.");
          setInitialized(true);
        }
      });
    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((_event, session) => {
      if (alive) setUserId(session?.user.id ?? null);
    });
    return () => {
      alive = false;
      subscription.unsubscribe();
      window.removeEventListener("popstate", readRoute);
    };
  }, [readRoute]);
  useEffect(() => {
    if (!configured || !initialized) return;
    let disposed = false;
    const sync = () => {
      if (!disposed)
        void refresh().catch((e) => {
          if (!disposed) setError(e.message);
        });
    };
    // An unauthenticated visitor can read only the limited invitation preview.
    if (!userId) {
      if (gameId)
        void chessClient()
          .rpc("chess_invite", { p_game_id: gameId })
          .then(({ data, error }) => {
            if (!disposed) {
              setInvite(data as unknown as Invite | null);
              if (error) setError("Unable to load invitation.");
            }
          });
      return () => {
        disposed = true;
      };
    }
    const client = chessClient();
    const channel = client
      .channel(`chess:${gameId ?? "lobby"}:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "chess_games",
          ...(gameId ? { filter: `id=eq.${gameId}` } : {}),
        },
        sync,
      )
      .subscribe((state) => {
        if (!disposed) {
          setConnection(
            state === "SUBSCRIBED" ? "Live" : navigator.onLine ? "Reconnecting" : "Offline",
          );
          if (state === "SUBSCRIBED") sync();
        }
      });
    const offline = () => setConnection("Offline");
    const online = () => {
      setConnection("Reconnecting");
      sync();
    };
    const visible = () => {
      if (document.visibilityState === "visible") sync();
    };
    window.addEventListener("online", online);
    window.addEventListener("offline", offline);
    window.addEventListener("focus", sync);
    document.addEventListener("visibilitychange", visible);
    const timer = window.setInterval(sync, 15000);
    sync();
    return () => {
      disposed = true;
      void client.removeChannel(channel);
      clearInterval(timer);
      window.removeEventListener("online", online);
      window.removeEventListener("offline", offline);
      window.removeEventListener("focus", sync);
      document.removeEventListener("visibilitychange", visible);
    };
  }, [gameId, userId, initialized, refresh]);
  const expiredRequest = useRef("");
  useEffect(() => {
    const deadline = snapshot?.game.deadline;
    const expired = deadline && now >= Date.parse(deadline) ? `${gameId}:${deadline}` : "";
    if (expired && expiredRequest.current !== expired) {
      expiredRequest.current = expired;
      void refresh().catch((e) => setError(e.message));
    }
  }, [now, snapshot, gameId, refresh]);
  const lobbyExpiryRequests = useRef(new Set<string>());
  useEffect(() => {
    if (gameId || !userId || !configured) return;
    const expired = games.filter(
      (g) =>
        g.status === "active" &&
        g.deadline &&
        now >= Date.parse(g.deadline) &&
        !lobbyExpiryRequests.current.has(`${g.id}:${g.deadline}`),
    );
    if (!expired.length) return;
    for (const g of expired) lobbyExpiryRequests.current.add(`${g.id}:${g.deadline}`);
    void Promise.all(expired.map((g) => chessClient().rpc("chess_snapshot", { p_game_id: g.id })))
      .then((results) => {
        if (results.some((r) => r.error)) throw new Error("Unable to resolve an expired game.");
        return refreshLobby();
      })
      .catch((e) => setError(e.message));
  }, [games, now, gameId, userId, refreshLobby]);
  const authenticate = async () => {
    const client = chessClient();
    const { data, error } = await client.auth.getSession();
    if (error) throw error;
    if (data.session) {
      setUserId(data.session.user.id);
      return;
    }
    const result = await client.auth.signInAnonymously();
    if (result.error || !result.data.user)
      throw new Error(
        `Unable to create a player session: ${result.error?.message ?? "No session returned"}`,
      );
    setUserId(result.data.user.id);
  };
  const run = async (fn: () => Promise<void>) => {
    if (locked.current) return false;
    locked.current = true;
    setBusy(true);
    setError("");
    try {
      await fn();
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Request failed");
      try {
        await refresh();
      } catch {
        /* Preserve action error. */
      }
      return false;
    } finally {
      locked.current = false;
      setBusy(false);
    }
  };
  const create = (
    ruleset: Ruleset,
    colorPreference: ColorPreference,
    name: string,
    timing: TimeControl,
  ) =>
    run(async () => {
      const options = {
        ruleset,
        colorPreference,
        guestName: guestName(name),
        timeControl: timeControl(timing),
      };
      await authenticate();
      if (
        !creation.current ||
        JSON.stringify({ ...creation.current, requestId: undefined }) !== JSON.stringify(options)
      )
        creation.current = { requestId: crypto.randomUUID(), ...options };
      const result = await invoke("create-game", creation.current);
      navigate(result.game.id);
      creation.current = null;
      await refresh();
    });
  const join = (name: string) =>
    run(async () => {
      const normalized = guestName(name);
      await authenticate();
      await invoke("join-game", { gameId: active.current, guestName: normalized });
      await refresh();
    });
  const mutate = (endpoint: string, payload: Record<string, unknown>) =>
    run(async () => {
      const s = lastSnapshot.current;
      if (!s || s.game.id !== active.current) throw new Error("Refresh the game first");
      await invoke(endpoint, { gameId: s.game.id, expectedVersion: s.game.version, ...payload });
      await refresh();
    });
  return {
    configured,
    initialized,
    gameId,
    practiceView,
    snapshot,
    invite,
    games,
    now,
    userId,
    busy,
    error,
    setError,
    connection,
    create,
    join,
    refresh: () => run(refresh),
    open: (id: string) => navigate(id),
    leave: () => navigate(null),
    practice: () => navigate(null, true),
    move: (move: Move) => mutate("submit-move", { move }),
    action: (action: string) => mutate("game-action", { action }),
  };
}
