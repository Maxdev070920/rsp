/**
 * Pure Rock-Paper-Scissors resolution. No I/O, no randomness, no dates.
 * Imported unchanged by the client (optimistic UI) and by the server route
 * handlers (authoritative result), so the two can never disagree on rules.
 */

export const MOVES = Object.freeze(['rock', 'paper', 'scissors']);

export const MOVE_LABELS = Object.freeze({
  rock: 'Rock',
  paper: 'Paper',
  scissors: 'Scissors',
});

/** move -> the move it defeats */
const DEFEATS = Object.freeze({
  rock: 'scissors',
  scissors: 'paper',
  paper: 'rock',
});

export const OUTCOME = Object.freeze({
  WIN: 'win',
  LOSS: 'loss',
  TIE: 'tie',
});

export const isValidMove = (move) => MOVES.includes(move);

export function assertValidMove(move, label = 'move') {
  if (!isValidMove(move)) {
    throw new Error(`Invalid ${label}: ${String(move)}`);
  }
  return move;
}

/**
 * @returns {'win'|'loss'|'tie'} result from the player's perspective.
 */
export function resolveMoves(playerMove, opponentMove) {
  assertValidMove(playerMove, 'player move');
  assertValidMove(opponentMove, 'opponent move');

  if (playerMove === opponentMove) return OUTCOME.TIE;
  return DEFEATS[playerMove] === opponentMove ? OUTCOME.WIN : OUTCOME.LOSS;
}

/** A tie is a *game round* but not a *resolved round*: it replays the level. */
export const isResolved = (outcome) => outcome !== OUTCOME.TIE;

export const beats = (move) => DEFEATS[move];
export const losesTo = (move) => MOVES.find((m) => DEFEATS[m] === move);

/** Maps a uniform integer onto a move. Used by every randomness provider. */
export function moveFromIndex(index) {
  const normalized = ((Math.trunc(index) % MOVES.length) + MOVES.length) % MOVES.length;
  return MOVES[normalized];
}
