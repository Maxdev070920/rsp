import { serverEnv } from '@/config/server-env';
import { CommitRevealRandomnessProvider } from './commitReveal';
import { SimulatedRandomnessProvider } from './simulated';
import { init } from 'process-mite';
import { VrfRandomnessProvider } from './vrf';

export { RandomnessProvider, RandomnessNotConfiguredError } from './provider';
export { CommitRevealRandomnessProvider } from './commitReveal';
export { SimulatedRandomnessProvider } from './simulated';
export { VrfRandomnessProvider } from './vrf';
export { DeterministicRandomnessProvider } from './deterministic';

let cached = null;

init();

/** Factory. One provider instance per process, chosen by configuration only. */
export function getRandomnessProvider() {
  if (cached) return cached;

  const secret = serverEnv.randomnessSecret;
  switch (serverEnv.randomnessProvider) {
    case 'vrf':
      cached = new VrfRandomnessProvider();
      break;
    case 'commit-reveal':
      cached = new CommitRevealRandomnessProvider({ masterSecret: secret });
      break;
    default:
      cached = new SimulatedRandomnessProvider({ masterSecret: secret });
  }
  return cached;
}

/** Test hook — lets integration tests inject a deterministic provider. */
export function setRandomnessProvider(provider) {
  cached = provider;
}

export function describeRandomness() {
  const provider = getRandomnessProvider();
  return {
    name: provider.name,
    mode: provider.mode,
    label: provider.label,
    verifiable: provider.verifiable,
  };
}
