import { createSupabaseAdminClient } from './supabaseClients';
import { roundToRow, rowToRound, rowToRun, runPatchToRow, runToRow } from './mappers';

const unwrap = ({ data, error }, { allowMissing = false } = {}) => {
  if (error) {
    if (allowMissing && error.code === 'PGRST116') return null;
    const err = new Error(`Database error: ${error.message}`);
    err.code = error.code;
    err.status = 500;
    throw err;
  }
  return data;
};

/**
 * Supabase-backed repository. Runs under the service role inside route
 * handlers that have already established who the caller is; RLS still guards
 * every path the browser reaches directly.
 */
export class SupabaseRepository {
  constructor(client) {
    this.db = client;
  }

  get backend() {
    return 'supabase';
  }

  get persistent() {
    return true;
  }

  // ---------------------------------------------------------------- profiles
  async getProfile(userId) {
    return unwrap(
      await this.db.from('profiles').select('*').eq('id', userId).maybeSingle(),
      { allowMissing: true }
    );
  }

  async upsertProfile(profile) {
    return unwrap(
      await this.db
        .from('profiles')
        .upsert({ ...profile, updated_at: new Date().toISOString() }, { onConflict: 'id' })
        .select()
        .single()
    );
  }

  async deleteProfile(userId, { anonymize = true } = {}) {
    await this.db.from('linked_wallets').delete().eq('user_id', userId);
    if (!anonymize) {
      await this.db.from('profiles').delete().eq('id', userId);
      return null;
    }
    return unwrap(
      await this.db
        .from('profiles')
        .update({
          display_name: 'Deleted Challenger',
          email: null,
          avatar_seed: 'deleted',
          deleted_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId)
        .select()
        .single()
    );
  }

  // ----------------------------------------------------------------- wallets
  async listWallets(userId) {
    return unwrap(await this.db.from('linked_wallets').select('*').eq('user_id', userId)) || [];
  }

  async findWalletByAddress(address) {
    return unwrap(
      await this.db.from('linked_wallets').select('*').eq('address', address.toLowerCase()).maybeSingle(),
      { allowMissing: true }
    );
  }

  async linkWallet({ userId, address, chainId, label = null, isPrimary = false }) {
    return unwrap(
      await this.db
        .from('linked_wallets')
        .insert({
          user_id: userId,
          address: address.toLowerCase(),
          chain_id: chainId,
          label,
          is_primary: isPrimary,
        })
        .select()
        .single()
    );
  }

  async unlinkWallet({ userId, address }) {
    const { error } = await this.db
      .from('linked_wallets')
      .delete()
      .eq('user_id', userId)
      .eq('address', address.toLowerCase());
    return !error;
  }

  // -------------------------------------------------------------------- runs
  async createRun(run) {
    const row = unwrap(await this.db.from('game_runs').insert(runToRow(run)).select().single());
    return rowToRun(row);
  }

  async getRun(runId) {
    const row = unwrap(
      await this.db.from('game_runs').select('*').eq('id', runId).maybeSingle(),
      { allowMissing: true }
    );
    return rowToRun(row);
  }

  /**
   * Conditional update. `expectedStatus` becomes an `eq('status', ...)` filter,
   * which makes the write a compare-and-swap: a second concurrent claim for the
   * same run matches zero rows and returns null instead of double-claiming.
   */
  async updateRun(runId, patch, { expectedStatus } = {}) {
    let query = this.db
      .from('game_runs')
      .update({ ...runPatchToRow(patch), updated_at: new Date().toISOString() })
      .eq('id', runId);
    if (expectedStatus) query = query.eq('status', expectedStatus);
    const rows = unwrap(await query.select());
    return rows?.length ? rowToRun(rows[0]) : null;
  }

  async listRuns({ userId, limit = 50, roomKey = null } = {}) {
    let query = this.db
      .from('game_runs')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);
    if (roomKey) query = query.eq('room_key', roomKey);
    return (unwrap(await query) || []).map(rowToRun);
  }

  async countActiveRuns(userId) {
    const { count } = await this.db
      .from('game_runs')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .in('status', ['CREATED', 'AWAITING_ENTRY', 'ACTIVE', 'AWAITING_DECISION', 'CLAIMING']);
    return count || 0;
  }

  // ------------------------------------------------------------------ rounds
  async appendRound(round) {
    // (run_id, round_number) is UNIQUE, so a replayed request collides instead
    // of appending a duplicate round.
    const { data, error } = await this.db.from('game_rounds').insert(roundToRow(round)).select().single();
    if (error?.code === '23505') {
      const existing = unwrap(
        await this.db
          .from('game_rounds')
          .select('*')
          .eq('run_id', round.runId)
          .eq('round_number', round.roundNumber)
          .single()
      );
      return rowToRound(existing);
    }
    return rowToRound(unwrap({ data, error }));
  }

  async listRounds(runId) {
    const rows = unwrap(
      await this.db.from('game_rounds').select('*').eq('run_id', runId).order('round_number')
    );
    return (rows || []).map(rowToRound);
  }

  // ---------------------------------------------------------- earned rewards
  async findEarnedRewardByRun(runId) {
    return unwrap(
      await this.db.from('earned_rewards').select('*').eq('run_id', runId).maybeSingle(),
      { allowMissing: true }
    );
  }

