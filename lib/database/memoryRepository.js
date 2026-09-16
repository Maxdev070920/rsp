import { randomUUID } from 'node:crypto';

/**
 * In-memory repository.
 *
 * Used whenever Supabase credentials are absent so that Practice Arena — and
 * every API route — stays fully playable with zero external configuration.
 * Data lives for the lifetime of the server process only.
 *
 * It implements exactly the same surface as `SupabaseRepository`; both are
 * consumed only through `getRepository()`.
 */

const db = globalThis.__ERA_MEMORY_DB__ || {
  profiles: new Map(),
  wallets: new Map(),
  runs: new Map(),
  rounds: new Map(), // runId -> round[]
  earnedRewards: new Map(),
  nftMints: new Map(),
  leaderboard: new Map(), // `${userId}:${seasonId}` -> entry
  nonces: new Map(),
  auditLogs: [],
  idempotency: new Map(),
  deletionRequests: new Map(),
  seeded: false,
};
globalThis.__ERA_MEMORY_DB__ = db;

/** Test helper: wipes every in-memory collection between test cases. */
export function resetMemoryDb() {
  db.profiles.clear();
  db.wallets.clear();
  db.runs.clear();
  db.rounds.clear();
  db.earnedRewards.clear();
  db.nftMints.clear();
  db.leaderboard.clear();
  db.nonces.clear();
  db.idempotency.clear();
  db.deletionRequests.clear();
  db.auditLogs.length = 0;
  db.seeded = false;
}

const nowIso = () => new Date().toISOString();
const clone = (value) => (value == null ? value : JSON.parse(JSON.stringify(value)));

export class MemoryRepository {
  get backend() {
    return 'memory';
  }

  get persistent() {
    return false;
  }

  // ---------------------------------------------------------------- profiles
  async getProfile(userId) {
    return clone(db.profiles.get(userId)) || null;
  }

  async upsertProfile(profile) {
    const existing = db.profiles.get(profile.id) || {};
    const merged = {
      id: profile.id,
      display_name: profile.display_name ?? existing.display_name ?? 'Challenger',
      avatar_seed: profile.avatar_seed ?? existing.avatar_seed ?? profile.id,
      champion_key: profile.champion_key ?? existing.champion_key ?? 'pyra',
      is_guest: profile.is_guest ?? existing.is_guest ?? false,
      email: profile.email ?? existing.email ?? null,
      credits: profile.credits ?? existing.credits ?? 1000,
      created_at: existing.created_at || nowIso(),
      updated_at: nowIso(),
      deleted_at: profile.deleted_at ?? existing.deleted_at ?? null,
    };
    db.profiles.set(merged.id, merged);
    return clone(merged);
  }

  async deleteProfile(userId, { anonymize = true } = {}) {
    const existing = db.profiles.get(userId);
    if (!existing) return null;
    if (anonymize) {
      const anonymized = {
        ...existing,
        display_name: 'Deleted Challenger',
        email: null,
        avatar_seed: 'deleted',
        deleted_at: nowIso(),
        updated_at: nowIso(),
      };
      db.profiles.set(userId, anonymized);
      for (const [key, wallet] of db.wallets) {
        if (wallet.user_id === userId) db.wallets.delete(key);
      }
      return clone(anonymized);
    }
    db.profiles.delete(userId);
    return null;
  }

  // ----------------------------------------------------------------- wallets
  async listWallets(userId) {
    return [...db.wallets.values()].filter((w) => w.user_id === userId).map(clone);
  }

  async findWalletByAddress(address) {
    return clone(db.wallets.get(address.toLowerCase())) || null;
  }

  async linkWallet({ userId, address, chainId, label = null, isPrimary = false }) {
    const key = address.toLowerCase();
    const entry = {
      id: randomUUID(),
      user_id: userId,
      address: key,
      chain_id: chainId,
      label,
      is_primary: isPrimary,
      linked_at: nowIso(),
    };
    db.wallets.set(key, entry);
    return clone(entry);
  }

