import { describe, expect, it } from 'vitest';
import {
  MOVES,
  OUTCOME,
  beats,
  isResolved,
  isValidMove,
  moveFromIndex,
  resolveMoves,
} from '@/lib/game/rps';

describe('Rock–Paper–Scissors resolution', () => {
  it('resolves the three winning pairs', () => {
    expect(resolveMoves('rock', 'scissors')).toBe(OUTCOME.WIN);
    expect(resolveMoves('scissors', 'paper')).toBe(OUTCOME.WIN);
    expect(resolveMoves('paper', 'rock')).toBe(OUTCOME.WIN);
  });

  it('resolves the three losing pairs', () => {
    expect(resolveMoves('scissors', 'rock')).toBe(OUTCOME.LOSS);
    expect(resolveMoves('paper', 'scissors')).toBe(OUTCOME.LOSS);
    expect(resolveMoves('rock', 'paper')).toBe(OUTCOME.LOSS);
  });

  it('treats identical moves as a tie', () => {
    for (const move of MOVES) {
      expect(resolveMoves(move, move)).toBe(OUTCOME.TIE);
    }
  });

  it('is exhaustive: every one of the nine pairings resolves', () => {
    const results = [];
    for (const a of MOVES) {
      for (const b of MOVES) results.push(resolveMoves(a, b));
    }
    expect(results).toHaveLength(9);
    expect(results.filter((r) => r === OUTCOME.WIN)).toHaveLength(3);
    expect(results.filter((r) => r === OUTCOME.LOSS)).toHaveLength(3);
    expect(results.filter((r) => r === OUTCOME.TIE)).toHaveLength(3);
  });

  it('marks ties as unresolved and wins/losses as resolved', () => {
    expect(isResolved(OUTCOME.TIE)).toBe(false);
    expect(isResolved(OUTCOME.WIN)).toBe(true);
    expect(isResolved(OUTCOME.LOSS)).toBe(true);
  });

  it('rejects invalid moves rather than guessing', () => {
    expect(isValidMove('lizard')).toBe(false);
    expect(() => resolveMoves('lizard', 'rock')).toThrow(/Invalid player move/);
    expect(() => resolveMoves('rock', 'spock')).toThrow(/Invalid opponent move/);
    expect(() => resolveMoves(null, 'rock')).toThrow();
  });

  it('maps integers onto moves without bias in the mapping itself', () => {
    expect(moveFromIndex(0)).toBe('rock');
    expect(moveFromIndex(1)).toBe('paper');
    expect(moveFromIndex(2)).toBe('scissors');
    expect(moveFromIndex(3)).toBe('rock');
    expect(moveFromIndex(-1)).toBe('scissors');
  });

  it('exposes the defeat relation consistently', () => {
    expect(beats('rock')).toBe('scissors');
    expect(beats('paper')).toBe('rock');
    expect(beats('scissors')).toBe('paper');
  });
});
