-- Expected-version conflicts are application conflicts, not transaction failures.
-- PostgREST maps 40001 to HTTP 500, which invites infrastructure/client retries.
-- PT409 preserves the atomic rollback while immediately returning HTTP 409.
do $$
declare target regprocedure;
begin
  foreach target in array array[
    'public.chess_create(uuid,uuid,text,text,text,jsonb)'::regprocedure,
    'public.chess_commit(uuid,uuid,integer,text,jsonb,jsonb,text)'::regprocedure
  ] loop
    execute replace(pg_get_functiondef(target), 'errcode=''40001''', 'errcode=''PT409''');
  end loop;
end;
$$;
