import { randomUUID } from 'node:crypto';
import { MAX_REWARD_LEVEL, isBlockchainMode, publicEnv } from '@/config/env';
import { getRoom } from '@/config/rooms';
import { getReward } from '@/config/rewards';
import { opponentFor } from '@/config/characters';
import {
  chooseContinue,
  confirmClaim,
  confirmEntry,
  createRun,
  playRound as enginePlayRound,
  requestClaim,
  requireEntry,
  runView,
} from '@/lib/game/engine';
import { RUN_STATUS } from '@/lib/game/stateMachine';
import { getRandomnessProvider, describeRandomness } from '@/lib/random';
import { getRepository } from '@/lib/database/repository';
import { AUDIT_EVENTS, audit } from '@/lib/security/audit';
import { AppError, conflict, forbidden, notFound } from '@/lib/security/errors';
import { verifyEntryPayment } from '@/lib/wallet/chainVerifier';
import { mintReward } from './nftService';
import { recordRunResult } from './leaderboardService';

const MAX_CONCURRENT_RUNS = 3;

/** Fee, network, and risk disclosure shown before any payment is requested. */
export function quoteRoom(roomKey) {
  const room = getRoom(roomKey);
  if (!room) throw notFound('Unknown arena.');
  return {
    room,
    entryFee: room.entryFee,
    currency: room.currency,
    estimatedNetworkFee: room.usesVirtualCredits ? '0' : publicEnv.estimatedGasNative,
    maximumLoss: room.usesVirtualCredits ? '0' : room.entryFee,
    network: room.usesVirtualCredits ? 'off-chain' : publicEnv.chainId,
    mode: isBlockchainMode ? 'blockchain' : 'demo',
    mintsNft: room.mintsNft && isBlockchainMode,
    randomness: describeRandomness(),
    rewards: {
      first: getReward(1),
      final: getReward(MAX_REWARD_LEVEL),
    },
  };
}

export async function startRun({ actor, roomKey, championKey, ip }) {
  const room = getRoom(roomKey);
  if (!room) throw notFound('Unknown arena.');

  if (room.requiresWallet && isBlockchainMode) {
    const wallets = await getRepository().listWallets(actor.userId);
    if (!wallets.length) {
      throw forbidden('Link a wallet before entering a paid arena.');
    }
  }
  if (room.requiresWallet && actor.isGuest && isBlockchainMode) {
    throw forbidden('Create an account before entering a paid arena.');
  }

  const repo = getRepository();
  const active = await repo.countActiveRuns(actor.userId);
  if (active >= MAX_CONCURRENT_RUNS) {
    throw conflict('You already have runs in progress. Finish or abandon one first.', 'TOO_MANY_ACTIVE_RUNS');
  }

  const id = randomUUID();
  const provider = getRandomnessProvider();
  const commitment = await provider.createCommitment(id);

  // Payment is only required when a paid room is played against a real chain.
  // In demo mode paid rooms are settled with simulated currency.
  const requiresPayment = room.requiresWallet && isBlockchainMode;

  let run = createRun({
    id,
    userId: actor.userId,
    isGuest: actor.isGuest,
    roomKey: room.key,
    championKey,
    opponentKey: opponentFor(championKey, id.charCodeAt(0)).key,
    entryFee: room.entryFee,
    currency: room.currency,
    mode: isBlockchainMode ? 'blockchain' : 'demo',
    requiresPayment,
  });
  run.randomnessCommitment = commitment.commitment;
  run.randomnessProvider = provider.name;

  run = requiresPayment ? requireEntry(run) : confirmEntry(run);

  const saved = await repo.createRun(run);
  await audit(AUDIT_EVENTS.RUN_CREATED, {
    userId: actor.userId,
    runId: id,
    ip,
    metadata: { roomKey: room.key, requiresPayment, provider: provider.name },
  });

  return { run: runView(saved), commitment: commitment.commitment, randomness: describeRandomness() };
}

