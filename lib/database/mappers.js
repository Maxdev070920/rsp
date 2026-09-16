/** Translation between engine-shaped run objects (camelCase) and SQL rows. */

export const runToRow = (run) => ({
  id: run.id,
  user_id: run.userId,
  is_guest: run.isGuest,
  room_key: run.roomKey,
  champion_key: run.championKey,
  opponent_key: run.opponentKey,
  mode: run.mode,
  entry_fee: run.entryFee,
  currency: run.currency,
  status: run.status,
  level: run.level,
  streak: run.streak,
  round_number: run.roundNumber,
  resolved_rounds: run.resolvedRounds,
  ties: run.ties,
  wins: run.wins,
  losses: run.losses,
  claimed_level: run.claimedLevel,
  claimed_at: run.claimedAt,
  finished_at: run.finishedAt,
  requires_payment: run.requiresPayment,
  entry_tx_hash: run.entryTxHash,
  randomness_commitment: run.randomnessCommitment ?? null,
  randomness_provider: run.randomnessProvider ?? null,
  created_at: run.createdAt,
  updated_at: run.updatedAt,
});

export const rowToRun = (row) =>
  row && {
    id: row.id,
    userId: row.user_id,
    isGuest: row.is_guest,
    roomKey: row.room_key,
    championKey: row.champion_key,
    opponentKey: row.opponent_key,
    mode: row.mode,
    entryFee: row.entry_fee,
    currency: row.currency,
    status: row.status,
    level: row.level,
    streak: row.streak,
    roundNumber: row.round_number,
    resolvedRounds: row.resolved_rounds,
    ties: row.ties,
    wins: row.wins,
    losses: row.losses,
    claimedLevel: row.claimed_level,
    claimedAt: row.claimed_at,
    finishedAt: row.finished_at,
    requiresPayment: row.requires_payment,
    entryTxHash: row.entry_tx_hash,
    randomnessCommitment: row.randomness_commitment,
    randomnessProvider: row.randomness_provider,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };

export const roundToRow = (round) => ({
  run_id: round.runId,
  round_number: round.roundNumber,
  level_before: round.levelBefore,
  level_after: round.levelAfter,
  player_move: round.playerMove,
  opponent_move: round.opponentMove,
  outcome: round.outcome,
  resolved: round.resolved,
  proof: round.proof,
  created_at: round.createdAt,
});

export const rowToRound = (row) =>
  row && {
    id: row.id,
    runId: row.run_id,
    roundNumber: row.round_number,
    levelBefore: row.level_before,
    levelAfter: row.level_after,
    playerMove: row.player_move,
    opponentMove: row.opponent_move,
    outcome: row.outcome,
    resolved: row.resolved,
    proof: row.proof,
    createdAt: row.created_at,
  };

/** Patches arrive engine-shaped; only translate the keys that are present. */
export const runPatchToRow = (patch) => {
  const row = runToRow({ ...patch });
  return Object.fromEntries(
    Object.entries(row).filter(([, value]) => value !== undefined)
  );
};
