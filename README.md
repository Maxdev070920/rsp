# Elemental RPS Arena

A Web3 Rock–Paper–Scissors ladder game. Win a round, unlock a rarer collectible, then decide: **claim it and stop**, or **risk it for the tier above**. Fifteen tiers, ties replayed for free, and a resolved loss takes everything unclaimed.

Built with Next.js (App Router), React, **JavaScript only — no TypeScript**, Tailwind CSS, Supabase, ethers.js, and Solidity. It runs on **testnet and simulated currency by default**, and **Practice Arena is always playable with no wallet, no account, and no configuration at all**.

---

## Table of contents

- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Running locally](#running-locally)
- [Starting Practice Arena](#starting-practice-arena)
- [Environment variables](#environment-variables)
- [Supabase setup](#supabase-setup)
- [Connecting a wallet](#connecting-a-wallet)
- [Deploying contracts locally](#deploying-contracts-locally)
- [Configuring a testnet](#configuring-a-testnet)
- [Deploying the web application](#deploying-the-web-application)
- [Running tests](#running-tests)
- [How fairness works](#how-fairness-works)
- [Replacing placeholder assets](#replacing-placeholder-assets)
- [How account deletion works](#how-account-deletion-works)
- [Why blockchain records cannot be deleted](#why-blockchain-records-cannot-be-deleted)
- [Architecture](#architecture)
- [Security notes](#security-notes)
- [Known limitations](#known-limitations)
- [Roadmap](#roadmap)

---

## Prerequisites

| Requirement | Version | Needed for |
|---|---|---|
| Node.js | 20.x or newer (developed on 22.x) | everything |
| npm | 10.x or newer | everything |
| Supabase account | free tier is enough | accounts, persistence, leaderboard |
| A testnet wallet | Ronin Wallet or MetaMask | wallet linking, paid arenas |
| Testnet funds | Saigon RON or Sepolia ETH | contract deployment, paid entry |

Nothing in the first column beyond Node and npm is required to run and play the game.

---

## Installation

```bash
git clone <your-repository-url> elemental-rps-arena
cd elemental-rps-arena
npm install
cp .env.example .env.local   # optional — the app runs without it
```

---

## Running locally

```bash
npm run dev      # http://localhost:3000
npm run build    # production build
npm start        # serve the production build
```

With an empty or missing `.env.local` the app starts in its zero-config mode:

- **In-memory database** — data lives as long as the server process
- **Simulated randomness** — commit–reveal with a per-process secret
- **Simulated minting** — token ids and transaction hashes are clearly labelled as fake
- **Demo mode** — no chain calls of any kind

The header badge always states which of these are active. Nothing is presented as real when it is not.

---

## Starting Practice Arena

1. `npm run dev`
2. Open http://localhost:3000
3. Click **Play Free**

That is the whole flow. A guest session cookie is created on the spot; there is no sign-up, no wallet prompt, and no cost. Practice Arena runs the identical engine, ladder, and odds as the paid arenas — it just mints nothing and scores nothing.

You can also go straight to `/game?room=practice`.

**Controls:** click a throw, or press `1` (Rock), `2` (Paper), `3` (Scissors). Everything is keyboard reachable, and all animation stops under `prefers-reduced-motion`.

---

## Environment variables

Full annotated list in [`.env.example`](.env.example). The ones that change behaviour most:

| Variable | Default | Effect |
|---|---|---|
| `NEXT_PUBLIC_CHAIN_MODE` | `demo` | `demo` = no chain calls, simulated mints. `blockchain` = real testnet transactions. |
| `NEXT_PUBLIC_CHAIN_ID` | `2021` | 2021 Ronin Saigon, 11155111 Sepolia, 31337 Hardhat local. |
| `NEXT_PUBLIC_ALLOW_MAINNET` | `false` | Mainnet is refused unless this is explicitly `true`. |
| `RANDOMNESS_PROVIDER` | `simulated` | `simulated`, `commit-reveal`, or `vrf`. |
| `RANDOMNESS_SERVER_SECRET` | *(empty)* | Without it, run proofs stop verifying after a server restart. |
| `SESSION_SECRET` | *(empty)* | Without it, guest cookies stop validating after a restart. |
| `SUPABASE_SERVICE_ROLE_KEY` | *(empty)* | Server-only. Bypasses RLS. Never expose it. |
| `NEXT_PUBLIC_ENTRY_FEE_*` | `0.01` / `0.05` / `0.1` | Test values. Entry fees are never hard-coded in components. |

**Two rules that are not negotiable.** Anything prefixed `NEXT_PUBLIC_` is compiled into the browser bundle and is public — never put a secret there. And `DEPLOYER_PRIVATE_KEY` is read only by Hardhat, only from a git-ignored `.env.local`, and should only ever hold a throwaway testnet key.

---

## Supabase setup

Without Supabase the app uses the in-memory repository. To enable accounts, persistence, and a real leaderboard:

1. **Create a project** at [supabase.com](https://supabase.com).
2. **Copy the keys** from Project Settings → API into `.env.local`:
   ```bash
   NEXT_PUBLIC_SUPABASE_URL="https://xxxxx.supabase.co"
   NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJhb..."
   SUPABASE_SERVICE_ROLE_KEY="eyJhb..."
   ```
3. **Run the migrations.** In the SQL Editor, run each file in order:
   - `supabase/migrations/0001_initial_schema.sql` — tables, indexes, constraints, triggers
   - `supabase/migrations/0002_row_level_security.sql` — RLS policies
   - `supabase/migrations/0003_functions.sql` — atomic leaderboard updates and housekeeping

   Or with the Supabase CLI:
   ```bash
   supabase link --project-ref <your-ref>
   supabase db push
   ```
4. **Seed the reference data:** run `supabase/seed.sql`. It is idempotent — re-running it updates rather than duplicates.
5. **Configure auth:** Authentication → Providers → Email. Enable "Confirm email" if you want verification. Add `http://localhost:3000/auth/login` to the redirect allowlist.
6. Restart the dev server. The header badge should now read **Persistent database**.

### Schema at a glance

`profiles` (extends `auth.users`) · `linked_wallets` · `game_rooms` · `game_runs` · `game_rounds` · `reward_definitions` · `earned_rewards` · `nft_mints` · `leaderboard_entries` · `seasons` · `audit_logs` · `account_deletion_requests` · `wallet_nonces` · `idempotency_keys`

Three constraints do the heavy lifting against duplicate awards:

- `game_rounds (run_id, round_number)` is **unique** — a replayed round collides instead of scoring twice.
- `earned_rewards (run_id)` is **unique** — one reward per run, ever.
- `nft_mints (earned_reward_id)` is **unique** — one mint per reward, ever.

---

## Connecting a wallet

**Practice Arena never asks for a wallet.** Everywhere else, linking is a two-step process, and the first step proves nothing on its own:

1. **Connect** — the wallet exposes an address. A public address is not proof of identity, and the app does not treat it as such.
2. **Sign** — the server issues a single-use nonce; the wallet signs a message containing it; the server recovers the signer and checks it matches. Only then is the wallet linked.

Supported connectors: **Ronin Wallet** (`window.ronin.provider`), **MetaMask**, any other injected EIP-1193 wallet, and **WalletConnect** (declared, but reports itself unavailable until `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` is set and the transport is bundled — it is not silently hidden).

Wallets attach to your account, not the other way round: **unlinking or changing a wallet never costs you your account, history, or collection.**

---

## Deploying contracts locally

```bash
npm run contracts:compile          # solc 0.8.24, optimizer on
npm run contracts:test             # 24 contract tests
npm run contracts:node             # terminal 1: local chain on :8545
npm run contracts:deploy:local     # terminal 2
```

The deploy script prints the two addresses. Put them in `.env.local` and switch to blockchain mode:

```bash
NEXT_PUBLIC_ARENA_CONTRACT_ADDRESS="0x..."
NEXT_PUBLIC_REWARDS_CONTRACT_ADDRESS="0x..."
NEXT_PUBLIC_CHAIN_ID="31337"
NEXT_PUBLIC_CHAIN_MODE="blockchain"
```

What the script does: deploys `ElementalRewards`, deploys `ElementalArena`, points the arena at the rewards contract, grants the arena `MINTER_ROLE`, grants the settler address `SETTLER_ROLE`, and seeds each room's entry fee from the same `NEXT_PUBLIC_ENTRY_FEE_*` variables the web app reads — so the two cannot drift apart.

---

## Configuring a testnet

Ronin Saigon is the default target.

1. **Get a throwaway key.** Create a fresh wallet used for nothing else. Never reuse a key that has held real funds.
2. **Fund it** from the [Saigon faucet](https://faucet.roninchain.com/).
3. **Set deployment variables** in `.env.local` (git-ignored):
   ```bash
   DEPLOYER_PRIVATE_KEY="0x..."          # throwaway testnet key only
   TREASURY_ADDRESS="0x..."              # where entry fees are swept
   SETTLER_ADDRESS="0x..."               # the game server's address
   ```
4. **Deploy:**
   ```bash
   npm run contracts:deploy:testnet
   ```
5. **Point the app at it:**
   ```bash
   NEXT_PUBLIC_CHAIN_ID="2021"
   NEXT_PUBLIC_CHAIN_MODE="blockchain"
   NEXT_PUBLIC_ARENA_CONTRACT_ADDRESS="0x..."
   NEXT_PUBLIC_REWARDS_CONTRACT_ADDRESS="0x..."
   ```

For Sepolia instead, use `--network sepolia` and `NEXT_PUBLIC_CHAIN_ID="11155111"`.

**Mainnet is deliberately absent** from `hardhat.config.cjs`, and the deploy script refuses chain ids 1 and 2020. Adding mainnet should be a deliberate, reviewed act — not a config flag someone flips by accident.

---

## Deploying the web application

Any Node host that runs Next.js works. On Vercel:

1. Import the repository.
2. Add every variable from `.env.example` that you actually use. Double-check that `SUPABASE_SERVICE_ROLE_KEY`, `RANDOMNESS_SERVER_SECRET`, and `SESSION_SECRET` are **not** prefixed `NEXT_PUBLIC_`.
3. Set `NEXT_PUBLIC_APP_URL` to the deployed origin — wallet sign-in messages and NFT metadata URLs are built from it.
4. Deploy. `npm run build` is the build command; no special settings are needed.

Before going live with anything of value, read [Known limitations](#known-limitations) — particularly the notes on rate limiting and the minting key.

---

## Running tests

```bash
npm test                  # Vitest: 130 unit + integration tests
npm run test:watch
npm run test:e2e          # Playwright, desktop and mobile viewports
npm run contracts:test    # Hardhat: 24 Solidity tests
```

**All randomness in tests is deterministic.** Unit tests use fixed move pairings; integration tests inject `DeterministicRandomnessProvider` with a scripted opponent. No test depends on chance.

Coverage includes: RPS resolution (all nine pairings), tie behaviour, win progression, loss behaviour, claim behaviour, automatic level-15 claim, probability calculations, invalid state transitions, duplicate claims, duplicate mints, wallet nonce validation and replay, room entry requirements, practice mode, account deletion, leaderboard calculations, responsive flows, contract access control, contract pause behaviour, and reentrancy protection.

First Playwright run needs browsers: `npx playwright install chromium`.

---

## How fairness works

The opponent's move is **never** generated in your browser, and never with `Math.random()`.

1. **Commit.** When a run starts, the server derives a seed for that run — `HMAC(masterSecret, "run:<id>")` — and publishes `SHA-256(seed)` as a commitment. The seed is fixed before your first throw.
2. **Play.** Each round's opponent move is `HMAC-SHA256(seed, "<runId>:<roundNumber>")`, with the leading 48 bits reduced modulo 3. **Your move is not an input**, so the result cannot be steered after seeing what you threw. The digest is stored with the round.
3. **Reveal.** When the run reaches a terminal state, the server publishes the seed. Hash it: it must equal the commitment. Then recompute every round.

The history page has a **"Verify randomness in my browser"** button that does exactly this, locally, using Web Crypto. It calls no server.

Because the seed is derived through an HMAC, revealing one run's seed tells an observer nothing about the master secret or any other run.

### The odds

Every resolved round is an even 50/50. Ties are replayed and count as neither a win nor a loss, so reaching level *n* has probability **1 / 2ⁿ**:

| Level | Reward | Odds |
|---|---|---|
| 1 | Copper Sigil | 1 in 2 |
| 5 | Gold Ascendant | 1 in 32 |
| 10 | Emerald Verdance | 1 in 1,024 |
| 15 | Eternal Singularity | 1 in 32,768 |

From where you are standing right now, the next resolved round is always exactly 50%. A long streak does not make it safer.

### Swapping the provider

`RandomnessProvider` (`lib/random/provider.js`) is an interface. Three implementations ship: `SimulatedRandomnessProvider`, `CommitRevealRandomnessProvider`, and `VrfRandomnessProvider`. The VRF one **throws rather than falling back to anything weaker** — it will not silently downgrade. Swapping providers requires no change to game rules, API handlers, or the database schema.

---

## Replacing placeholder assets

Every visual asset is generated from code in this repository. There are no image files, no fonts to license, and nothing traced from anywhere.

| Asset | Where | How to replace |
|---|---|---|
| Reward artwork (15 tiers) | `lib/art/rewardArt.js` → `rewardSvg()` | Edit the palette and `glyph` in `config/rewards.js`, or swap the `glyphMarkup()` switch for `<image href="...">` pointing at your own files in `public/`. |
| Champion art (5) | `lib/art/rewardArt.js` → `championSvg()` | Edit `colors` in `config/characters.js`, or replace the function body. |
| Player avatars | `lib/art/rewardArt.js` → `avatarSvg()` | Deterministic identicons from a seed; replace the function or point `Avatar` at uploaded images. |
| Hand glyphs | `components/game/HandGlyph.js` | Inline React SVG; edit the three shape branches. |
| Sound effects | `hooks/useSound.js` | Synthesised with the Web Audio API — no audio files. Replace `TONES` with `Audio` elements if you prefer samples. |

Reward artwork is served at `/api/art/reward/[key]?tier=standard|enhanced|premium` and that URL is what NFT metadata points to in demo mode. Replace the generator and the metadata follows automatically.

Room `artworkTier` drives the visual treatment: **standard** (one ring, plain frame), **enhanced** (two rings, 8 rays, sparkle), **premium** (three rings, 16 rays, heavy sparkle).

---

## How account deletion works

From **Profile → Delete account**, typing the exact phrase `DELETE MY ACCOUNT` (validated on the server, not just in the browser):

**Removed or anonymised:**
- Display name → `Deleted Challenger`
- Email address → null
- Avatar seed → reset
- All linked wallets → deleted
- The Supabase auth user → deleted, when a service-role key is configured

**Retained, deliberately:**
- Run and round records, in anonymised form — the leaderboard and audit trail depend on them
- Audit log entries, for a limited period, for abuse investigation
- Any minted NFT record, because it describes something that exists outside this system

The API response states each retention reason explicitly, and the UI shows it back to you before and after deletion. Nothing is quietly kept.

---

## Why blockchain records cannot be deleted

If you played a paid arena in blockchain mode, some of what happened is **not in our database at all**.

An entry payment, a mint, and any later transfer are transactions on a public blockchain: an append-only ledger replicated across thousands of independent machines, none of which this project operates. There is no delete operation. There is no operator who can issue one. Rewriting history would require the majority of that network to agree to rewrite it, which is precisely the property the chain exists to provide.

So deleting your account here removes the **link** between your profile and those addresses in our database. It does not remove the chain records, and no one — not you, not us — can. NFT metadata pinned to IPFS is similarly content-addressed and may persist on any node that has it.

This is stated on the deletion dialog, in the privacy policy, and in the deletion API response, because it is the one consequence that cannot be undone later.

---

## Architecture

```
app/
  api/                 route handlers — the only place outcomes are decided
  auth/ collection/ game/ history/ leaderboard/ profile/ rooms/ rules/
  privacy/ terms/ responsible-play/
components/
  auth/ game/ layout/ leaderboard/ nft/ profile/ ui/ wallet/
config/                rooms, rewards, characters, chains, achievements, env
contracts/             Solidity + Hardhat deploy script and tests
hooks/                 useSession, useWallet, useGameRun, useToast, useSound
lib/
  art/                 procedural SVG generators
  auth/                guest sessions, wallet nonce verification
  database/            repository interface + Supabase and in-memory backends
  game/                pure rules: rps, probability, stateMachine, engine
  random/              RandomnessProvider interface + 4 implementations
  security/            validation, rate limiting, CSRF, idempotency, audit
  wallet/              EIP-1193 connectors, on-chain receipt verification
services/              runService, leaderboardService, nftService, metadata
supabase/migrations/   SQL migrations + seed
tests/                 unit/ integration/ e2e/
proxy.js               refreshes the Supabase session on navigation
                       (the `middleware` convention is deprecated in Next 16)
```

**The layering rule:** `lib/game/` is pure — no I/O, no clock, no randomness. It is imported unchanged by both the client (optimistic UI) and the server (authoritative resolution), so the two can never disagree about the rules. Everything with a side effect sits behind an adapter: `RandomnessProvider`, the repository, `NftAdapter`, `MetadataStore`. Each has a working mock, which is why the app runs with zero configuration.

**The run lifecycle** is a strict state machine:

```
CREATED → AWAITING_ENTRY → ACTIVE ⇄ AWAITING_DECISION → CLAIMING → CLAIMED
                             ↓                              ↓
                           LOST                    (failure) AWAITING_DECISION
```

Invalid transitions throw a 409 rather than returning falsy — a silent no-op on a claim would be indistinguishable from success.

---

## Security notes

**Outcome integrity.** The browser decides exactly one thing: which move you throw. The opponent's move, the outcome, your level, whether a claim is permitted, and whether a mint occurs are all decided server-side and persisted there. A modified client changes nothing.

**Replay and duplication.** Layered, not single-point:
- Claim requests are idempotency-keyed, scoped to `(user, action, run)` so a key from one player cannot replay another's claim
- Every state change is a compare-and-swap (`expectedStatus`) — the loser of a race gets a 409, not a second settlement
- `game_rounds (run_id, round_number)`, `earned_rewards (run_id)`, and `nft_mints (earned_reward_id)` are unique constraints
- The client sends `expectedRoundNumber`; a stale one is rejected outright
- On chain, `ElementalArena` enforces one settlement per run and `ElementalRewards` enforces one mint per run id

**Wallet authentication.** Server-generated single-use nonce, consumed atomically (`used = false` in the update filter), bound to an address, expiring in five minutes. The signed message must contain that exact nonce and chain id, and the recovered signer must match the claimed address. **A wallet address alone is never accepted as proof of identity.**

**Transport and request integrity.** Same-origin checks on all mutating requests, `SameSite=Lax` HTTP-only cookies, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, and a restrictive `Permissions-Policy`.

**Injection.** All queries go through the Supabase client (parameterised — no string-built SQL anywhere). All input is validated with Zod schemas that use enums, not free text, wherever the value comes from a fixed set. React escapes all rendered content; the only `dangerouslySetInnerHTML` uses are SVG strings generated from fixed palettes with no user input.

**Rate limiting.** Per-route, per-IP fixed windows — tighter on expensive paths (5/hour for account deletion, 20/min for wallet verification).

**Leaderboard integrity.** Scores are computed server-side from the persisted run. There is no client write path to `leaderboard_entries` at all, and deltas are applied inside Postgres so concurrent settlements cannot clobber each other.

**Contracts.** Role-based access control, `nonReentrant` on every value-moving function, pausable, per-player nonces, custom errors, and full NatSpec. State is written before external calls in every case.

**Audit trail.** Account, wallet, run, claim, mint, and administrative events are logged with actor, IP, and metadata. Logging failures never roll back a legitimate game action.

**Secrets.** `config/server-env.js` imports `server-only`, so importing it from a client component fails the build. No secret is ever prefixed `NEXT_PUBLIC_`.

---

## Known limitations

These are real, and none of them is hidden behind a placeholder that pretends to work.

1. **On-chain minting is not wired up.** `OnChainNftAdapter` throws a clear error rather than falling back to a simulated mint. The server holds no minting key by design. Production needs either (a) the server signing an EIP-712 mint authorisation that the player submits and pays gas for, or (b) a separate signer service with a KMS-held key. Demo mode's simulated mints are labelled as such everywhere they appear.

2. **VRF randomness is unimplemented.** `VrfRandomnessProvider` throws. Commit–reveal is genuinely verifiable but the seed is still server-derived — a player must trust the server not to have generated many candidate seeds before committing. On-chain VRF removes that residual trust, and requires a deployed coordinator and an async request/fulfil round trip that turns rounds into pending operations.

3. **Rate limiting is process-local.** In-memory fixed windows. Correct for a single instance; a multi-instance deployment needs a shared store (Redis or Supabase) before the limits mean anything.

4. **WalletConnect is declared but not bundled.** The connector appears in the picker and states why it is unavailable. Enabling it needs `@walletconnect/ethereum-provider` plus a project id.

5. **The in-memory backend is not persistent.** Without Supabase, all data is lost on restart. The badge says so; the app does not pretend otherwise.

6. **Guest sessions do not survive a restart without `SESSION_SECRET`.** The fallback is a per-process key.

7. **Champion abilities are cosmetic.** The `ability` field exists and is documented as inert. The schema and engine signature already accommodate them.

8. **Entry-fee verification assumes one linked wallet.** `confirmRunEntry` checks the first linked wallet; multi-wallet accounts need the player to nominate which one pays.

9. **No seasonal rollover job.** Seasons are seeded but nothing closes one and opens the next. `expire_stale_runs()` exists but needs pg_cron or an external scheduler.

10. **These contracts are unaudited** and reimplement ERC-721 and access control without dependencies for a clean local build. Use OpenZeppelin's audited implementations before any deployment with real value.

11. **Legal pages are drafts.** Privacy, terms, and responsible-play text describes what the software does. It is not legal advice, and paid arenas carry real regulatory obligations — geo-restriction, age verification, licensing — that an operator must handle before enabling them.

---

## Roadmap

**Next**
- EIP-712 mint authorisation so players self-submit mints, removing the need for a server-held key
- Chainlink VRF (or the Ronin equivalent) behind the existing `RandomnessProvider` interface
- Redis-backed distributed rate limiting
- Bundle WalletConnect and add mobile deep links
- Seasonal rollover with automatic archiving and reward snapshots

**Later**
- Champion abilities — the deferred hook in `config/characters.js`
- Reward burning and crafting: trade duplicates upward
- Spectator mode for runs above level 10
- Secondary-market integration for the rewards collection
- Tournament arenas with fixed entry windows and prize pools
- A public, permanent randomness audit endpoint exposing every finished run's proof
- Self-exclusion tooling and configurable spend limits for paid arenas

---

## Original assets

All champions (Pyra, Aqua, Terra, Volt, Nova), all fifteen reward tiers, every name, description, palette, and mark in this project are original and generated from code in this repository. No third-party characters, artwork, branding, or copy are used anywhere.