export async function confirmRunEntry({ actor, runId, txHash, ip }) {
  const repo = getRepository();
  const run = await loadOwnedRun({ repo, actor, runId });
  const room = getRoom(run.roomKey);

  if (run.status !== RUN_STATUS.AWAITING_ENTRY) {
    throw conflict('This run is not waiting for an entry payment.', 'INVALID_TRANSITION');
  }

  const wallets = await repo.listWallets(actor.userId);
  const receipt = await verifyEntryPayment({
    txHash,
    chainId: publicEnv.chainId,
    expectedFee: room.entryFee,
    expectedFrom: wallets[0]?.address,
  });

  const next = confirmEntry(run, { txHash: receipt.txHash });
  const saved = await repo.updateRun(runId, next, { expectedStatus: RUN_STATUS.AWAITING_ENTRY });
  if (!saved) throw conflict('Entry was already confirmed.', 'ALREADY_CONFIRMED');

  await audit(AUDIT_EVENTS.RUN_ENTRY_CONFIRMED, { userId: actor.userId, runId, ip, metadata: receipt });
  return { run: runView(saved), receipt };
}

async function loadOwnedRun({ repo, actor, runId }) {
  const run = await repo.getRun(runId);
  if (!run) throw notFound('Run not found.');
  // Ownership is checked on every single call — a run id is not a capability.
  if (run.userId !== actor.userId) throw forbidden('This run belongs to another player.');
  return run;
}

export async function playRound({ actor, runId, move, expectedRoundNumber, ip }) {
  const repo = getRepository();
  const run = await loadOwnedRun({ repo, actor, runId });

  if (run.status !== RUN_STATUS.ACTIVE) {
    throw conflict(
      run.status === RUN_STATUS.AWAITING_DECISION
        ? 'Claim your reward or choose to continue before throwing again.'
        : `This run is ${run.status.toLowerCase().replace('_', ' ')} and cannot accept another throw.`,
      'INVALID_TRANSITION'
    );
  }

  // Replay guard: a resent request carrying a stale round number is rejected
  // instead of being scored a second time.
  if (expectedRoundNumber !== undefined && expectedRoundNumber !== run.roundNumber) {
    throw conflict('This round has already been played.', 'ROUND_ALREADY_PLAYED');
  }

  const provider = getRandomnessProvider();
  const { move: opponentMove, proof } = await provider.nextMove({
    runId,
    roundNumber: run.roundNumber + 1,
  });

  const { run: nextRun, round, outcome, autoClaimed } = enginePlayRound(run, {
    playerMove: move,
    opponentMove,
    proof,
  });

  const saved = await repo.updateRun(runId, nextRun, { expectedStatus: RUN_STATUS.ACTIVE });
  if (!saved) throw conflict('That round was already resolved.', 'ROUND_ALREADY_PLAYED');
  await repo.appendRound(round);

  await audit(AUDIT_EVENTS.RUN_ROUND_PLAYED, {
    userId: actor.userId,
    runId,
    ip,
    metadata: { roundNumber: round.roundNumber, outcome, level: saved.level },
  });

  let settlement = null;
  if (outcome === 'loss') {
    settlement = await settleLoss({ run: saved, actor });
  } else if (autoClaimed) {
    // Level 15 claims itself; the player is never asked.
    settlement = await settleClaim({ run: saved, actor, ip, auto: true });
  }

  return {
    run: runView(settlement?.run || saved),
    round: { ...round, proof: publicProof(round.proof) },
    outcome,
    autoClaimed,
    settlement: settlement?.summary || null,
  };
}

export async function decideRun({ actor, runId, decision, ip }) {
  const repo = getRepository();
  const run = await loadOwnedRun({ repo, actor, runId });

  if (run.status !== RUN_STATUS.AWAITING_DECISION) {
    throw conflict('There is no pending decision for this run.', 'INVALID_TRANSITION');
  }

  if (decision === 'continue') {
    const next = chooseContinue(run);
    const saved = await repo.updateRun(runId, next, { expectedStatus: RUN_STATUS.AWAITING_DECISION });
    if (!saved) throw conflict('This decision was already made.', 'DECISION_ALREADY_MADE');
    return { run: runView(saved), decision: 'continue' };
  }

  const settlement = await settleClaim({ run, actor, ip, auto: false });
  return { run: runView(settlement.run), decision: 'claim', settlement: settlement.summary };
}

