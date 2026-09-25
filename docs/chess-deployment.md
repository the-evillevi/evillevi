# 3D Chess: development and deployment

The static garden hosts `/projects/3d-chess/`; Supabase runs authentication, private game storage, Realtime and four authoritative Edge Functions. Local practice works without configuration. Local development and production release steps are documented separately below.

## Configuration to supply

| Where                              | Setting                           | Value                                                                                                      |
| ---------------------------------- | --------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| Cloudflare Pages build environment | `PUBLIC_SUPABASE_URL`             | Your Supabase project URL                                                                                  |
| Cloudflare Pages build environment | `PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Project publishable key (legacy anon key also works)                                                       |
| Supabase Edge secrets              | `CHESS_ALLOWED_ORIGINS`           | Comma-separated exact origins, e.g. `https://evillevi.pages.dev` and your custom domain; no trailing slash |
| Supabase Auth dashboard            | Anonymous sign-ins                | Enabled                                                                                                    |
| Supabase Auth dashboard            | Site URL                          | Your canonical site origin                                                                                 |
| Deployment CLI                     | Project reference                 | The intended project's reference; explicitly link it before migrations                                     |

The two public variables are embedded at **build time**: rebuild Pages after changing them. Preview environments need their own public configuration and an explicitly allowed origin. Keep service keys out of Pages, public variables, source files and browser code. Supabase supplies server credentials to its functions.

