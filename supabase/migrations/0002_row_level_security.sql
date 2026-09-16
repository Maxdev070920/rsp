-- Row Level Security.
--
-- The browser only ever holds the anon key, so every table it can reach is
-- governed by these policies. The server's service-role key bypasses RLS and is
-- used exclusively inside route handlers that have already authorised the
-- caller — which is why no table below grants the client a write path to
-- anything that decides an outcome (runs, rounds, rewards, mints, leaderboard).

alter table public.profiles                  enable row level security;
alter table public.linked_wallets            enable row level security;
alter table public.game_rooms                enable row level security;
alter table public.reward_definitions        enable row level security;
alter table public.seasons                   enable row level security;
alter table public.game_runs                 enable row level security;
alter table public.game_rounds               enable row level security;
alter table public.earned_rewards            enable row level security;
alter table public.nft_mints                 enable row level security;
alter table public.leaderboard_entries       enable row level security;
alter table public.wallet_nonces             enable row level security;
alter table public.idempotency_keys          enable row level security;
alter table public.audit_logs                enable row level security;
alter table public.account_deletion_requests enable row level security;

-- ------------------------------------------------------------- reference
-- Rooms, reward definitions, and seasons are public read, no write.
drop policy if exists game_rooms_read on public.game_rooms;
create policy game_rooms_read on public.game_rooms for select using (true);

drop policy if exists reward_definitions_read on public.reward_definitions;
create policy reward_definitions_read on public.reward_definitions for select using (true);

drop policy if exists seasons_read on public.seasons;
create policy seasons_read on public.seasons for select using (true);

-- -------------------------------------------------------------- profiles
drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own on public.profiles
  for select using (auth.uid() = id);

drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

-- ---------------------------------------------------------------- wallets
drop policy if exists wallets_select_own on public.linked_wallets;
create policy wallets_select_own on public.linked_wallets
  for select using (auth.uid() = user_id);

-- Inserting a wallet requires a verified signature, so it happens server-side
-- only. No client insert policy exists on purpose.
drop policy if exists wallets_delete_own on public.linked_wallets;
create policy wallets_delete_own on public.linked_wallets
  for delete using (auth.uid() = user_id);

-- ------------------------------------------------------------------ runs
-- Read-only for the owner. All writes go through the service role, which is
-- what stops a client from inventing a level, a claim, or a win.
drop policy if exists runs_select_own on public.game_runs;
create policy runs_select_own on public.game_runs
  for select using (auth.uid() = user_id);

drop policy if exists rounds_select_own on public.game_rounds;
create policy rounds_select_own on public.game_rounds
  for select using (
    exists (select 1 from public.game_runs r where r.id = run_id and r.user_id = auth.uid())
  );

-- --------------------------------------------------------------- rewards
drop policy if exists earned_rewards_select_own on public.earned_rewards;
create policy earned_rewards_select_own on public.earned_rewards
  for select using (auth.uid() = user_id);

drop policy if exists nft_mints_select_own on public.nft_mints;
create policy nft_mints_select_own on public.nft_mints
  for select using (auth.uid() = user_id);

-- ----------------------------------------------------------- leaderboard
-- Public read (it is a leaderboard); writes are service-role only, which is the
-- defence against score manipulation.
drop policy if exists leaderboard_read on public.leaderboard_entries;
create policy leaderboard_read on public.leaderboard_entries for select using (true);

-- ------------------------------------------------------------ audit/self
drop policy if exists audit_select_own on public.audit_logs;
create policy audit_select_own on public.audit_logs
  for select using (auth.uid() = user_id);

drop policy if exists deletion_requests_select_own on public.account_deletion_requests;
create policy deletion_requests_select_own on public.account_deletion_requests
  for select using (auth.uid() = user_id);

-- ------------------------------------------------- server-only by design
-- wallet_nonces and idempotency_keys deliberately have NO policies: with RLS
-- enabled and no policy, the anon key can neither read nor write them. Only the
-- service role touches these tables.
