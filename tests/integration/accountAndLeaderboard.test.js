import { beforeEach, describe, expect, it } from 'vitest';
import { MemoryRepository, resetMemoryDb } from '@/lib/database/memoryRepository';
import { getRepository, setRepository } from '@/lib/database/repository';
import { DeterministicRandomnessProvider, setRandomnessProvider } from '@/lib/random';
import { setNftAdapter } from '@/services/nftService';
import { MockNftAdapter } from '@/services/nft/mockAdapter';
import { decideRun, playRound, startRun } from '@/services/runService';
import { getLeaderboard, getPlayerRank, scoreForRun } from '@/services/leaderboardService';
import { idempotencyKey, withIdempotency } from '@/lib/security/idempotency';

const actor = { userId: 'user-1', isGuest: false };

beforeEach(async () => {
  resetMemoryDb();
  setRepository(new MemoryRepository());
  setNftAdapter(new MockNftAdapter());
  setRandomnessProvider(new DeterministicRandomnessProvider(['scissors'])); // player rock always wins
  await getRepository().upsertProfile({ id: actor.userId, display_name: 'Tester' });
});

describe('leaderboard scoring', () => {
  it('scores nothing for Practice Arena at any level', () => {
    expect(scoreForRun({ roomKey: 'practice', level: 15, claimed: true })).toBe(0);
  });

  it('scores nothing for a run that was never claimed', () => {
    expect(scoreForRun({ roomKey: 'legendary', level: 14, claimed: false })).toBe(0);
  });

  it('rewards depth faster than breadth', () => {
    const deep = scoreForRun({ roomKey: 'bronze', level: 10, claimed: true });
    const shallowTwice = 2 * scoreForRun({ roomKey: 'bronze', level: 5, claimed: true });
    expect(deep).toBeGreaterThan(shallowTwice);
  });

  it('applies the room multiplier', () => {
    const bronze = scoreForRun({ roomKey: 'bronze', level: 6, claimed: true });
    const silver = scoreForRun({ roomKey: 'silver', level: 6, claimed: true });
    const legendary = scoreForRun({ roomKey: 'legendary', level: 6, claimed: true });
    expect(silver).toBe(bronze * 2.5);
    expect(legendary).toBe(bronze * 5);
  });

  it('records a claimed paid run on the board', async () => {
    const { run } = await startRun({ actor, roomKey: 'bronze', championKey: 'pyra' });
    await playRound({ actor, runId: run.id, move: 'rock' });
    await decideRun({ actor, runId: run.id, decision: 'claim' });

    const rank = await getPlayerRank({ userId: actor.userId });
    expect(rank).toBeTruthy();
    expect(rank.score).toBe(scoreForRun({ roomKey: 'bronze', level: 1, claimed: true }));
    expect(rank.nfts_collected).toBe(1);
  });

  it('keeps practice runs off the board entirely', async () => {
    const { run } = await startRun({ actor, roomKey: 'practice', championKey: 'pyra' });
    await playRound({ actor, runId: run.id, move: 'rock' });
    await decideRun({ actor, runId: run.id, decision: 'claim' });

    expect(await getPlayerRank({ userId: actor.userId })).toBeNull();
  });

  it('ranks entries by score, highest first', async () => {
    const repo = getRepository();
    await repo.upsertLeaderboardEntry({ userId: 'a', seasonId: 'season-1', displayName: 'A', patch: { scoreDelta: 100 } });
    await repo.upsertLeaderboardEntry({ userId: 'b', seasonId: 'season-1', displayName: 'B', patch: { scoreDelta: 500 } });
    await repo.upsertLeaderboardEntry({ userId: 'c', seasonId: 'season-1', displayName: 'C', patch: { scoreDelta: 250 } });

    const board = await getLeaderboard({ limit: 10 });
    expect(board.map((entry) => entry.display_name)).toEqual(['B', 'C', 'A']);
    expect(board[0].rank).toBe(1);
  });

  it('accumulates deltas rather than overwriting them', async () => {
    const repo = getRepository();
    await repo.upsertLeaderboardEntry({ userId: 'a', seasonId: 's', displayName: 'A', patch: { scoreDelta: 100, runsDelta: 1, streak: 3, level: 4 } });
    await repo.upsertLeaderboardEntry({ userId: 'a', seasonId: 's', displayName: 'A', patch: { scoreDelta: 50, runsDelta: 1, streak: 1, level: 2 } });

    const entry = await repo.getLeaderboardEntry({ userId: 'a', seasonId: 's' });
    expect(entry.score).toBe(150);
    expect(entry.total_runs).toBe(2);
    // Peaks are kept, not replaced by the later, lower run.
    expect(entry.longest_streak).toBe(3);
    expect(entry.highest_level).toBe(4);
  });
});

describe('idempotency', () => {
  it('returns the original result for a replayed key instead of acting twice', async () => {
    const key = idempotencyKey({ userId: 'u', action: 'claim', resourceId: 'run-1' });
    let calls = 0;
    const produce = async () => {
      calls += 1;
      return { value: calls };
    };

    const first = await withIdempotency(key, produce);
    const second = await withIdempotency(key, produce);

    expect(calls).toBe(1);
    expect(first.replayed).toBe(false);
    expect(second.replayed).toBe(true);
    expect(second.result).toEqual(first.result);
  });

  it('scopes keys to the user, so one player cannot replay another\'s claim', () => {
    const mine = idempotencyKey({ userId: 'u1', action: 'claim', resourceId: 'run-1' });
    const theirs = idempotencyKey({ userId: 'u2', action: 'claim', resourceId: 'run-1' });
    expect(mine).not.toBe(theirs);
  });
});

describe('account deletion', () => {
  it('anonymises the profile and removes linked wallets', async () => {
    const repo = getRepository();
    await repo.linkWallet({
      userId: actor.userId,
      address: '0x1111111111111111111111111111111111111111',
      chainId: 2021,
    });

    const request = await repo.createDeletionRequest({ userId: actor.userId, reason: 'done playing' });
    expect(request.status).toBe('PENDING');

    await repo.deleteProfile(actor.userId, { anonymize: true });
    const profile = await repo.getProfile(actor.userId);

    expect(profile.display_name).toBe('Deleted Challenger');
    expect(profile.email).toBeNull();
    expect(profile.deleted_at).toBeTruthy();
    expect(await repo.listWallets(actor.userId)).toHaveLength(0);

    const completed = await repo.completeDeletionRequest(request.id);
    expect(completed.status).toBe('COMPLETED');
  });

  it('keeps anonymised run records so the audit trail survives', async () => {
    const { run } = await startRun({ actor, roomKey: 'practice', championKey: 'pyra' });
    await playRound({ actor, runId: run.id, move: 'rock' });

    const repo = getRepository();
    await repo.deleteProfile(actor.userId, { anonymize: true });

    const runs = await repo.listRuns({ userId: actor.userId });
    expect(runs).toHaveLength(1);
  });
});

describe('audit log', () => {
  it('records run creation, rounds, and claims', async () => {
    const { run } = await startRun({ actor, roomKey: 'practice', championKey: 'pyra' });
    await playRound({ actor, runId: run.id, move: 'rock' });
    await decideRun({ actor, runId: run.id, decision: 'claim' });

    const entries = await getRepository().listAudit({ userId: actor.userId });
    const events = entries.map((entry) => entry.event);
    expect(events).toContain('run.created');
    expect(events).toContain('run.round_played');
    expect(events).toContain('run.claimed');
  });
});
