import { beforeEach, describe, expect, it } from 'vitest';
import { MemoryRepository, resetMemoryDb } from '@/lib/database/memoryRepository';
import { getRepository, setRepository } from '@/lib/database/repository';
import { DeterministicRandomnessProvider, setRandomnessProvider } from '@/lib/random';
import { setNftAdapter } from '@/services/nftService';
import { MockNftAdapter } from '@/services/nft/mockAdapter';
import { decideRun, getRunDetail, listRunHistory, playRound, quoteRoom, startRun } from '@/services/runService';
import { RUN_STATUS } from '@/lib/game/stateMachine';

const actor = { userId: 'user-1', isGuest: true };
const other = { userId: 'user-2', isGuest: true };

/** Scripts the opponent so that `move` produces the outcome we want. */
const OPPONENT_FOR_WIN = 'scissors'; // player throws rock
const OPPONENT_FOR_LOSS = 'paper';
const OPPONENT_FOR_TIE = 'rock';

function useOpponentScript(script) {
  setRandomnessProvider(new DeterministicRandomnessProvider(script));
}

async function startPracticeRun(who = actor) {
  const { run } = await startRun({ actor: who, roomKey: 'practice', championKey: 'pyra' });
  return run;
}

beforeEach(async () => {
  resetMemoryDb();
  setRepository(new MemoryRepository());
  setNftAdapter(new MockNftAdapter());
  await getRepository().upsertProfile({ id: actor.userId, display_name: 'Tester', is_guest: true });
  await getRepository().upsertProfile({ id: other.userId, display_name: 'Other', is_guest: true });
});

describe('starting a run', () => {
  it('creates an ACTIVE run with a published randomness commitment for a free room', async () => {
    useOpponentScript([OPPONENT_FOR_WIN]);
    const { run, commitment } = await startRun({ actor, roomKey: 'practice', championKey: 'pyra' });

    expect(run.status).toBe(RUN_STATUS.ACTIVE);
    expect(run.level).toBe(0);
    expect(run.entryFee).toBe('0');
    expect(commitment).toBeTruthy();
    expect(run.randomnessCommitment).toBe(commitment);
  });

  it('rejects an unknown room', async () => {
    await expect(startRun({ actor, roomKey: 'atlantis', championKey: 'pyra' })).rejects.toThrow(/Unknown arena/);
  });

  it('limits how many runs a player can have open at once', async () => {
    useOpponentScript([OPPONENT_FOR_WIN]);
    await startPracticeRun();
    await startPracticeRun();
    await startPracticeRun();
    await expect(startPracticeRun()).rejects.toMatchObject({ code: 'TOO_MANY_ACTIVE_RUNS' });
  });

  it('quotes a room with the fee, network, and maximum loss before entry', () => {
    const quote = quoteRoom('bronze');
    expect(quote.entryFee).toBe(quote.room.entryFee);
    expect(quote.maximumLoss).toBe(quote.room.entryFee);
    expect(quote.rewards.first.level).toBe(1);
    expect(quote.rewards.final.level).toBe(15);
  });

  it('quotes practice as costing nothing', () => {
    const quote = quoteRoom('practice');
    expect(quote.entryFee).toBe('0');
    expect(quote.maximumLoss).toBe('0');
    expect(quote.mintsNft).toBe(false);
  });
});