Authenticated calls retain platform JWT verification and the handler verifies the user with Auth before any privileged action. See [Supabase function authentication](https://supabase.com/docs/guides/functions/auth). Anonymous identities use the authenticated database role; their seat survives browser refresh but cannot be recovered after clearing browser storage. Account linking and cross-device seat recovery are outside v1. See [anonymous sign-ins](https://supabase.com/docs/guides/auth/auth-anonymous).

## Local stack

Use Node 24+, pnpm 11.7.0, Docker and Supabase CLI 2.109.1. The isolated stack uses API port **55431**, database **55432**, Studio **55433** and Edge inspector **8183**, avoiding the default local ports.

```sh
pnpm install --frozen-lockfile
supabase start
supabase migration up --local
node scripts/chess-local-env.mjs
pnpm chess:sync:check
supabase functions serve --env-file .env.chess-test.local
```

In another terminal:

```sh
pnpm dev --host 127.0.0.1
```

Open `http://127.0.0.1:4321/projects/3d-chess/`. The configuration helper writes only the local **public** key to ignored `.env.local` and the test flag to ignored `.env.chess-test.local`. It refuses a nonlocal stack. Never upload these files to production. Local Supabase command output can contain secrets; do not paste it into logs or tickets.

## Checks

```sh
pnpm test
pnpm chess:sync:check
pnpm test:chess:integration
CHESS_ONLINE_TESTS=1 pnpm exec playwright test
pnpm check
pnpm build
```

The integration script needs the running local functions and stack. It creates anonymous test players and retains games for inspection. It exercises the shared engine inside the actual Edge runtime, all color choices, idempotent creation, simultaneous joins and moves, participant-only reads, denied client writes, draw agreement and resignation races. Its loopback guard prevents running it against production.

Playwright uses installed Chrome locally; CI installs Chromium. It covers both variants, two isolated player sessions, history restoration, offline/reconnect, draw results, mobile layout, reduced motion and the WebGL fallback. Software rendering is enabled for reproducible 3D checks. No physical two-device or production smoke test has been performed yet.

The engine in `src/lib/chess/` is canonical. `pnpm chess:sync` generates the Deno-compatible mirror in `supabase/functions/_shared/chess/`; commit both. CI fails if they differ. The mirror uses relative `.ts` imports, no browser aliases or runtime-specific dependencies. Regenerate database types after schema changes:

```sh
supabase gen types typescript --local > src/lib/supabase/database.types.ts
```

## Production release

1. Choose the Supabase project and configure anonymous sign-in, site URL and public build variables above. Keep rate limits appropriate to the expected audience. The current UI has no CAPTCHA widget; enabling mandatory CAPTCHA also requires adding that UI and passing its token to sign-in.
2. Authenticate the CLI, explicitly link the intended project, inspect migration changes, then apply them. These migrations create only `chess_*` objects and add `chess_games` to the Realtime publication. Existing unrelated tables are untouched.

   ```sh
   supabase link --project-ref YOUR_PROJECT_REF
   supabase db push --dry-run
   supabase db push
   supabase secrets set CHESS_ALLOWED_ORIGINS=https://evillevi.pages.dev --project-ref YOUR_PROJECT_REF
   ```

3. Check engine synchronization, then deploy **only these four functions**:

   ```sh
   pnpm chess:sync:check
   supabase functions deploy create-game --project-ref YOUR_PROJECT_REF
   supabase functions deploy join-game --project-ref YOUR_PROJECT_REF
   supabase functions deploy submit-move --project-ref YOUR_PROJECT_REF
   supabase functions deploy game-action --project-ref YOUR_PROJECT_REF
   ```

   Do not deploy `chess-fixtures` or set `CHESS_TEST_MODE` remotely. Do not use a blanket function deployment. Keep JWT verification enabled. The fixture endpoint returns 404 without its local-only test flag.

4. Build/deploy the garden through the existing Cloudflare Pages project: build command `pnpm build`, output `dist`, Node 24+, pnpm 11.7.0. No Astro server adapter or per-game route rewrite is needed: invitations use `?game=<uuid>`.
5. Verify the featured homepage card, projects deck, game/rules pages and existing Affogato page. In two separate browser profiles/devices, create and join **both** variants, move as each side, refresh, reconnect and finish with resignation or agreement. Confirm the recorded result persists. A third profile must not read a full game.

An optional remote browser smoke run is available **after** the intended deployment is ready. It creates real anonymous test matches:

```sh
CHESS_TEST_URL=https://YOUR_DEPLOYMENT CHESS_ONLINE_TESTS=1 pnpm exec playwright test
```

## Rules and release boundaries

`strato-v1` and `chess3-v1` are separate, immutable contracts in [chess-rules.md](./chess-rules.md), published at `/projects/3d-chess/rules/`. Never reinterpret saved v1 games; add a new version and retain the old policy for existing matches. Local practice is saved separately from online games.

Private invitations fill one remaining seat. There is no public game listing or spectator access. UUID invites are bearer invitations until filled, so share them only with the intended opponent. Server transactions enforce single occupancy and one commit per version; a conflict returns HTTP 409 and the client refreshes before retrying. Move history includes resulting state hashes.

V1 supports checkmate, stalemate, resignation and agreed draws. It intentionally omits matchmaking, ratings, automatic repetition/move-count/material draws, accounts and analysis. Procedural pieces require no asset licensing or downloads.

## Lobby and authoritative clock migration

Apply `202609250001_chess_lobby_clocks.sql` after the two existing migrations. It backfills existing rows with `clock-v1` untimed settings and Guest White/Guest Black names without rewriting positions or history. New creation requests include `guestName` and `timeControl`; joins include `guestName`. The same creation request ID must retain the original name, ruleset, color preference and timing configuration. Direct table writes and privileged transition functions remain unavailable to browser clients.

`chess_invite` is the only public preview RPC: it returns just a waiting game's ruleset/version, time control and available side. Once filled, its preview disappears. `chess_lobby` returns summaries only for the current identity's seats. `chess_snapshot` verifies membership, locks the row, resolves expiration, and returns a consistent position/history with `server_time`. The browser uses a monotonic clock anchored to that server time and resynchronizes on Realtime, reconnect, focus and visibility changes. At displayed zero it asks for an authoritative snapshot.

Rapid/custom games are active but unstarted after joining. `game-action` with `action: "ready"` records readiness under the row lock; this action deliberately ignores stale expected versions so simultaneous readiness and duplicate requests are safe. Only the second distinct Ready starts White's bank. Untimed games need no readiness; correspondence starts at join.

Movement validation remains in the Edge engine. The SQL commit wrapper checks membership, locks the game, samples server time, resolves deadlines, then calls the private position-transition function. It deducts elapsed rapid time and adds the increment only after an accepted move, or replaces the correspondence allowance for the next turn. A late commit **returns** the finished timeout row; the Edge handler then sends HTTP 409. Raising an exception inside that SQL transaction would roll back the timeout and is deliberately avoided. Finished matches reject further moves. A timeout result lives in `chess_games.result`, never in the immutable engine state's outcome schema.

The migration enables `pg_cron` and installs a named five-second job. Enable Supabase Cron for the target environment before release if its database role cannot create extensions. See [Supabase Cron](https://supabase.com/docs/guides/cron). Inspect the job and recent executions after applying the migration:

```sql
select jobid, jobname, schedule, active from cron.job where jobname = 'chess-expire';
select status, return_message, start_time from cron.job_run_details
where jobid = (select jobid from cron.job where jobname = 'chess-expire')
order by start_time desc limit 10;
```

If restoring an environment without its scheduler metadata, recreate the same named job:

```sql
select cron.schedule('chess-expire', '5 seconds', 'select public.chess_expiry_sweep()');
```

The sweep uses the partial deadline index, orders the oldest expirations first, and locks at most 200 games per run with `SKIP LOCKED`. Every individual expiration rechecks time under the row lock. Monitor backlog and increase sweep capacity if this private service's traffic grows. Never grant browser roles execution on the expiry or internal movement functions.

The expanded tests cover both variants, every preset, custom boundaries, name validation, untimed compatibility, limited previews, lobby privacy, duplicate creation, concurrent readiness, increments, correspondence resets, server-time synchronization, timeouts racing moves, and Cron finishing games with no connected clients. Browser checks cover two identities, lobby/history navigation, modal focus, 1366×768 fit, mobile views, cross-level selection, capture/check feedback, explicit promotion, renderer preference, keyboard control, reconnect and automatic WebGL fallback. Only the test dev server disables Astro's floating development toolbar, which otherwise intercepts bottom-board controls; normal development is unchanged.