  async unlinkWallet({ userId, address }) {
    const key = address.toLowerCase();
    const entry = db.wallets.get(key);
    if (!entry || entry.user_id !== userId) return false;
    db.wallets.delete(key);
    return true;
  }

  // -------------------------------------------------------------------- runs
  async createRun(run) {
    const record = { ...run, created_at: run.createdAt || nowIso() };
    db.runs.set(run.id, record);
    db.rounds.set(run.id, []);
    return clone(record);
  }

  async getRun(runId) {
    return clone(db.runs.get(runId)) || null;
  }

  async updateRun(runId, patch, { expectedStatus } = {}) {
    const existing = db.runs.get(runId);
    if (!existing) return null;
    // Optimistic guard mirroring the Supabase `eq('status', expected)` clause:
    // two concurrent claims for the same run cannot both succeed.
    if (expectedStatus && existing.status !== expectedStatus) return null;
    const merged = { ...existing, ...patch, updatedAt: nowIso() };
    db.runs.set(runId, merged);
    return clone(merged);
  }

  async listRuns({ userId, limit = 50, roomKey = null } = {}) {
    return [...db.runs.values()]
      .filter((r) => r.userId === userId && (!roomKey || r.roomKey === roomKey))
      .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))
      .slice(0, limit)
      .map(clone);
  }

  async countActiveRuns(userId) {
    return [...db.runs.values()].filter(
      (r) => r.userId === userId && ['CREATED', 'AWAITING_ENTRY', 'ACTIVE', 'AWAITING_DECISION', 'CLAIMING'].includes(r.status)
    ).length;
  }

  // ------------------------------------------------------------------ rounds
  async appendRound(round) {
    const list = db.rounds.get(round.runId) || [];
    if (list.some((r) => r.roundNumber === round.roundNumber)) {
      return clone(list.find((r) => r.roundNumber === round.roundNumber));
    }
    const record = { id: randomUUID(), ...round };
    list.push(record);
    db.rounds.set(round.runId, list);
    return clone(record);
  }

  async listRounds(runId) {
    return (db.rounds.get(runId) || []).map(clone);
  }

  // ---------------------------------------------------------- earned rewards
  async findEarnedRewardByRun(runId) {
    return [...db.earnedRewards.values()].find((r) => r.run_id === runId) || null;
  }

  async createEarnedReward(reward) {
    const existing = await this.findEarnedRewardByRun(reward.run_id);
    if (existing) return clone(existing); // one reward per run, always
    const record = { id: randomUUID(), earned_at: nowIso(), ...reward };
    db.earnedRewards.set(record.id, record);
    return clone(record);
  }

  async listEarnedRewards({ userId, limit = 200 } = {}) {
    return [...db.earnedRewards.values()]
      .filter((r) => r.user_id === userId)
      .sort((a, b) => String(b.earned_at).localeCompare(String(a.earned_at)))
      .slice(0, limit)
      .map(clone);
  }

  async updateEarnedReward(id, patch) {
    const existing = db.earnedRewards.get(id);
    if (!existing) return null;
    const merged = { ...existing, ...patch };
    db.earnedRewards.set(id, merged);
    return clone(merged);
  }

  // --------------------------------------------------------------- nft mints
  async findMintByReward(rewardId) {
    return clone([...db.nftMints.values()].find((m) => m.earned_reward_id === rewardId)) || null;
  }

  async createMint(mint) {
    const existing = await this.findMintByReward(mint.earned_reward_id);
    if (existing) return clone(existing); // duplicate-mint guard
    const record = { id: randomUUID(), created_at: nowIso(), ...mint };
    db.nftMints.set(record.id, record);
    return clone(record);
  }

  async updateMint(id, patch) {
    const existing = db.nftMints.get(id);
    if (!existing) return null;
    const merged = { ...existing, ...patch, updated_at: nowIso() };
    db.nftMints.set(id, merged);
    return clone(merged);
  }

  async listMints(userId) {
    return [...db.nftMints.values()].filter((m) => m.user_id === userId).map(clone);
  }

  // ------------------------------------------------------------- leaderboard
  async upsertLeaderboardEntry({ userId, seasonId, displayName, patch }) {
    const key = `${userId}:${seasonId}`;
    const existing = db.leaderboard.get(key) || {
      user_id: userId,
      season_id: seasonId,
      display_name: displayName,
      score: 0,
      total_wins: 0,
      total_runs: 0,
      longest_streak: 0,
      highest_level: 0,
      nfts_collected: 0,
      updated_at: nowIso(),
    };
    const merged = {
      ...existing,
      display_name: displayName || existing.display_name,
      score: existing.score + (patch.scoreDelta || 0),
      total_wins: existing.total_wins + (patch.winsDelta || 0),
      total_runs: existing.total_runs + (patch.runsDelta || 0),
      nfts_collected: existing.nfts_collected + (patch.nftsDelta || 0),
      longest_streak: Math.max(existing.longest_streak, patch.streak || 0),
      highest_level: Math.max(existing.highest_level, patch.level || 0),
      updated_at: nowIso(),
    };
    db.leaderboard.set(key, merged);
    return clone(merged);
  }

  async listLeaderboard({ seasonId = null, limit = 100 } = {}) {
    return [...db.leaderboard.values()]
      .filter((e) => !seasonId || e.season_id === seasonId)
      .sort((a, b) => b.score - a.score || b.highest_level - a.highest_level)
      .slice(0, limit)
      .map(clone);
  }

  async getLeaderboardEntry({ userId, seasonId }) {
    return clone(db.leaderboard.get(`${userId}:${seasonId}`)) || null;
  }

  // ------------------------------------------------------------ wallet nonce
  async createNonce({ nonce, address, expiresAt, purpose = 'wallet-auth' }) {
    db.nonces.set(nonce, { nonce, address: address?.toLowerCase() || null, purpose, expiresAt, used: false, created_at: nowIso() });
    return { nonce, expiresAt };
  }

  async consumeNonce(nonce) {
    const entry = db.nonces.get(nonce);
    if (!entry || entry.used) return null;
    if (new Date(entry.expiresAt).getTime() < Date.now()) {
      db.nonces.delete(nonce);
      return null;
    }
    entry.used = true;
    db.nonces.set(nonce, entry);
    return clone(entry);
  }

  // -------------------------------------------------------------- audit logs
  async appendAudit(entry) {
    const record = { id: randomUUID(), created_at: nowIso(), ...entry };
    db.auditLogs.push(record);
    if (db.auditLogs.length > 5000) db.auditLogs.shift();
    return clone(record);
  }

  async listAudit({ userId, limit = 100 } = {}) {
    return db.auditLogs
      .filter((e) => !userId || e.user_id === userId)
      .slice(-limit)
      .reverse()
      .map(clone);
  }

  // ------------------------------------------------------------ idempotency
  async getIdempotentResult(key) {
    const entry = db.idempotency.get(key);
    if (!entry) return null;
    if (entry.expiresAt < Date.now()) {
      db.idempotency.delete(key);
      return null;
    }
    return clone(entry.result);
  }

  async saveIdempotentResult(key, result, ttlMs = 15 * 60 * 1000) {
    db.idempotency.set(key, { result, expiresAt: Date.now() + ttlMs });
    return clone(result);
  }

  // ------------------------------------------------------- deletion requests
  async createDeletionRequest({ userId, reason }) {
    const record = {
      id: randomUUID(),
      user_id: userId,
      reason: reason || null,
      status: 'PENDING',
      requested_at: nowIso(),
      completed_at: null,
    };
    db.deletionRequests.set(record.id, record);
    return clone(record);
  }

  async completeDeletionRequest(id) {
    const existing = db.deletionRequests.get(id);
    if (!existing) return null;
    const merged = { ...existing, status: 'COMPLETED', completed_at: nowIso() };
    db.deletionRequests.set(id, merged);
    return clone(merged);
  }

  // -------------------------------------------------------------- dev seeding
  async seedDemoLeaderboard(entries) {
    if (db.seeded) return;
    db.seeded = true;
    for (const entry of entries) {
      db.leaderboard.set(`${entry.user_id}:${entry.season_id}`, { ...entry, updated_at: nowIso() });
    }
  }
}
