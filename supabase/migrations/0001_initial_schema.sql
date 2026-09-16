-- Elemental RPS Arena — initial schema
--
-- `users` is Supabase's built-in `auth.users`. `profiles` extends it 1:1 and is
-- the row every other table foreign-keys to, so a player keeps their identity
-- when they change or remove a wallet.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------- enums
do $$ begin
  create type run_status as enum (
    'CREATED', 'AWAITING_ENTRY', 'ACTIVE', 'AWAITING_DECISION',
    'CLAIMING', 'CLAIMED', 'LOST', 'CANCELLED', 'EXPIRED'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type round_outcome as enum ('win', 'loss', 'tie');
exception when duplicate_object then null; end $$;

do $$ begin
  create type move_choice as enum ('rock', 'paper', 'scissors');
exception when duplicate_object then null; end $$;

do $$ begin
  create type mint_status as enum ('PENDING', 'SIMULATED', 'MINTED', 'FAILED', 'NOT_APPLICABLE');
exception when duplicate_object then null; end $$;

-- ------------------------------------------------------------- profiles
create table if not exists public.profiles (
  id            uuid primary key references auth.users (id) on delete cascade,
  display_name  text not null default 'Challenger',
  avatar_seed   text,
  champion_key  text not null default 'pyra',
  email         text,
  is_guest      boolean not null default false,
  credits       integer not null default 1000 check (credits >= 0),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  deleted_at    timestamptz,
  constraint display_name_length check (char_length(display_name) between 2 and 24)
);

create index if not exists profiles_deleted_at_idx on public.profiles (deleted_at);

-- -------------------------------------------------------- linked wallets
create table if not exists public.linked_wallets (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles (id) on delete cascade,
  address    text not null,
  chain_id   integer not null,
  label      text,
  is_primary boolean not null default false,
  linked_at  timestamptz not null default now(),
  -- One account per address: prevents two players claiming the same wallet.
  constraint linked_wallets_address_unique unique (address),
  constraint address_format check (address ~ '^0x[a-f0-9]{40}$')
);

create index if not exists linked_wallets_user_idx on public.linked_wallets (user_id);

-- ------------------------------------------------------------ game rooms
create table if not exists public.game_rooms (
  key                    text primary key,
  name                   text not null,
  difficulty             text not null,
  entry_fee              numeric(24, 18) not null default 0,
  currency               text not null default 'RON',
  uses_virtual_credits   boolean not null default false,
  requires_wallet        boolean not null default false,
  mints_nft              boolean not null default false,
  leaderboard_multiplier numeric(6, 2) not null default 1,
  artwork_tier           text not null default 'standard',
  enabled                boolean not null default true,
  created_at             timestamptz not null default now()
);

-- ----------------------------------------------------- reward definitions
create table if not exists public.reward_definitions (
  key          text primary key,
  level        integer not null unique check (level between 1 and 15),
  name         text not null,
  category     text not null,
  description  text not null,
  probability  double precision not null,
  rarity_score numeric(12, 2) not null,
  created_at   timestamptz not null default now()
);

-- ---------------------------------------------------------------- seasons
create table if not exists public.seasons (
  id         text primary key,
  name       text not null,
  starts_at  timestamptz not null,
  ends_at    timestamptz not null,
  is_active  boolean not null default false,
  created_at timestamptz not null default now()
);

create unique index if not exists seasons_single_active_idx on public.seasons (is_active) where is_active;

-- ------------------------------------------------------------- game runs
create table if not exists public.game_runs (
  id                     uuid primary key,
  user_id                uuid not null references public.profiles (id) on delete cascade,
  is_guest               boolean not null default false,
  room_key               text not null references public.game_rooms (key),
  champion_key           text not null,
  opponent_key           text not null,
  mode                   text not null default 'demo',
  entry_fee              numeric(24, 18) not null default 0,
  currency               text not null default 'credits',
  status                 run_status not null default 'CREATED',
  level                  integer not null default 0 check (level between 0 and 15),
  streak                 integer not null default 0,
  round_number           integer not null default 0,
  resolved_rounds        integer not null default 0,
  ties                   integer not null default 0,
  wins                   integer not null default 0,
  losses                 integer not null default 0,
  claimed_level          integer check (claimed_level between 1 and 15),
  claimed_at             timestamptz,
  finished_at            timestamptz,
  requires_payment       boolean not null default false,
  entry_tx_hash          text,
  randomness_commitment  text,
  randomness_provider    text,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now(),
  -- A claimed run must record which level was claimed.
  constraint claimed_has_level check (status <> 'CLAIMED' or claimed_level is not null)
);

create index if not exists game_runs_user_created_idx on public.game_runs (user_id, created_at desc);
create index if not exists game_runs_status_idx on public.game_runs (status);
create index if not exists game_runs_room_idx on public.game_runs (room_key);

-- ----------------------------------------------------------- game rounds
create table if not exists public.game_rounds (
  id            uuid primary key default gen_random_uuid(),
  run_id        uuid not null references public.game_runs (id) on delete cascade,
  round_number  integer not null check (round_number > 0),
  level_before  integer not null,
  level_after   integer not null,
  player_move   move_choice not null,
  opponent_move move_choice not null,
  outcome       round_outcome not null,
  resolved      boolean not null,
  proof         jsonb,
  created_at    timestamptz not null default now(),
  -- Replay protection: the same round can never be written twice.
  constraint game_rounds_run_round_unique unique (run_id, round_number),
  -- A tie must not move the level; a resolved round must move it by one.
  constraint tie_keeps_level check (outcome <> 'tie' or level_before = level_after)
);

create index if not exists game_rounds_run_idx on public.game_rounds (run_id, round_number);

-- -------------------------------------------------------- earned rewards
create table if not exists public.earned_rewards (
  id               uuid primary key default gen_random_uuid(),
  run_id           uuid not null references public.game_runs (id) on delete cascade,
  user_id          uuid not null references public.profiles (id) on delete cascade,
  reward_key       text not null references public.reward_definitions (key),
  reward_level     integer not null check (reward_level between 1 and 15),
  room_key         text not null references public.game_rooms (key),
  artwork_tier     text not null default 'standard',
  rarity_score     numeric(12, 2) not null default 0,
  probability      double precision not null default 0,
  token_id         text,
  contract_address text,
  tx_hash          text,
  metadata_url     text,
  owner_address    text,
  mint_status      mint_status not null default 'PENDING',
  earned_at        timestamptz not null default now(),
  -- Exactly one reward per run: the structural guard against double claims.
  constraint earned_rewards_run_unique unique (run_id)
);

create index if not exists earned_rewards_user_idx on public.earned_rewards (user_id, earned_at desc);
create index if not exists earned_rewards_level_idx on public.earned_rewards (reward_level);

-- ------------------------------------------------------------- nft mints
create table if not exists public.nft_mints (
  id                uuid primary key default gen_random_uuid(),
  earned_reward_id  uuid not null references public.earned_rewards (id) on delete cascade,
  user_id           uuid not null references public.profiles (id) on delete cascade,
  run_id            uuid not null references public.game_runs (id) on delete cascade,
  status            mint_status not null default 'PENDING',
  adapter           text not null,
  token_id          text,
  contract_address  text,
  tx_hash           text,
  chain_id          integer,
  metadata_url      text,
  gateway_url       text,
  owner_address     text,
  simulated         boolean not null default false,
  error_message     text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  -- One mint row per earned reward: the structural guard against double mints.
  constraint nft_mints_reward_unique unique (earned_reward_id)
);

create unique index if not exists nft_mints_token_unique
  on public.nft_mints (contract_address, token_id)
  where token_id is not null and simulated = false;

-- ------------------------------------------------------ leaderboard rows
create table if not exists public.leaderboard_entries (
  user_id         uuid not null references public.profiles (id) on delete cascade,
  season_id       text not null references public.seasons (id) on delete cascade,
  display_name    text not null,
  favourite_room  text,
  score           bigint not null default 0,
  total_runs      integer not null default 0,
  total_wins      integer not null default 0,
  longest_streak  integer not null default 0,
  highest_level   integer not null default 0,
  nfts_collected  integer not null default 0,
  is_demo         boolean not null default false,
  updated_at      timestamptz not null default now(),
  primary key (user_id, season_id)
);

create index if not exists leaderboard_score_idx on public.leaderboard_entries (season_id, score desc);

-- --------------------------------------------------------- wallet nonces
create table if not exists public.wallet_nonces (
  nonce      text primary key,
  address    text,
  purpose    text not null default 'wallet-auth',
  used       boolean not null default false,
  used_at    timestamptz,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists wallet_nonces_expiry_idx on public.wallet_nonces (expires_at);

-- ------------------------------------------------------ idempotency keys
create table if not exists public.idempotency_keys (
  key        text primary key,
  result     jsonb not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists idempotency_expiry_idx on public.idempotency_keys (expires_at);

-- ------------------------------------------------------------ audit logs
create table if not exists public.audit_logs (
  id         uuid primary key default gen_random_uuid(),
  event      text not null,
  user_id    uuid references public.profiles (id) on delete set null,
  run_id     uuid references public.game_runs (id) on delete set null,
  ip_address text,
  metadata   jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists audit_logs_user_idx on public.audit_logs (user_id, created_at desc);
create index if not exists audit_logs_event_idx on public.audit_logs (event, created_at desc);

-- --------------------------------------------- account deletion requests
create table if not exists public.account_deletion_requests (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid references public.profiles (id) on delete set null,
  reason       text,
  status       text not null default 'PENDING',
  requested_at timestamptz not null default now(),
  completed_at timestamptz
);

create index if not exists deletion_requests_status_idx on public.account_deletion_requests (status);

-- -------------------------------------------------------- updated_at glue
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists profiles_touch on public.profiles;
create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();

drop trigger if exists game_runs_touch on public.game_runs;
create trigger game_runs_touch before update on public.game_runs
  for each row execute function public.touch_updated_at();

drop trigger if exists nft_mints_touch on public.nft_mints;
create trigger nft_mints_touch before update on public.nft_mints
  for each row execute function public.touch_updated_at();

-- A new auth user automatically gets a profile.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name, email, avatar_seed)
  values (
    new.id,
    coalesce(split_part(new.email, '@', 1), 'Challenger'),
    new.email,
    new.id::text
  )
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();