  async createEarnedReward(reward) {
    const { data, error } = await this.db.from('earned_rewards').insert(reward).select().single();
    if (error?.code === '23505') return this.findEarnedRewardByRun(reward.run_id);
    return unwrap({ data, error });
  }

  async listEarnedRewards({ userId, limit = 200 } = {}) {
    return (
      unwrap(
        await this.db
          .from('earned_rewards')
          .select('*')
          .eq('user_id', userId)
          .order('earned_at', { ascending: false })
          .limit(limit)
      ) || []
    );
  }

  async updateEarnedReward(id, patch) {
    return unwrap(await this.db.from('earned_rewards').update(patch).eq('id', id).select().single());
  }

  // --------------------------------------------------------------- nft mints
  async findMintByReward(rewardId) {
    return unwrap(
      await this.db.from('nft_mints').select('*').eq('earned_reward_id', rewardId).maybeSingle(),
      { allowMissing: true }
    );
  }

  async createMint(mint) {
    const { data, error } = await this.db.from('nft_mints').insert(mint).select().single();
    if (error?.code === '23505') return this.findMintByReward(mint.earned_reward_id);
    return unwrap({ data, error });
  }

  async updateMint(id, patch) {
    return unwrap(
      await this.db
        .from('nft_mints')
        .update({ ...patch, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single()
    );
  }

  async listMints(userId) {
    return unwrap(await this.db.from('nft_mints').select('*').eq('user_id', userId)) || [];
  }

  // ------------------------------------------------------------- leaderboard
  async upsertLeaderboardEntry({ userId, seasonId, displayName, patch }) {
    // Deltas are applied inside Postgres so concurrent run settlements cannot
    // clobber each other's score with a read-modify-write race.
    const { data, error } = await this.db.rpc('apply_leaderboard_delta', {
      p_user_id: userId,
      p_season_id: seasonId,
      p_display_name: displayName,
      p_score_delta: patch.scoreDelta || 0,
      p_wins_delta: patch.winsDelta || 0,
      p_runs_delta: patch.runsDelta || 0,
      p_nfts_delta: patch.nftsDelta || 0,
      p_streak: patch.streak || 0,
      p_level: patch.level || 0,
    });
    return unwrap({ data, error });
  }

  async listLeaderboard({ seasonId = null, limit = 100 } = {}) {
    let query = this.db
      .from('leaderboard_entries')
      .select('*')
      .order('score', { ascending: false })
      .limit(limit);
    if (seasonId) query = query.eq('season_id', seasonId);
    return unwrap(await query) || [];
  }

  async getLeaderboardEntry({ userId, seasonId }) {
    return unwrap(
      await this.db
        .from('leaderboard_entries')
        .select('*')
        .eq('user_id', userId)
        .eq('season_id', seasonId)
        .maybeSingle(),
      { allowMissing: true }
    );
  }

  // ------------------------------------------------------------ wallet nonce
  async createNonce({ nonce, address, expiresAt, purpose = 'wallet-auth' }) {
    unwrap(
      await this.db
        .from('wallet_nonces')
        .insert({ nonce, address: address?.toLowerCase() || null, purpose, expires_at: expiresAt })
        .select()
        .single()
    );
    return { nonce, expiresAt };
  }

  async consumeNonce(nonce) {
    // Single-use enforced by the `used = false` filter: the second request to
    // present the same nonce updates zero rows.
    const rows = unwrap(
      await this.db
        .from('wallet_nonces')
        .update({ used: true, used_at: new Date().toISOString() })
        .eq('nonce', nonce)
        .eq('used', false)
        .gt('expires_at', new Date().toISOString())
        .select()
    );
    if (!rows?.length) return null;
    const row = rows[0];
    return { ...row, expiresAt: row.expires_at };
  }

  // -------------------------------------------------------------- audit logs
  async appendAudit(entry) {
    return unwrap(await this.db.from('audit_logs').insert(entry).select().single());
  }

  async listAudit({ userId, limit = 100 } = {}) {
    let query = this.db.from('audit_logs').select('*').order('created_at', { ascending: false }).limit(limit);
    if (userId) query = query.eq('user_id', userId);
    return unwrap(await query) || [];
  }

  // ------------------------------------------------------------ idempotency
  async getIdempotentResult(key) {
    const row = unwrap(
      await this.db
        .from('idempotency_keys')
        .select('*')
        .eq('key', key)
        .gt('expires_at', new Date().toISOString())
        .maybeSingle(),
      { allowMissing: true }
    );
    return row?.result || null;
  }

  async saveIdempotentResult(key, result, ttlMs = 15 * 60 * 1000) {
    await this.db.from('idempotency_keys').upsert(
      { key, result, expires_at: new Date(Date.now() + ttlMs).toISOString() },
      { onConflict: 'key' }
    );
    return result;
  }

  // ------------------------------------------------------- deletion requests
  async createDeletionRequest({ userId, reason }) {
    return unwrap(
      await this.db
        .from('account_deletion_requests')
        .insert({ user_id: userId, reason: reason || null, status: 'PENDING' })
        .select()
        .single()
    );
  }

  async completeDeletionRequest(id) {
    return unwrap(
      await this.db
        .from('account_deletion_requests')
        .update({ status: 'COMPLETED', completed_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single()
    );
  }

  async seedDemoLeaderboard() {
    // Seed data lives in supabase/seed.sql for the persistent backend.
  }
}

export function createSupabaseRepository() {
  const client = createSupabaseAdminClient();
  return client ? new SupabaseRepository(client) : null;
}
