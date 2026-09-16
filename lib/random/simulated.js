import { CommitRevealRandomnessProvider } from './commitReveal';

/**
 * Development randomness. Mechanically identical to commit-reveal, but always
 * labelled as simulated in the UI so a player is never shown "provably fair"
 * language for a seed that only this server can vouch for.
 */
export class SimulatedRandomnessProvider extends CommitRevealRandomnessProvider {
  get name() {
    return 'simulated-v1';
  }

  get mode() {
    return 'simulated';
  }

  get verifiable() {
    return true;
  }

  get label() {
    return 'Simulated randomness (development mode)';
  }
}
