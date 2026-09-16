/**
 * RandomnessProvider interface.
 *
 * The game engine never generates randomness. It asks a provider for an
 * opponent move and stores whatever proof the provider returns, so the
 * implementation can be swapped (simulated -> commit-reveal -> on-chain VRF)
 * without touching game rules, API handlers, or the database schema.
 */

export class RandomnessNotConfiguredError extends Error {
  constructor(providerName, detail) {
    super(`Randomness provider "${providerName}" is not configured: ${detail}`);
    this.name = 'RandomnessNotConfiguredError';
    this.code = 'RANDOMNESS_NOT_CONFIGURED';
    this.status = 503;
  }
}

export class RandomnessProvider {
  /** @returns {string} stable identifier stored on every round proof */
  get name() {
    throw new Error('RandomnessProvider.name must be implemented');
  }

  /** @returns {'simulated'|'commit-reveal'|'vrf'|'deterministic'} */
  get mode() {
    throw new Error('RandomnessProvider.mode must be implemented');
  }

  /** True when the provider's output can be independently verified by a player. */
  get verifiable() {
    return false;
  }

  /** Human-readable banner text shown in the fairness panel. */
  get label() {
    return this.name;
  }

  /**
   * Called once when a run is created.
   * @returns {Promise<{commitment: string, expiresAt?: string}>}
   */
  async createCommitment(_runId) {
    throw new Error('RandomnessProvider.createCommitment must be implemented');
  }

  /**
   * Produce the opponent move for one round.
   * @returns {Promise<{move: string, proof: object}>}
   */
  async nextMove(_context) {
    throw new Error('RandomnessProvider.nextMove must be implemented');
  }

  /**
   * Called when a run reaches a terminal state, exposing whatever secret makes
   * the earlier proofs checkable.
   * @returns {Promise<object|null>}
   */
  async reveal(_runId) {
    return null;
  }
}