describe('playing rounds', () => {
  it('advances a level on a resolved win and waits for a decision', async () => {
    useOpponentScript([OPPONENT_FOR_WIN]);
    const run = await startPracticeRun();
    const result = await playRound({ actor, runId: run.id, move: 'rock' });

    expect(result.outcome).toBe('win');
    expect(result.run.level).toBe(1);
    expect(result.run.status).toBe(RUN_STATUS.AWAITING_DECISION);
  });

  it('replays the same level on a tie', async () => {
    useOpponentScript([OPPONENT_FOR_TIE, OPPONENT_FOR_TIE, OPPONENT_FOR_WIN]);
    const run = await startPracticeRun();

    let result = await playRound({ actor, runId: run.id, move: 'rock' });
    expect(result.outcome).toBe('tie');
    expect(result.run.level).toBe(0);
    expect(result.run.status).toBe(RUN_STATUS.ACTIVE);

    result = await playRound({ actor, runId: run.id, move: 'rock' });
    expect(result.outcome).toBe('tie');
    expect(result.run.ties).toBe(2);
    expect(result.run.resolvedRounds).toBe(0);

    result = await playRound({ actor, runId: run.id, move: 'rock' });
    expect(result.run.level).toBe(1);
  });

  it('ends the run on a resolved loss', async () => {
    useOpponentScript([OPPONENT_FOR_LOSS]);
    const run = await startPracticeRun();
    const result = await playRound({ actor, runId: run.id, move: 'rock' });

    expect(result.outcome).toBe('loss');
    expect(result.run.status).toBe(RUN_STATUS.LOST);
    expect(result.settlement.claimedLevel).toBeNull();
  });

  it('forfeits the unclaimed reward when the player continues and loses', async () => {
    useOpponentScript([OPPONENT_FOR_WIN, OPPONENT_FOR_LOSS]);
    const run = await startPracticeRun();

    await playRound({ actor, runId: run.id, move: 'rock' });
    await decideRun({ actor, runId: run.id, decision: 'continue' });
    const result = await playRound({ actor, runId: run.id, move: 'rock' });

    expect(result.run.status).toBe(RUN_STATUS.LOST);
    expect(result.settlement.forfeited.level).toBe(1);
    // Nothing is recorded as earned for a forfeited run.
    const earned = await getRepository().findEarnedRewardByRun(run.id);
    expect(earned).toBeFalsy();
  });

  it('refuses a throw while a decision is pending', async () => {
    useOpponentScript([OPPONENT_FOR_WIN]);
    const run = await startPracticeRun();
    await playRound({ actor, runId: run.id, move: 'rock' });

    await expect(playRound({ actor, runId: run.id, move: 'rock' })).rejects.toMatchObject({
      code: 'INVALID_TRANSITION',
    });
  });

  it('refuses a throw on a finished run', async () => {
    useOpponentScript([OPPONENT_FOR_LOSS]);
    const run = await startPracticeRun();
    await playRound({ actor, runId: run.id, move: 'rock' });

    await expect(playRound({ actor, runId: run.id, move: 'rock' })).rejects.toMatchObject({
      code: 'INVALID_TRANSITION',
    });
  });

  it('rejects a replayed round number', async () => {
    useOpponentScript([OPPONENT_FOR_TIE]);
    const run = await startPracticeRun();
    await playRound({ actor, runId: run.id, move: 'rock', expectedRoundNumber: 0 });

    await expect(
      playRound({ actor, runId: run.id, move: 'rock', expectedRoundNumber: 0 })
    ).rejects.toMatchObject({ code: 'ROUND_ALREADY_PLAYED' });
  });

  it('refuses to let one player act on another player\'s run', async () => {
    useOpponentScript([OPPONENT_FOR_WIN]);
    const run = await startPracticeRun(actor);

    await expect(playRound({ actor: other, runId: run.id, move: 'rock' })).rejects.toMatchObject({
      code: 'FORBIDDEN',
    });
    await expect(getRunDetail({ actor: other, runId: run.id })).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });

  it('records every round, ties included', async () => {
    useOpponentScript([OPPONENT_FOR_TIE, OPPONENT_FOR_WIN]);
    const run = await startPracticeRun();
    await playRound({ actor, runId: run.id, move: 'rock' });
    await playRound({ actor, runId: run.id, move: 'rock' });

    const rounds = await getRepository().listRounds(run.id);
    expect(rounds).toHaveLength(2);
    expect(rounds[0].outcome).toBe('tie');
    expect(rounds[1].outcome).toBe('win');
  });
});

