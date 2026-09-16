import { beforeEach, describe, expect, it } from 'vitest';
import {
  chooseContinue,
  confirmClaim,
  confirmEntry,
  createRun,
  failClaim,
  playRound,
  requestClaim,
  requireEntry,
  runView,
} from '@/lib/game/engine';
import { RUN_STATUS } from '@/lib/game/stateMachine';

const NOW = '2026-01-01T00:00:00.000Z';

/** Plays a scripted sequence of outcomes against a fresh run. */
function makeRun(overrides = {}) {
  return confirmEntry(
    createRun({
      id: 'run-1',
      roomKey: 'practice',
      championKey: 'pyra',
      opponentKey: 'nova',
      now: NOW,
      ...overrides,
    }),
    { now: NOW }
  );
}

// Deterministic pairings: no randomness anywhere in these tests.
const WIN = { playerMove: 'rock', opponentMove: 'scissors' };
const LOSS = { playerMove: 'rock', opponentMove: 'paper' };
const TIE = { playerMove: 'rock', opponentMove: 'rock' };

describe('run engine', () => {
  let run;

  beforeEach(() => {
    run = makeRun();
  });

  it('starts at level zero and ACTIVE for a free room', () => {
    expect(run.status).toBe(RUN_STATUS.ACTIVE);
    expect(run.level).toBe(0);
    expect(run.roundNumber).toBe(0);
  });

  it('requires entry first when the room is paid', () => {
    const paid = requireEntry(createRun({ id: 'r', roomKey: 'bronze', championKey: 'pyra', opponentKey: 'nova', requiresPayment: true }));
    expect(paid.status).toBe(RUN_STATUS.AWAITING_ENTRY);
    const confirmed = confirmEntry(paid, { txHash: '0xabc' });
    expect(confirmed.status).toBe(RUN_STATUS.ACTIVE);
    expect(confirmed.entryTxHash).toBe('0xabc');
  });

  describe('ties', () => {
    it('repeats the same reward level and does not count as resolved', () => {
      const first = playRound(run, { ...TIE, now: NOW });
      expect(first.outcome).toBe('tie');
      expect(first.resolved).toBe(false);
      expect(first.run.level).toBe(0);
      expect(first.run.streak).toBe(0);
      expect(first.run.ties).toBe(1);
      expect(first.run.resolvedRounds).toBe(0);
      expect(first.run.status).toBe(RUN_STATUS.ACTIVE);
    });

    it('still counts as a game round', () => {
      const { run: after } = playRound(run, { ...TIE, now: NOW });
      expect(after.roundNumber).toBe(1);
    });

    it('does not break a streak', () => {
      let current = playRound(run, { ...WIN, now: NOW }).run;
      current = chooseContinue(current, { now: NOW });
      current = playRound(current, { ...TIE, now: NOW }).run;
      expect(current.streak).toBe(1);
      expect(current.level).toBe(1);
    });
  });

  describe('wins', () => {
    it('advances exactly one level and pauses for a decision', () => {
      const { run: after, outcome } = playRound(run, { ...WIN, now: NOW });
      expect(outcome).toBe('win');
      expect(after.level).toBe(1);
      expect(after.streak).toBe(1);
      expect(after.wins).toBe(1);
      expect(after.resolvedRounds).toBe(1);
      expect(after.status).toBe(RUN_STATUS.AWAITING_DECISION);
    });

    it('refuses another throw until the decision is made', () => {
      const { run: after } = playRound(run, { ...WIN, now: NOW });
      expect(() => playRound(after, { ...WIN, now: NOW })).toThrow(/cannot PLAY_WIN while run is AWAITING_DECISION/);
    });

    it('climbs level by level when the player keeps continuing', () => {
      let current = run;
      for (let level = 1; level <= 5; level += 1) {
        current = playRound(current, { ...WIN, now: NOW }).run;
        expect(current.level).toBe(level);
        current = chooseContinue(current, { now: NOW });
      }
      expect(current.streak).toBe(5);
      expect(current.resolvedRounds).toBe(5);
    });
  });

  describe('losses', () => {
    it('ends the run immediately', () => {
      const { run: after, outcome } = playRound(run, { ...LOSS, now: NOW });
      expect(outcome).toBe('loss');
      expect(after.status).toBe(RUN_STATUS.LOST);
      expect(after.streak).toBe(0);
      expect(after.finishedAt).toBe(NOW);
    });

    it('forfeits an unclaimed reward entirely', () => {
      let current = playRound(run, { ...WIN, now: NOW }).run;
      current = chooseContinue(current, { now: NOW });
      const { run: after } = playRound(current, { ...LOSS, now: NOW });

      expect(after.status).toBe(RUN_STATUS.LOST);
      expect(after.claimedLevel).toBeNull();
      // The level the player was holding is recorded, but nothing is awarded.
      expect(after.level).toBe(1);
    });

    it('cannot be played on after the loss', () => {
      const { run: after } = playRound(run, { ...LOSS, now: NOW });
      expect(() => playRound(after, { ...WIN, now: NOW })).toThrow();
    });
  });

  describe('claiming', () => {
    it('ends the run and records the claimed level', () => {
      const { run: won } = playRound(run, { ...WIN, now: NOW });
      const claiming = requestClaim(won, { now: NOW });
      expect(claiming.status).toBe(RUN_STATUS.CLAIMING);
      expect(claiming.claimedLevel).toBe(1);

      const claimed = confirmClaim(claiming, { now: NOW });
      expect(claimed.status).toBe(RUN_STATUS.CLAIMED);
      expect(claimed.claimedAt).toBe(NOW);
    });

    it('refuses a second claim on the same run', () => {
      const { run: won } = playRound(run, { ...WIN, now: NOW });
      const claimed = confirmClaim(requestClaim(won, { now: NOW }), { now: NOW });
      expect(() => requestClaim(claimed, { now: NOW })).toThrow(/cannot CLAIM while run is CLAIMED/);
    });

    it('refuses a claim with nothing won', () => {
      expect(() => requestClaim(run, { now: NOW })).toThrow(/no resolved wins/);
    });

    it('returns to the decision point when a mint fails, not to ACTIVE', () => {
      const { run: won } = playRound(run, { ...WIN, now: NOW });
      const recovered = failClaim(requestClaim(won, { now: NOW }), { now: NOW });
      expect(recovered.status).toBe(RUN_STATUS.AWAITING_DECISION);
      // The reward is still claimable — it was not silently put back at risk.
      expect(requestClaim(recovered, { now: NOW }).status).toBe(RUN_STATUS.CLAIMING);
    });
  });

  describe('level 15', () => {
    it('auto-claims without asking the player', () => {
      let current = run;
      for (let level = 1; level <= 14; level += 1) {
        current = playRound(current, { ...WIN, now: NOW }).run;
        current = chooseContinue(current, { now: NOW });
      }
      expect(current.level).toBe(14);

      const final = playRound(current, { ...WIN, now: NOW });
      expect(final.run.level).toBe(15);
      expect(final.autoClaimed).toBe(true);
      expect(final.run.status).toBe(RUN_STATUS.CLAIMING);
      expect(final.run.claimedLevel).toBe(15);

      const settled = confirmClaim(final.run, { now: NOW });
      expect(settled.status).toBe(RUN_STATUS.CLAIMED);
      expect(settled.claimedLevel).toBe(15);
    });

    it('never exceeds level 15', () => {
      let current = run;
      for (let level = 1; level <= 14; level += 1) {
        current = chooseContinue(playRound(current, { ...WIN, now: NOW }).run, { now: NOW });
      }
      const final = playRound(current, { ...WIN, now: NOW }).run;
      expect(final.level).toBe(15);
    });
  });

  describe('runView', () => {
    it('exposes the reward at risk only while a decision is pending', () => {
      const { run: won } = playRound(run, { ...WIN, now: NOW });
      const view = runView(won);
      expect(view.amountAtRisk?.level).toBe(1);
      expect(view.canDecide).toBe(true);
      expect(view.canPlay).toBe(false);

      const continued = runView(chooseContinue(won, { now: NOW }));
      expect(continued.amountAtRisk).toBeNull();
      expect(continued.canPlay).toBe(true);
    });

    it('reports the current and next reward with matching odds', () => {
      const { run: won } = playRound(run, { ...WIN, now: NOW });
      const view = runView(won);
      expect(view.currentReward.level).toBe(1);
      expect(view.nextReward.level).toBe(2);
      expect(view.odds.currentProbability).toBe(0.5);
      expect(view.odds.nextProbability).toBe(0.25);
    });
  });

  it('never mutates the run it is given', () => {
    const before = JSON.stringify(run);
    playRound(run, { ...WIN, now: NOW });
    expect(JSON.stringify(run)).toBe(before);
  });
});
