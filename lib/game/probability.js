import { MAX_REWARD_LEVEL } from '@/config/env';

/**
 * Displayed odds model: each resolved round is a fair coin, because ties are
 * replayed and count as neither a win nor a loss. So the chance of reaching
 * reward level n from the start of a run is 1 / 2^n.
 */

export function probabilityOfLevel(level) {
  if (!Number.isInteger(level) || level < 0) {
    throw new Error(`Level must be a non-negative integer, received ${String(level)}`);
  }
  return 1 / Math.pow(2, level);
}

/** Chance of surviving from `fromLevel` all the way to `toLevel`. */
export function conditionalProbability(fromLevel, toLevel) {
  if (toLevel < fromLevel) throw new Error('toLevel must be >= fromLevel');
  return 1 / Math.pow(2, toLevel - fromLevel);
}

export const oddsLabel = (probability) => {
  if (probability >= 1) return 'certain';
  return `1 in ${Math.round(1 / probability).toLocaleString()}`;
};

export const percentLabel = (probability) => {
  const pct = probability * 100;
  if (pct >= 10) return `${pct.toFixed(1)}%`;
  if (pct >= 0.1) return `${pct.toFixed(2)}%`;
  if (pct >= 0.001) return `${pct.toFixed(4)}%`;
  return `${pct.toExponential(2)}%`;
};

/**
 * Everything the odds panel needs for a run currently sitting at `level`.
 */
export function oddsSnapshot(level) {
  const atMax = level >= MAX_REWARD_LEVEL;
  const current = probabilityOfLevel(level);
  const next = atMax ? null : probabilityOfLevel(level + 1);
  return {
    level,
    nextLevel: atMax ? null : level + 1,
    currentProbability: current,
    currentOdds: oddsLabel(current),
    currentPercent: percentLabel(current),
    nextProbability: next,
    nextOdds: next === null ? null : oddsLabel(next),
    nextPercent: next === null ? null : percentLabel(next),
    // Each resolved round is a fair coin flip, hence a flat 50% to advance one step.
    singleRoundWinProbability: 0.5,
    atMaxLevel: atMax,
  };
}
