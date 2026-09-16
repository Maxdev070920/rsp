import { MAX_REWARD_LEVEL } from '@/config/env';
import { getReward } from '@/config/rewards';
import { OUTCOME, isResolved, resolveMoves } from './rps';
import { oddsSnapshot } from './probability';
import {
  RUN_ACTIONS,
  RUN_STATUS,
  actionForOutcome,
  isTerminal,
  transition,
} from './stateMachine';

/**
 * Pure run engine. Every function takes a run snapshot and returns a *new*
 * snapshot — nothing mutates, nothing touches the clock except through the
 * injected `now`, so tests stay deterministic.
 */

const clone = (run) => ({ ...run });

export function createRun({
  id,
  roomKey,
  championKey,
  opponentKey,
  entryFee = '0',
  currency = 'credits',
  mode = 'demo',
  requiresPayment = false,
  userId = null,
  isGuest = false,
  now = new Date().toISOString(),
}) {
  return {
    id,
    userId,
    isGuest,
    roomKey,
    championKey,
    opponentKey,
    mode,
    entryFee,
    currency,
    status: RUN_STATUS.CREATED,
    level: 0,
    streak: 0,
    roundNumber: 0,
    resolvedRounds: 0,
    ties: 0,
    wins: 0,
    losses: 0,
    claimedLevel: null,
    claimedAt: null,
    finishedAt: null,
    requiresPayment,
    entryTxHash: null,
    createdAt: now,
    updatedAt: now,
  };
}

export function requireEntry(run, { now = new Date().toISOString() } = {}) {
  const next = clone(run);
  next.status = transition(run.status, RUN_ACTIONS.REQUIRE_ENTRY);
  next.updatedAt = now;
  return next;
}

export function confirmEntry(run, { txHash = null, now = new Date().toISOString() } = {}) {
  const next = clone(run);
  next.status = transition(run.status, RUN_ACTIONS.CONFIRM_ENTRY);
  next.entryTxHash = txHash;
  next.updatedAt = now;
  return next;
}

/**
 * Resolve one game round. `opponentMove` must already have been produced by a
 * RandomnessProvider — the engine never generates randomness itself, which is
 * what makes it safe to run identically on client and server.
 */
export function playRound(run, { playerMove, opponentMove, proof = null, now = new Date().toISOString() }) {
  if (run.status !== RUN_STATUS.ACTIVE) {
    // Surfaces as a 409 rather than silently scoring a round in a dead run.
    transition(run.status, RUN_ACTIONS.PLAY_WIN);
  }

  const outcome = resolveMoves(playerMove, opponentMove);
  const resolved = isResolved(outcome);
  const next = clone(run);

  next.roundNumber = run.roundNumber + 1;
  next.updatedAt = now;

  if (outcome === OUTCOME.TIE) {
    next.ties = run.ties + 1;
    // A tie repeats the same reward level: level and streak are untouched.
  } else if (outcome === OUTCOME.WIN) {
    next.resolvedRounds = run.resolvedRounds + 1;
    next.wins = run.wins + 1;
    next.level = Math.min(run.level + 1, MAX_REWARD_LEVEL);
    next.streak = run.streak + 1;
  } else {
    next.resolvedRounds = run.resolvedRounds + 1;
    next.losses = run.losses + 1;
    next.streak = 0;
    next.finishedAt = now;
  }

  next.status = transition(run.status, actionForOutcome(outcome, next.level, MAX_REWARD_LEVEL));

  // Winning level 15 auto-claims: the engine records the claimed level here so
  // no separate client call is required (or possible).
  const autoClaimed = outcome === OUTCOME.WIN && next.level >= MAX_REWARD_LEVEL;
  if (autoClaimed) next.claimedLevel = next.level;

  const round = {
    runId: run.id,
    roundNumber: next.roundNumber,
    levelBefore: run.level,
    levelAfter: next.level,
    playerMove,
    opponentMove,
    outcome,
    resolved,
    proof,
    createdAt: now,
  };

  return { run: next, round, outcome, resolved, autoClaimed };
}

export function chooseContinue(run, { now = new Date().toISOString() } = {}) {
  const next = clone(run);
  next.status = transition(run.status, RUN_ACTIONS.CONTINUE);
  next.updatedAt = now;
  return next;
}

export function requestClaim(run, { now = new Date().toISOString() } = {}) {
  if (run.level < 1) throw new Error('Nothing to claim: run has no resolved wins');
  const next = clone(run);
  next.status = transition(run.status, RUN_ACTIONS.CLAIM);
  next.claimedLevel = run.level;
  next.updatedAt = now;
  return next;
}

export function confirmClaim(run, { now = new Date().toISOString() } = {}) {
  const next = clone(run);
  next.status = transition(run.status, RUN_ACTIONS.CLAIM_CONFIRMED);
  next.claimedLevel = run.claimedLevel ?? run.level;
  next.claimedAt = now;
  next.finishedAt = now;
  next.updatedAt = now;
  return next;
}

export function failClaim(run, { now = new Date().toISOString() } = {}) {
  const next = clone(run);
  next.status = transition(run.status, RUN_ACTIONS.CLAIM_FAILED);
  next.updatedAt = now;
  return next;
}

export function cancelRun(run, { now = new Date().toISOString() } = {}) {
  const next = clone(run);
  next.status = transition(run.status, RUN_ACTIONS.CANCEL);
  next.finishedAt = now;
  next.updatedAt = now;
  return next;
}

export function expireRun(run, { now = new Date().toISOString() } = {}) {
  const next = clone(run);
  next.status = transition(run.status, RUN_ACTIONS.EXPIRE);
  next.finishedAt = now;
  next.updatedAt = now;
  return next;
}

/** Everything the HUD renders, derived rather than stored. */
export function runView(run) {
  const odds = oddsSnapshot(run.level);
  const currentReward = run.level >= 1 ? getReward(run.level) : null;
  const nextReward = run.level < MAX_REWARD_LEVEL ? getReward(run.level + 1) : null;
  const atRisk = run.status === RUN_STATUS.AWAITING_DECISION ? currentReward : null;

  return {
    ...run,
    odds,
    currentReward,
    nextReward,
    // Only meaningful between a win and the player's next decision: this is the
    // reward that disappears entirely if they continue and then lose.
    amountAtRisk: atRisk,
    canPlay: run.status === RUN_STATUS.ACTIVE,
    canDecide: run.status === RUN_STATUS.AWAITING_DECISION,
    isFinished: isTerminal(run.status),
    maxLevel: MAX_REWARD_LEVEL,
  };
}
