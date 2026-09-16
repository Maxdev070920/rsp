import { RandomnessNotConfiguredError, RandomnessProvider } from './provider';

/**
 * On-chain / VRF randomness.
 *
 * Deliberately unimplemented: wiring it requires a deployed coordinator, a
 * funded subscription, and an async request/fulfil round trip that changes the
 * round API from synchronous to pending. The class exists so the swap point is
 * explicit and so nothing silently falls back to a weaker source.
 *
 * To implement:
 *   1. Deploy a consumer contract that requests randomness per run.
 *   2. `createCommitment` stores the request id returned by the coordinator.
 *   3. `nextMove` reads the fulfilled word and derives round moves from
 *      keccak256(randomWord, roundNumber).
 *   4. `reveal` returns the fulfilment transaction hash for explorer linking.
 */
export class VrfRandomnessProvider extends RandomnessProvider {
  constructor(config = {}) {
    super();
    this.config = config;
  }

  get name() {
    return 'vrf-v1';
  }

  get mode() {
    return 'vrf';
  }

  get verifiable() {
    return true;
  }

  get label() {
    return 'Verifiable Random Function (on-chain)';
  }

  #unavailable() {
    throw new RandomnessNotConfiguredError(
      this.name,
      'no VRF coordinator address, subscription id, or consumer contract is configured. Set RANDOMNESS_PROVIDER=commit-reveal until a coordinator is deployed.'
    );
  }

  async createCommitment() {
    this.#unavailable();
  }

  async nextMove() {
    this.#unavailable();
  }
}
