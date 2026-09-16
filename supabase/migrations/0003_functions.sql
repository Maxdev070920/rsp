-- Server-side helpers.

-- Leaderboard deltas applied atomically inside Postgres so two runs settling at
-- the same moment cannot clobber each other with a read-modify-write race.
create or replace function public.apply_leaderboard_delta(
  p_user_id      uuid,
  p_season_id    text,
  p_display_name text,
  p_score_delta  bigint,
  p_wins_delta   integer,
  p_runs_delta   integer,
  p_nfts_delta   integer,
  p_streak       integer,
  p_level        integer
)
returns public.leaderboard_entries
language plpgsql
security definer
set search_path = public
as $$
declare
  result public.leaderboard_entries;
begin
  insert into public.leaderboard_entries as le (
    user_id, season_id, display_name, score, total_runs, total_wins,
    longest_streak, highest_level, nfts_collected, updated_at
  )
  values (
    p_user_id, p_season_id, coalesce(p_display_name, 'Challenger'),
    greatest(p_score_delta, 0), greatest(p_runs_delta, 0), greatest(p_wins_delta, 0),
    greatest(p_streak, 0), greatest(p_level, 0), greatest(p_nfts_delta, 0), now()
  )
  on conflict (user_id, season_id) do update
    set display_name   = coalesce(p_display_name, le.display_name),
        score          = le.score + greatest(p_score_delta, 0),
        total_runs     = le.total_runs + greatest(p_runs_delta, 0),
        total_wins     = le.total_wins + greatest(p_wins_delta, 0),
        nfts_collected = le.nfts_collected + greatest(p_nfts_delta, 0),
        longest_streak = greatest(le.longest_streak, greatest(p_streak, 0)),
        highest_level  = greatest(le.highest_level, greatest(p_level, 0)),
        updated_at     = now()
  returning * into result;

  return result;
end $$;

revoke all on function public.apply_leaderboard_delta from public, anon, authenticated;

-- Housekeeping: expired nonces and idempotency keys. Schedule with pg_cron, or
-- call it from a periodic job.
create or replace function public.purge_expired_tokens()
returns integer language plpgsql security definer set search_path = public as $$
declare
  removed integer;
begin
  delete from public.wallet_nonces where expires_at < now() - interval '1 day';
  get diagnostics removed = row_count;
  delete from public.idempotency_keys where expires_at < now() - interval '1 day';
  return removed;
end $$;

revoke all on function public.purge_expired_tokens from public, anon, authenticated;

-- Abandoned runs are expired rather than left ACTIVE forever, so a player
-- cannot park a run open indefinitely to dodge the concurrent-run limit.
create or replace function public.expire_stale_runs(p_older_than interval default interval '24 hours')
returns integer language plpgsql security definer set search_path = public as $$
declare
  affected integer;
begin
  update public.game_runs
     set status = 'EXPIRED', finished_at = now()
   where status in ('CREATED', 'AWAITING_ENTRY', 'ACTIVE', 'AWAITING_DECISION')
     and updated_at < now() - p_older_than;
  get diagnostics affected = row_count;
  return affected;
end $$;

revoke all on function public.expire_stale_runs from public, anon, authenticated;