describe('claiming', () => {
  it('awards the reward for the current level and ends the run', async () => {
    useOpponentScript([OPPONENT_FOR_WIN, OPPONENT_FOR_WIN]);
    const run = await startPracticeRun();
    await playRound({ actor, runId: run.id, move: 'rock' });
    await decideRun({ actor, runId: run.id, decision: 'continue' });
    await playRound({ actor, runId: run.id, move: 'rock' });

    const result = await decideRun({ actor, runId: run.id, decision: 'claim' });
    expect(result.run.status).toBe(RUN_STATUS.CLAIMED);
    expect(result.settlement.claimedLevel).toBe(2);
    expect(result.settlement.reward.key).toBe('bronze');
  });

  it('refuses a second claim on the same run', async () => {
    useOpponentScript([OPPONENT_FOR_WIN]);
    const run = await startPracticeRun();
    await playRound({ actor, runId: run.id, move: 'rock' });
    await decideRun({ actor, runId: run.id, decision: 'claim' });

    await expect(decideRun({ actor, runId: run.id, decision: 'claim' })).rejects.toMatchObject({
      code: 'INVALID_TRANSITION',
    });
  });

  it('records exactly one earned reward per run', async () => {
    useOpponentScript([OPPONENT_FOR_WIN]);
    const run = await startPracticeRun();
    await playRound({ actor, runId: run.id, move: 'rock' });
    await decideRun({ actor, runId: run.id, decision: 'claim' });

    const rewards = await getRepository().listEarnedRewards({ userId: actor.userId });
    expect(rewards).toHaveLength(1);
    expect(rewards[0].reward_level).toBe(1);
  });

  it('does not mint in Practice Arena', async () => {
    useOpponentScript([OPPONENT_FOR_WIN]);
    const run = await startPracticeRun();
    await playRound({ actor, runId: run.id, move: 'rock' });
    const result = await decideRun({ actor, runId: run.id, decision: 'claim' });

    expect(result.settlement.mint).toBeNull();
    expect(await getRepository().listMints(actor.userId)).toHaveLength(0);
  });

  it('mints once, and only once, in a paid arena', async () => {
    useOpponentScript([OPPONENT_FOR_WIN]);
    const { run } = await startRun({ actor, roomKey: 'bronze', championKey: 'pyra' });
    await playRound({ actor, runId: run.id, move: 'rock' });
    const result = await decideRun({ actor, runId: run.id, decision: 'claim' });

    expect(result.settlement.mint).toBeTruthy();
    expect(result.settlement.mint.simulated).toBe(true);
    expect(await getRepository().listMints(actor.userId)).toHaveLength(1);
  });

  it('refuses a decision when none is pending', async () => {
    useOpponentScript([OPPONENT_FOR_WIN]);
    const run = await startPracticeRun();
    await expect(decideRun({ actor, runId: run.id, decision: 'claim' })).rejects.toMatchObject({
      code: 'INVALID_TRANSITION',
    });
  });

  it('puts the run back in play when the player continues', async () => {
    useOpponentScript([OPPONENT_FOR_WIN]);
    const run = await startPracticeRun();
    await playRound({ actor, runId: run.id, move: 'rock' });
    const result = await decideRun({ actor, runId: run.id, decision: 'continue' });

    expect(result.run.status).toBe(RUN_STATUS.ACTIVE);
    expect(result.run.level).toBe(1);
  });
});

describe('level 15', () => {
  it('claims automatically without a player decision', async () => {
    useOpponentScript([OPPONENT_FOR_WIN]);
    const { run } = await startRun({ actor, roomKey: 'bronze', championKey: 'pyra' });

    let result;
    for (let level = 1; level <= 15; level += 1) {
      result = await playRound({ actor, runId: run.id, move: 'rock' });
      if (level < 15) await decideRun({ actor, runId: run.id, decision: 'continue' });
    }

    expect(result.autoClaimed).toBe(true);
    expect(result.run.status).toBe(RUN_STATUS.CLAIMED);
    expect(result.run.claimedLevel).toBe(15);
    expect(result.settlement.reward.key).toBe('eternal');
    expect(result.settlement.auto).toBe(true);
    expect(await getRepository().listMints(actor.userId)).toHaveLength(1);
  });
});

describe('run detail and history', () => {
  it('withholds the seed until the run is finished, then reveals it', async () => {
    useOpponentScript([OPPONENT_FOR_WIN]);
    const run = await startPracticeRun();
    await playRound({ actor, runId: run.id, move: 'rock' });

    const midRun = await getRunDetail({ actor, runId: run.id });
    expect(midRun.randomness.reveal).toBeNull();

    await decideRun({ actor, runId: run.id, decision: 'claim' });
    const finished = await getRunDetail({ actor, runId: run.id });
    expect(finished.randomness.reveal).toBeTruthy();
  });

  it('lists a player\'s runs with their rounds', async () => {
    useOpponentScript([OPPONENT_FOR_LOSS]);
    const run = await startPracticeRun();
    await playRound({ actor, runId: run.id, move: 'rock' });

    const history = await listRunHistory({ actor });
    expect(history).toHaveLength(1);
    expect(history[0].rounds).toHaveLength(1);
  });

  it('never returns another player\'s runs', async () => {
    useOpponentScript([OPPONENT_FOR_WIN]);
    await startPracticeRun(actor);
    const history = await listRunHistory({ actor: other });
    expect(history).toHaveLength(0);
  });
});
