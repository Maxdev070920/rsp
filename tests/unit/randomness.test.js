import { describe, expect, it } from 'vitest';
import { createHash } from 'node:crypto';
import { CommitRevealRandomnessProvider } from '@/lib/random/commitReveal';
import { SimulatedRandomnessProvider } from '@/lib/random/simulated';
import { VrfRandomnessProvider } from '@/lib/random/vrf';
import { DeterministicRandomnessProvider } from '@/lib/random/deterministic';
import { MOVES } from '@/lib/game/rps';

const SECRET = 'unit-test-master-secret';

describe('commit-reveal randomness', () => {
  it('publishes a commitment that the revealed seed hashes to', async () => {
    const provider = new CommitRevealRandomnessProvider({ masterSecret: SECRET });
    const { commitment } = await provider.createCommitment('run-abc');
    const { seed } = await provider.reveal('run-abc');

    expect(createHash('sha256').update(Buffer.from(seed, 'hex')).digest('hex')).toBe(commitment);
    expect(CommitRevealRandomnessProvider.verifyCommitment({ seed, commitment })).toBe(true);
  });

  it('is deterministic for a given run and round', async () => {
    const a = new CommitRevealRandomnessProvider({ masterSecret: SECRET });
    const b = new CommitRevealRandomnessProvider({ masterSecret: SECRET });
    const first = await a.nextMove({ runId: 'run-1', roundNumber: 3 });
    const second = await b.nextMove({ runId: 'run-1', roundNumber: 3 });
    expect(first.move).toBe(second.move);
    expect(first.proof.digest).toBe(second.proof.digest);
  });

  it('produces different seeds for different runs', async () => {
    const provider = new CommitRevealRandomnessProvider({ masterSecret: SECRET });
    const one = await provider.reveal('run-1');
    const two = await provider.reveal('run-2');
    expect(one.seed).not.toBe(two.seed);
  });

  it('verifies a round against the revealed seed', async () => {
    const provider = new CommitRevealRandomnessProvider({ masterSecret: SECRET });
    const { move, proof } = await provider.nextMove({ runId: 'run-x', roundNumber: 1 });
    const { seed } = await provider.reveal('run-x');

    const result = CommitRevealRandomnessProvider.verifyRound({
      seed,
      runId: 'run-x',
      roundNumber: 1,
      expectedDigest: proof.digest,
      expectedMove: move,
    });
    expect(result.valid).toBe(true);
  });

  it('fails verification when the claimed move is wrong', async () => {
    const provider = new CommitRevealRandomnessProvider({ masterSecret: SECRET });
    const { move, proof } = await provider.nextMove({ runId: 'run-y', roundNumber: 2 });
    const { seed } = await provider.reveal('run-y');
    const wrongMove = MOVES.find((m) => m !== move);

    const result = CommitRevealRandomnessProvider.verifyRound({
      seed,
      runId: 'run-y',
      roundNumber: 2,
      expectedDigest: proof.digest,
      expectedMove: wrongMove,
    });
    expect(result.valid).toBe(false);
    expect(result.moveMatches).toBe(false);
  });

  it('distributes moves roughly evenly across many rounds', async () => {
    const provider = new CommitRevealRandomnessProvider({ masterSecret: SECRET });
    const counts = { rock: 0, paper: 0, scissors: 0 };
    for (let round = 1; round <= 3000; round += 1) {
      const { move } = await provider.nextMove({ runId: 'distribution', roundNumber: round });
      counts[move] += 1;
    }
    // Each move should land near a third. A wide band keeps this from being a
    // flaky statistical test while still catching a badly broken mapping.
    for (const move of MOVES) {
      expect(counts[move]).toBeGreaterThan(850);
      expect(counts[move]).toBeLessThan(1150);
    }
  });

  it('never returns a move outside the three valid options', async () => {
    const provider = new CommitRevealRandomnessProvider({ masterSecret: SECRET });
    for (let round = 1; round <= 200; round += 1) {
      const { move } = await provider.nextMove({ runId: 'validity', roundNumber: round });
      expect(MOVES).toContain(move);
    }
  });

  it('falls back to an ephemeral secret and says so', () => {
    const provider = new CommitRevealRandomnessProvider();
    expect(provider.ephemeral).toBe(true);
    expect(provider.label).toMatch(/ephemeral/i);
  });
});

describe('simulated provider', () => {
  it('is labelled as development randomness', () => {
    const provider = new SimulatedRandomnessProvider({ masterSecret: SECRET });
    expect(provider.mode).toBe('simulated');
    expect(provider.label).toMatch(/development/i);
  });
});

describe('VRF provider', () => {
  it('refuses to operate rather than silently downgrading', async () => {
    const provider = new VrfRandomnessProvider();
    await expect(provider.createCommitment('run-1')).rejects.toThrow(/not configured/i);
    await expect(provider.nextMove({ runId: 'run-1', roundNumber: 1 })).rejects.toThrow(/not configured/i);
  });
});

describe('deterministic provider', () => {
  it('replays a fixed script for tests', async () => {
    const provider = new DeterministicRandomnessProvider(['rock', 'paper', 'scissors']);
    expect((await provider.nextMove({ roundNumber: 1 })).move).toBe('rock');
    expect((await provider.nextMove({ roundNumber: 2 })).move).toBe('paper');
    expect((await provider.nextMove({ roundNumber: 3 })).move).toBe('scissors');
    expect((await provider.nextMove({ roundNumber: 4 })).move).toBe('rock');
  });
});
