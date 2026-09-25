create table public.chess_games (
  id uuid primary key,
  creator_id uuid not null references auth.users(id),
  creator_color text not null check (creator_color in ('white','black')),
  color_preference text not null check (color_preference in ('white','black','random')),
  white_id uuid references auth.users(id),
  black_id uuid references auth.users(id),
  ruleset text not null,
  rules_version text not null,
  position jsonb not null,
  version integer not null default 0 check (version >= 0),
  turn text not null default 'white' check (turn in ('white','black')),
  status text not null default 'waiting' check (status in ('waiting','active','finished')),
  result jsonb,
  draw_offer uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((ruleset = 'strato' and rules_version = 'strato-v1') or (ruleset = 'chess3' and rules_version = 'chess3-v1')),
  check (white_id is null or black_id is null or white_id <> black_id),
  check ((creator_color = 'white' and white_id = creator_id) or (creator_color = 'black' and black_id = creator_id)),
  check ((status = 'waiting' and (white_id is null) <> (black_id is null)) or (status <> 'waiting' and white_id is not null and black_id is not null)),
  check ((status = 'finished') = (result is not null)),
  check (position->>'ruleset' = ruleset and position->>'rulesVersion' = rules_version and position->>'turn' = turn),
  check (draw_offer is null or draw_offer = white_id or draw_offer = black_id)
);
create index chess_games_white on public.chess_games(white_id);
create index chess_games_black on public.chess_games(black_id);
create table public.chess_moves (
  game_id uuid not null references public.chess_games(id) on delete cascade,
  sequence integer not null check (sequence > 0),
  game_version integer not null,
  actor uuid not null references auth.users(id),
  move jsonb not null,
  state_hash text not null,
  created_at timestamptz not null default now(),
  primary key (game_id, sequence),
  unique (game_id, game_version)
);
alter table public.chess_games enable row level security;
alter table public.chess_moves enable row level security;
revoke all on public.chess_games, public.chess_moves from anon, authenticated;
grant select on public.chess_games, public.chess_moves to authenticated;
grant all on public.chess_games, public.chess_moves to service_role;
create policy chess_participant_games on public.chess_games for select to authenticated using ((select auth.uid()) = white_id or (select auth.uid()) = black_id);
create policy chess_participant_moves on public.chess_moves for select to authenticated using (exists (select 1 from public.chess_games g where g.id = game_id and ((select auth.uid()) = g.white_id or (select auth.uid()) = g.black_id)));

-- One SQL statement gives the browser a consistent snapshot and history.
create function public.chess_snapshot(p_game_id uuid) returns jsonb language sql stable security invoker set search_path = '' as $$
  select jsonb_build_object('game', to_jsonb(g), 'moves', coalesce((select jsonb_agg(to_jsonb(m) order by m.sequence) from public.chess_moves m where m.game_id = g.id), '[]'::jsonb))
  from public.chess_games g where g.id = p_game_id;
$$;
revoke all on function public.chess_snapshot(uuid) from public, anon;
grant execute on function public.chess_snapshot(uuid) to authenticated, service_role;

create function public.chess_create(p_id uuid, p_actor uuid, p_ruleset text, p_preference text, p_color text, p_position jsonb) returns public.chess_games
language plpgsql security definer set search_path = '' as $$
declare g public.chess_games;
begin
  insert into public.chess_games(id,creator_id,creator_color,color_preference,white_id,black_id,ruleset,rules_version,position)
  values(p_id,p_actor,p_color,p_preference,case when p_color='white' then p_actor end,case when p_color='black' then p_actor end,p_ruleset,p_position->>'rulesVersion',p_position)
  on conflict(id) do nothing;
  select * into g from public.chess_games where id=p_id;
  if g.creator_id <> p_actor or g.ruleset <> p_ruleset or g.color_preference <> p_preference then raise exception 'Creation request conflict' using errcode='40001'; end if;
  return g;
end; $$;

create function public.chess_join(p_id uuid, p_actor uuid) returns public.chess_games
language plpgsql security definer set search_path = '' as $$
declare g public.chess_games;
begin
  select * into g from public.chess_games where id=p_id for update;
  if not found then raise exception 'Game unavailable' using errcode='P0002'; end if;
  if g.creator_id=p_actor then raise exception 'Creator cannot take the opponent seat' using errcode='42501'; end if;
  if p_actor=g.white_id or p_actor=g.black_id then return g; end if;
  if g.status<>'waiting' then raise exception 'Game unavailable' using errcode='P0002'; end if;
  update public.chess_games set white_id=coalesce(white_id,p_actor), black_id=coalesce(black_id,p_actor), status='active',version=version+1,updated_at=now() where id=p_id returning * into g;
  return g;
