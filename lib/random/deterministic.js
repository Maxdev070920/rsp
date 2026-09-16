import { moveFromIndex } from '@/lib/game/rps';
import { RandomnessProvider } from './provider';

/**
 * Test-only provider. Replays a fixed script of moves so every test that
 * exercises win/loss/tie behaviour is fully deterministic.
 */
export class DeterministicRandomnessProvider extends RandomnessProvider {
  #script;
  #cursor = 0;

  constructor(script = ['rock']) {
    super();
    this.#script = script;
  }

  get name() {
    return 'deterministic-test';
  }

  get mode() {
    return 'deterministic';
  }

  get label() {
    return 'Deterministic (tests only)';
  }

  async createCommitment(runId) {
    return { commitment: `deterministic:${runId}`, provider: this.name };
  }

  async nextMove({ roundNumber }) {
    const entry = this.#script[this.#cursor % this.#script.length];
    this.#cursor += 1;
    const move = typeof entry === 'number' ? moveFromIndex(entry) : entry;
    return {
      move,
      proof: { provider: this.name, mode: this.mode, roundNumber, scripted: true },
    };
  }

  /** Mirrors a real provider's reveal so run-lifecycle tests stay meaningful. */
  async reveal(runId) {
    return { provider: this.name, runId, script: [...this.#script] };
  }

  reset() {
    this.#cursor = 0;
  }
}
