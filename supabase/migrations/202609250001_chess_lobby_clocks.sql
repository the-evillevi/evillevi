-- Timing is versioned independently of the immutable movement state.
alter table public.chess_games
  add column white_name text not null default 'Guest White',
  add column black_name text not null default 'Guest Black',
  add column time_control jsonb not null default '{"version":"clock-v1","mode":"untimed"}',
  add column white_ready boolean not null default false,
  add column black_ready boolean not null default false,
  add column white_ms bigint,
  add column black_ms bigint,
  add column started_at timestamptz,
  add column turn_started_at timestamptz,
  add column deadline timestamptz,
  add constraint chess_names check (char_length(btrim(white_name)) between 1 and 32 and char_length(btrim(black_name)) between 1 and 32),
  add constraint chess_banks check ((white_ms is null or white_ms >= 0) and (black_ms is null or black_ms >= 0));
create index chess_games_expiry on public.chess_games(deadline) where status='active' and deadline is not null;

create function public.chess_valid_time(t jsonb) returns boolean language sql immutable set search_path='' as $$
 select coalesce(t->>'version'='clock-v1' and (
   (t = '{"version":"clock-v1","mode":"untimed"}'::jsonb) or
   (t->>'mode'='rapid' and t - array['version','mode','initialSeconds','incrementSeconds']='{}'::jsonb
    and jsonb_typeof(t->'initialSeconds')='number' and jsonb_typeof(t->'incrementSeconds')='number'
    and (t->>'initialSeconds')::numeric between 60 and 7200 and mod((t->>'initialSeconds')::numeric,60)=0
    and (t->>'incrementSeconds')::numeric between 0 and 60 and mod((t->>'incrementSeconds')::numeric,1)=0) or
   (t->>'mode'='correspondence' and t - array['version','mode','days']='{}'::jsonb and t->'days' in ('1','2','3','5','7','14'))
 ),false);
$$;
alter table public.chess_games add constraint chess_time_valid check(public.chess_valid_time(time_control));

-- Old entry points are removed, preventing bypass of new validation.
drop function public.chess_create(uuid,uuid,text,text,text,jsonb);
create function public.chess_create(p_id uuid,p_actor uuid,p_ruleset text,p_preference text,p_color text,p_position jsonb,p_name text,p_time jsonb) returns public.chess_games
language plpgsql security definer set search_path='' as $$
declare g public.chess_games; bank bigint;
begin
 if p_name is null or char_length(btrim(p_name)) not between 1 and 32 or p_name ~ '[[:cntrl:]]' or not public.chess_valid_time(p_time) then raise exception 'Invalid options' using errcode='22023'; end if;
 bank := case when p_time->>'mode'='rapid' then (p_time->>'initialSeconds')::bigint*1000 end;
 insert into public.chess_games(id,creator_id,creator_color,color_preference,white_id,black_id,ruleset,rules_version,position,white_name,black_name,time_control,white_ms,black_ms)
 values(p_id,p_actor,p_color,p_preference,case when p_color='white' then p_actor end,case when p_color='black' then p_actor end,p_ruleset,p_position->>'rulesVersion',p_position,case when p_color='white' then btrim(p_name) else 'Guest White' end,case when p_color='black' then btrim(p_name) else 'Guest Black' end,p_time,bank,bank) on conflict(id) do nothing;
 select * into g from public.chess_games where id=p_id;
 if g.creator_id<>p_actor or g.ruleset<>p_ruleset or g.color_preference<>p_preference or g.time_control<>p_time or (case when g.creator_color='white' then g.white_name else g.black_name end)<>btrim(p_name) then raise exception 'Creation request conflict' using errcode='PT409'; end if;
 return g;
end; $$;

-- Caller holds the row lock; clock_timestamp is sampled only after acquiring it.
create function public.chess_expire(p_id uuid) returns public.chess_games language plpgsql security definer set search_path='' as $$
declare g public.chess_games; t timestamptz;
begin
 select * into g from public.chess_games where id=p_id for update;
 t:=clock_timestamp();
 if g.status='active' and g.deadline<=t then
  update public.chess_games set status='finished',result=jsonb_build_object('reason','timeout','winner',case when turn='white' then 'black' else 'white' end),
   white_ms=case when turn='white' and time_control->>'mode'='rapid' then 0 else white_ms end,
   black_ms=case when turn='black' and time_control->>'mode'='rapid' then 0 else black_ms end,
   deadline=null,draw_offer=null,version=version+1,updated_at=t where id=p_id returning * into g;
 end if;
 return g;