end; $$;

create function public.chess_commit(p_id uuid, p_actor uuid, p_expected integer, p_action text, p_position jsonb, p_move jsonb default null, p_hash text default null) returns public.chess_games
language plpgsql security definer set search_path = '' as $$
declare g public.chess_games; offer uuid;
begin
  select * into g from public.chess_games where id=p_id for update;
  if not found or not (p_actor = coalesce(g.white_id,'00000000-0000-0000-0000-000000000000') or p_actor = coalesce(g.black_id,'00000000-0000-0000-0000-000000000000')) then raise exception 'Game unavailable' using errcode='42501'; end if;
  if g.version<>p_expected then raise exception 'Position changed; refresh and retry' using errcode='40001'; end if;
  if g.status<>'active' then raise exception 'Game is not active' using errcode='22023'; end if;
  if p_position->>'ruleset' is distinct from g.ruleset or p_position->>'rulesVersion' is distinct from g.rules_version then raise exception 'Rules are immutable' using errcode='22023'; end if;
  offer := g.draw_offer;
  if p_action='move' then
    if p_actor is distinct from (case when g.turn='white' then g.white_id else g.black_id end) then raise exception 'Not your turn' using errcode='42501'; end if;
    if (p_position->>'ply')::integer <> (g.position->>'ply')::integer+1 or p_position->>'turn'=g.turn or p_move is null or p_hash is null then raise exception 'Invalid transition' using errcode='22023'; end if;
    offer := null;
  elsif p_action='offer-draw' then
    if offer is not null then raise exception 'A draw is already offered' using errcode='22023'; end if;
    offer := p_actor;
    if p_position<>g.position then raise exception 'Position cannot change' using errcode='22023'; end if;
  elsif p_action in ('accept-draw','decline-draw') then
    if offer is null or offer=p_actor then raise exception 'No opponent draw offer' using errcode='22023'; end if;
    offer := null;
    if p_action='decline-draw' and p_position<>g.position then raise exception 'Position cannot change' using errcode='22023'; end if;
    if p_action='accept-draw' and (p_position - 'outcome' <> g.position - 'outcome' or p_position->'outcome' is distinct from '{"reason":"agreement","winner":null}'::jsonb) then raise exception 'Invalid draw' using errcode='22023'; end if;
  elsif p_action='resign' then
    offer := null;
    if p_position - 'outcome' <> g.position - 'outcome' or p_position->'outcome' is distinct from jsonb_build_object('reason','resignation','winner',case when p_actor=g.white_id then 'black' else 'white' end) then raise exception 'Invalid resignation' using errcode='22023'; end if;
  else raise exception 'Unknown action' using errcode='22023'; end if;
  update public.chess_games set position=p_position,turn=p_position->>'turn',version=version+1,draw_offer=offer,
    result=nullif(p_position->'outcome','null'::jsonb),status=case when p_position->'outcome' <> 'null'::jsonb then 'finished' else 'active' end,updated_at=now()
    where id=p_id returning * into g;
  if p_action='move' then
    insert into public.chess_moves(game_id,sequence,game_version,actor,move,state_hash) values(p_id,(p_position->>'ply')::integer,g.version,p_actor,p_move,p_hash);
  end if;
  return g;
end; $$;
revoke all on function public.chess_create(uuid,uuid,text,text,text,jsonb), public.chess_join(uuid,uuid), public.chess_commit(uuid,uuid,integer,text,jsonb,jsonb,text) from public, anon, authenticated;
grant execute on function public.chess_create(uuid,uuid,text,text,text,jsonb), public.chess_join(uuid,uuid), public.chess_commit(uuid,uuid,integer,text,jsonb,jsonb,text) to service_role;

-- Defense in depth: a game cannot be relabeled after creation, even by future server code.
create function public.chess_lock_identity() returns trigger language plpgsql set search_path = '' as $$
begin
  if (new.id,new.creator_id,new.creator_color,new.color_preference,new.ruleset,new.rules_version) is distinct from (old.id,old.creator_id,old.creator_color,old.color_preference,old.ruleset,old.rules_version) then raise exception 'Game identity and rules are immutable'; end if;
  return new;
end; $$;
create trigger chess_identity before update on public.chess_games for each row execute function public.chess_lock_identity();
alter publication supabase_realtime add table public.chess_games;
