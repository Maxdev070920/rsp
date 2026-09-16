/**
 * Authoritative run state machine.
 *
 * Every transition the API performs goes through `transition()`, which throws
 * an `InvalidTransitionError` rather than returning a falsy value — a silent
 * no-op here would be indistinguishable from a successful claim.
 */

export const RUN_STATUS = Object.freeze({
  CREATED: 'CREATED',
  AWAITING_ENTRY: 'AWAITING_ENTRY',
  ACTIVE: 'ACTIVE',
  AWAITING_DECISION: 'AWAITING_DECISION',
  CLAIMING: 'CLAIMING',
  CLAIMED: 'CLAIMED',
  LOST: 'LOST',
  CANCELLED: 'CANCELLED',
  EXPIRED: 'EXPIRED',
});

export const RUN_ACTIONS = Object.freeze({
  REQUIRE_ENTRY: 'REQUIRE_ENTRY',
  CONFIRM_ENTRY: 'CONFIRM_ENTRY',
  PLAY_TIE: 'PLAY_TIE',
  PLAY_WIN: 'PLAY_WIN',
  PLAY_WIN_FINAL: 'PLAY_WIN_FINAL',
  PLAY_LOSS: 'PLAY_LOSS',
  CONTINUE: 'CONTINUE',
  CLAIM: 'CLAIM',
  CLAIM_CONFIRMED: 'CLAIM_CONFIRMED',
  CLAIM_FAILED: 'CLAIM_FAILED',
  CANCEL: 'CANCEL',
  EXPIRE: 'EXPIRE',
});

const S = RUN_STATUS;
const A = RUN_ACTIONS;

const TRANSITIONS = Object.freeze({
  [S.CREATED]: {
    [A.REQUIRE_ENTRY]: S.AWAITING_ENTRY,
    [A.CONFIRM_ENTRY]: S.ACTIVE, // free rooms skip the payment step
    [A.CANCEL]: S.CANCELLED,
    [A.EXPIRE]: S.EXPIRED,
  },
  [S.AWAITING_ENTRY]: {
    [A.CONFIRM_ENTRY]: S.ACTIVE,
    [A.CANCEL]: S.CANCELLED,
    [A.EXPIRE]: S.EXPIRED,
  },
  [S.ACTIVE]: {
    [A.PLAY_TIE]: S.ACTIVE,
    [A.PLAY_WIN]: S.AWAITING_DECISION,
    [A.PLAY_WIN_FINAL]: S.CLAIMING, // level 15 claims itself
    [A.PLAY_LOSS]: S.LOST,
    [A.CANCEL]: S.CANCELLED,
    [A.EXPIRE]: S.EXPIRED,
  },
  [S.AWAITING_DECISION]: {
    [A.CONTINUE]: S.ACTIVE,
    [A.CLAIM]: S.CLAIMING,
    [A.EXPIRE]: S.EXPIRED,
  },
  [S.CLAIMING]: {
    [A.CLAIM_CONFIRMED]: S.CLAIMED,
    // A failed mint returns the player to the decision point so they can retry
    // the claim. It must never drop them back into ACTIVE, which would put an
    // already-won reward back at risk without the player choosing to continue.
    [A.CLAIM_FAILED]: S.AWAITING_DECISION,
    [A.EXPIRE]: S.EXPIRED,
  },
  [S.CLAIMED]: {},
  [S.LOST]: {},
  [S.CANCELLED]: {},
  [S.EXPIRED]: {},
});

export const TERMINAL_STATUSES = Object.freeze([S.CLAIMED, S.LOST, S.CANCELLED, S.EXPIRED]);

export class InvalidTransitionError extends Error {
  constructor(from, action) {
    super(`Invalid run transition: cannot ${action} while run is ${from}`);
    this.name = 'InvalidTransitionError';
    this.code = 'INVALID_TRANSITION';
    this.from = from;
    this.action = action;
    this.status = 409;
  }
}

export const isTerminal = (status) => TERMINAL_STATUSES.includes(status);

export const canTransition = (from, action) => Boolean(TRANSITIONS[from]?.[action]);

export function transition(from, action) {
  const next = TRANSITIONS[from]?.[action];
  if (!next) throw new InvalidTransitionError(from, action);
  return next;
}

export const allowedActions = (from) => Object.keys(TRANSITIONS[from] || {});

/** Maps a round outcome plus the resulting level onto the correct action. */
export function actionForOutcome(outcome, nextLevel, maxLevel) {
  if (outcome === 'tie') return A.PLAY_TIE;
  if (outcome === 'loss') return A.PLAY_LOSS;
  return nextLevel >= maxLevel ? A.PLAY_WIN_FINAL : A.PLAY_WIN;
}