end; $$;

drop function public.chess_join(uuid,uuid);
create function public.chess_join(p_id uuid,p_actor uuid,p_name text) returns public.chess_games language plpgsql security definer set search_path='' as $$
declare g public.chess_games; t timestamptz;
begin
 if p_name is null or char_length(btrim(p_name)) not between 1 and 32 or p_name ~ '[[:cntrl:]]' then raise exception 'Invalid name' using errcode='22023'; end if;
 select * into g from public.chess_games where id=p_id for update;
 if not found then raise exception 'Game unavailable' using errcode='P0002'; end if;
 if g.creator_id=p_actor then raise exception 'Creator cannot take opponent seat' using errcode='42501'; end if;
 if p_actor=g.white_id or p_actor=g.black_id then return public.chess_expire(p_id); end if;
 if g.status<>'waiting' then raise exception 'Game unavailable' using errcode='P0002'; end if;
 t:=clock_timestamp();
 update public.chess_games set white_name=case when white_id is null then btrim(p_name) else white_name end,black_name=case when black_id is null then btrim(p_name) else black_name end,
 white_id=coalesce(white_id,p_actor),black_id=coalesce(black_id,p_actor),status='active',version=version+1,updated_at=t,
 started_at=case when time_control->>'mode'='correspondence' then t end,
 turn_started_at=case when time_control->>'mode'='correspondence' then t end,
 deadline=case when time_control->>'mode'='correspondence' then t+make_interval(days=>(time_control->>'days')::integer) end
 where id=p_id returning * into g;
 return g;
end; $$;

-- Keep the previously audited movement transition checks, callable only by this wrapper.
alter function public.chess_commit(uuid,uuid,integer,text,jsonb,jsonb,text) rename to chess_commit_position;
revoke all on function public.chess_commit_position(uuid,uuid,integer,text,jsonb,jsonb,text) from service_role;
create function public.chess_commit(p_id uuid,p_actor uuid,p_expected integer,p_action text,p_position jsonb,p_move jsonb default null,p_hash text default null) returns public.chess_games language plpgsql security definer set search_path='' as $$
declare g public.chess_games; next_game public.chess_games; t timestamptz; bank bigint; allowance bigint;
begin
 select * into g from public.chess_games where id=p_id for update;
 if not found or not (p_actor=coalesce(g.white_id,'00000000-0000-0000-0000-000000000000') or p_actor=coalesce(g.black_id,'00000000-0000-0000-0000-000000000000')) then raise exception 'Game unavailable' using errcode='42501'; end if;
 g:=public.chess_expire(p_id);
 -- Returning (not raising) is essential: the timeout must survive rejection of the action.
 if g.result->>'reason'='timeout' then return g; end if;
 if p_action='ready' then
  if g.status<>'active' or g.time_control->>'mode'<>'rapid' or g.started_at is not null then return g; end if;
  if (p_actor=g.white_id and g.white_ready) or (p_actor=g.black_id and g.black_ready) then return g; end if;
  t:=clock_timestamp();
  update public.chess_games set white_ready=white_ready or p_actor=white_id,black_ready=black_ready or p_actor=black_id,version=version+1,updated_at=t where id=p_id returning * into g;
  if g.white_ready and g.black_ready then
   update public.chess_games set started_at=t,turn_started_at=t,deadline=t+g.white_ms*interval '1 millisecond' where id=p_id returning * into g;
  end if;
  return g;
 end if;
 if p_action='move' and g.time_control->>'mode'='rapid' and g.started_at is null then raise exception 'Both players must be ready' using errcode='22023'; end if;
 -- Sample again immediately before transition validation; no client time is accepted.
 t:=clock_timestamp();
 if g.deadline<=t then return public.chess_expire(p_id); end if;
 next_game:=public.chess_commit_position(p_id,p_actor,p_expected,p_action,p_position,p_move,p_hash);
 if p_action='move' and g.time_control->>'mode'<>'untimed' then
  if g.time_control->>'mode'='rapid' then
   bank:=greatest(0,floor(extract(epoch from (g.deadline-t))*1000))::bigint+(g.time_control->>'incrementSeconds')::bigint*1000;
   update public.chess_games set white_ms=case when g.turn='white' then bank else white_ms end,black_ms=case when g.turn='black' then bank else black_ms end where id=p_id returning * into next_game;
   allowance:=case when next_game.turn='white' then next_game.white_ms else next_game.black_ms end;
  else allowance:=(g.time_control->>'days')::bigint*86400000;
  end if;
  update public.chess_games set turn_started_at=t,deadline=case when status='active' then t+allowance*interval '1 millisecond' end where id=p_id returning * into next_game;
 elsif next_game.status='finished' then
  update public.chess_games set deadline=null where id=p_id returning * into next_game;
 end if;
 return next_game;
