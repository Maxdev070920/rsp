import { describe, expect, it } from 'vitest';
import {
  conditionalProbability,
  oddsLabel,
  oddsSnapshot,
  percentLabel,
  probabilityOfLevel,
} from '@/lib/game/probability';

describe('probability model', () => {
  it('uses 1 / 2^n for reaching level n', () => {
    expect(probabilityOfLevel(0)).toBe(1);
    expect(probabilityOfLevel(1)).toBe(0.5);
    expect(probabilityOfLevel(5)).toBeCloseTo(1 / 32, 12);
    expect(probabilityOfLevel(10)).toBeCloseTo(1 / 1024, 12);
    expect(probabilityOfLevel(15)).toBeCloseTo(1 / 32768, 12);
  });

  it('rejects invalid levels', () => {
    expect(() => probabilityOfLevel(-1)).toThrow();
    expect(() => probabilityOfLevel(1.5)).toThrow();
  });

  it('computes conditional survival between levels', () => {
    expect(conditionalProbability(3, 3)).toBe(1);
    expect(conditionalProbability(3, 4)).toBe(0.5);
    expect(conditionalProbability(0, 10)).toBeCloseTo(1 / 1024, 12);
    expect(() => conditionalProbability(5, 4)).toThrow();
  });

  it('formats odds and percentages readably', () => {
    expect(oddsLabel(1)).toBe('certain');
    expect(oddsLabel(1 / 1024)).toBe('1 in 1,024');
    expect(percentLabel(0.5)).toBe('50.0%');
    expect(percentLabel(1 / 32768)).toContain('%');
  });

  it('produces a complete snapshot for the HUD', () => {
    const snapshot = oddsSnapshot(4);
    expect(snapshot.level).toBe(4);
    expect(snapshot.nextLevel).toBe(5);
    expect(snapshot.currentOdds).toBe('1 in 16');
    expect(snapshot.nextOdds).toBe('1 in 32');
    expect(snapshot.singleRoundWinProbability).toBe(0.5);
    expect(snapshot.atMaxLevel).toBe(false);
  });

  it('reports no next level at the top of the ladder', () => {
    const snapshot = oddsSnapshot(15);
    expect(snapshot.atMaxLevel).toBe(true);
    expect(snapshot.nextLevel).toBeNull();
    expect(snapshot.nextProbability).toBeNull();
  });
});