async function settleClaim({ run, actor, ip, auto }) {
  const repo = getRepository();

  // Compare-and-swap into CLAIMING. Whoever loses this race gets null and a
  // 409, which is what makes duplicate claims impossible even under retries.
  // An auto-claim is already in CLAIMING (the engine moved it there when level
  // 15 resolved), so it only needs the level pinned; a player claim has to make
  // the AWAITING_DECISION -> CLAIMING transition itself.
  const locked = auto
    ? await repo.updateRun(run.id, { claimedLevel: run.claimedLevel ?? run.level }, { expectedStatus: RUN_STATUS.CLAIMING })
    : await repo.updateRun(run.id, requestClaim(run), { expectedStatus: RUN_STATUS.AWAITING_DECISION });

  if (!locked) throw conflict('This reward has already been claimed.', 'ALREADY_CLAIMED');

  await audit(AUDIT_EVENTS.RUN_CLAIM_REQUESTED, {
    userId: actor.userId,
    runId: run.id,
    ip,
    metadata: { level: locked.claimedLevel, auto },
  });

  const level = locked.claimedLevel ?? locked.level;
  const definition = getReward(level);
  const room = getRoom(locked.roomKey);

  const earned = await repo.createEarnedReward({
    run_id: locked.id,
    user_id: locked.userId,
    reward_key: definition.key,
    reward_level: definition.level,
    room_key: locked.roomKey,
    artwork_tier: room.artworkTier,
    rarity_score: definition.rarityScore,
    probability: definition.probability,
    mint_status: room.mintsNft ? 'PENDING' : 'NOT_APPLICABLE',
  });

  let mint = null;
  if (room.mintsNft) {
    const wallets = await repo.listWallets(actor.userId);
    const result = await mintReward({ run: locked, earnedReward: earned, owner: wallets[0]?.address || null });
    mint = result.mint;
  }

  const confirmed = confirmClaim(locked);
  const saved = await repo.updateRun(locked.id, confirmed, { expectedStatus: RUN_STATUS.CLAIMING });

  const profile = await repo.getProfile(actor.userId);
  await recordRunResult({
    run: saved || confirmed,
    claimed: true,
    nftMinted: Boolean(mint && mint.status !== 'FAILED'),
    displayName: profile?.display_name || 'Challenger',
  });

  await audit(AUDIT_EVENTS.RUN_CLAIMED, {
    userId: actor.userId,
    runId: run.id,
    ip,
    metadata: { level, auto, minted: Boolean(mint) },
  });

  return {
    run: saved || confirmed,
    summary: {
      claimedLevel: level,
      reward: definition,
      earnedReward: earned,
      mint,
      auto,
    },
  };
}

async function settleLoss({ run, actor }) {
  const profile = await getRepository().getProfile(actor.userId);
  await recordRunResult({
    run,
    claimed: false,
    displayName: profile?.display_name || 'Challenger',
  });
  await audit(AUDIT_EVENTS.RUN_LOST, {
    userId: actor.userId,
    runId: run.id,
    metadata: { level: run.level, forfeitedLevel: run.level },
  });
  return {
    run,
    summary: {
      claimedLevel: null,
      // The reward the player was holding when they chose to continue. It is
      // forfeited in full — this is the cost of pushing on.
      forfeited: run.level >= 1 ? getReward(run.level) : null,
    },
  };
}

/** Strips anything that must not be exposed before a run ends. */
const publicProof = (proof) =>
  proof && {
    provider: proof.provider,
    mode: proof.mode,
    commitment: proof.commitment,
    roundNumber: proof.roundNumber,
    digest: proof.digest,
  };

export async function getRunDetail({ actor, runId }) {
  const repo = getRepository();
  const run = await loadOwnedRun({ repo, actor, runId });
  const rounds = await repo.listRounds(runId);
  const earned = await repo.findEarnedRewardByRun(runId);

  // The seed is only revealed once the run can no longer be influenced by it.
  const finished = [RUN_STATUS.CLAIMED, RUN_STATUS.LOST, RUN_STATUS.CANCELLED, RUN_STATUS.EXPIRED].includes(run.status);
  const reveal = finished ? await getRandomnessProvider().reveal(runId) : null;

  return {
    run: runView(run),
    rounds: rounds.map((round) => ({ ...round, proof: publicProof(round.proof) })),
    earnedReward: earned,
    randomness: { ...describeRandomness(), commitment: run.randomnessCommitment, reveal },
  };
}

export async function listRunHistory({ actor, limit = 50 }) {
  const repo = getRepository();
  const runs = await repo.listRuns({ userId: actor.userId, limit });
  const detailed = await Promise.all(
    runs.map(async (run) => ({
      ...run,
      rounds: await repo.listRounds(run.id),
      earnedReward: await repo.findEarnedRewardByRun(run.id),
    }))
  );
  return detailed;
}

export class RunServiceError extends AppError {}