end; $$;

create or replace function public.chess_snapshot(p_game_id uuid) returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare g public.chess_games;
begin
 select * into g from public.chess_games where id=p_game_id and (auth.uid()=white_id or auth.uid()=black_id) for update;
 if not found then return null; end if;
 g:=public.chess_expire(p_game_id);
 return jsonb_build_object('game',to_jsonb(g),'server_time',clock_timestamp(),'moves',coalesce((select jsonb_agg(to_jsonb(m) order by m.sequence) from public.chess_moves m where m.game_id=g.id),'[]'::jsonb));
end; $$;

-- Bearer invitations reveal only settings for a still-open seat, never player IDs or positions.
create function public.chess_invite(p_game_id uuid) returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object('ruleset',ruleset,'rules_version',rules_version,'time_control',time_control,'side',case when white_id is null then 'white' else 'black' end) from public.chess_games where id=p_game_id and status='waiting';
$$;
create function public.chess_lobby() returns jsonb language sql volatile security definer set search_path='' as $$
 select jsonb_build_object('server_time',clock_timestamp(),'games',coalesce(jsonb_agg(jsonb_build_object(
 'id',id,'white_name',white_name,'black_name',black_name,'side',case when auth.uid()=white_id then 'white' else 'black' end,
 'ruleset',ruleset,'rules_version',rules_version,'time_control',time_control,'status',status,'result',result,'turn',turn,
 'ply',(position->>'ply')::integer,'deadline',deadline,'started_at',started_at,'white_ms',white_ms,'black_ms',black_ms,'created_at',created_at) order by created_at desc),'[]'::jsonb))
 from public.chess_games where auth.uid()=white_id or auth.uid()=black_id;
$$;
create function public.chess_expiry_sweep() returns integer language plpgsql security definer set search_path='' as $$
declare row_id uuid; count integer:=0;
begin
 for row_id in select id from public.chess_games where status='active' and deadline<=statement_timestamp() order by deadline limit 200 for update skip locked loop
  perform public.chess_expire(row_id); count:=count+1;
 end loop;
 return count;
end; $$;

create or replace function public.chess_lock_identity() returns trigger language plpgsql set search_path='' as $$
begin
 if (new.id,new.creator_id,new.creator_color,new.color_preference,new.ruleset,new.rules_version,new.time_control) is distinct from (old.id,old.creator_id,old.creator_color,old.color_preference,old.ruleset,old.rules_version,old.time_control)
 or (old.white_id is not null and new.white_name<>old.white_name) or (old.black_id is not null and new.black_name<>old.black_name) then raise exception 'Game settings are immutable'; end if;
 return new;
end; $$;
revoke all on function public.chess_create(uuid,uuid,text,text,text,jsonb,text,jsonb),public.chess_join(uuid,uuid,text),public.chess_commit(uuid,uuid,integer,text,jsonb,jsonb,text),public.chess_expire(uuid),public.chess_expiry_sweep(),public.chess_lobby(),public.chess_invite(uuid) from public,anon,authenticated;
grant execute on function public.chess_create(uuid,uuid,text,text,text,jsonb,text,jsonb),public.chess_join(uuid,uuid,text),public.chess_commit(uuid,uuid,integer,text,jsonb,jsonb,text),public.chess_expire(uuid),public.chess_expiry_sweep() to service_role;
grant execute on function public.chess_lobby() to authenticated;
grant execute on function public.chess_invite(uuid) to anon,authenticated;

-- pg_cron is the Supabase-supported scheduler. A bounded, indexed sweep also handles closed tabs.
create extension if not exists pg_cron;
select cron.schedule('chess-expire','5 seconds','select public.chess_expiry_sweep()');
