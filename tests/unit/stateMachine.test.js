import { describe, expect, it } from 'vitest';
import {
  InvalidTransitionError,
  RUN_ACTIONS,
  RUN_STATUS,
  actionForOutcome,
  allowedActions,
  canTransition,
  isTerminal,
  transition,
} from '@/lib/game/stateMachine';

describe('run state machine', () => {
  it('walks the happy path from creation to a claim', () => {
    let status = RUN_STATUS.CREATED;
    status = transition(status, RUN_ACTIONS.CONFIRM_ENTRY);
    expect(status).toBe(RUN_STATUS.ACTIVE);
    status = transition(status, RUN_ACTIONS.PLAY_WIN);
    expect(status).toBe(RUN_STATUS.AWAITING_DECISION);
    status = transition(status, RUN_ACTIONS.CLAIM);
    expect(status).toBe(RUN_STATUS.CLAIMING);
    status = transition(status, RUN_ACTIONS.CLAIM_CONFIRMED);
    expect(status).toBe(RUN_STATUS.CLAIMED);
    expect(isTerminal(status)).toBe(true);
  });

  it('keeps a tie in ACTIVE', () => {
    expect(transition(RUN_STATUS.ACTIVE, RUN_ACTIONS.PLAY_TIE)).toBe(RUN_STATUS.ACTIVE);
  });

  it('sends a level-15 win straight to CLAIMING, skipping the decision', () => {
    expect(transition(RUN_STATUS.ACTIVE, RUN_ACTIONS.PLAY_WIN_FINAL)).toBe(RUN_STATUS.CLAIMING);
  });

  it('returns a failed claim to the decision point, never to ACTIVE', () => {
    expect(transition(RUN_STATUS.CLAIMING, RUN_ACTIONS.CLAIM_FAILED)).toBe(RUN_STATUS.AWAITING_DECISION);
  });

  it('rejects playing a round while a decision is pending', () => {
    expect(() => transition(RUN_STATUS.AWAITING_DECISION, RUN_ACTIONS.PLAY_WIN)).toThrow(InvalidTransitionError);
  });

  it('rejects any action from a terminal state', () => {
    for (const status of [RUN_STATUS.CLAIMED, RUN_STATUS.LOST, RUN_STATUS.CANCELLED, RUN_STATUS.EXPIRED]) {
      expect(allowedActions(status)).toHaveLength(0);
      expect(() => transition(status, RUN_ACTIONS.CLAIM)).toThrow(InvalidTransitionError);
    }
  });

  it('rejects a second claim from CLAIMING', () => {
    expect(canTransition(RUN_STATUS.CLAIMING, RUN_ACTIONS.CLAIM)).toBe(false);
  });

  it('carries an HTTP status and code on the error for the API layer', () => {
    try {
      transition(RUN_STATUS.LOST, RUN_ACTIONS.PLAY_WIN);
      expect.unreachable();
    } catch (error) {
      expect(error.code).toBe('INVALID_TRANSITION');
      expect(error.status).toBe(409);
    }
  });

  it('chooses the right action for each outcome', () => {
    expect(actionForOutcome('tie', 3, 15)).toBe(RUN_ACTIONS.PLAY_TIE);
    expect(actionForOutcome('loss', 3, 15)).toBe(RUN_ACTIONS.PLAY_LOSS);
    expect(actionForOutcome('win', 3, 15)).toBe(RUN_ACTIONS.PLAY_WIN);
    expect(actionForOutcome('win', 15, 15)).toBe(RUN_ACTIONS.PLAY_WIN_FINAL);
  });
});
