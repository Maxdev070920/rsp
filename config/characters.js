/**
 * Champions are cosmetic in this release. `ability` is declared but unused by
 * the resolver — the field exists so a future release can attach behaviour
 * without changing the run/round schema or the game engine's signature.
 */
export const CHAMPIONS = [
  {
    key: 'pyra',
    name: 'Pyra',
    title: 'Fire Champion',
    element: 'Fire',
    colors: { from: '#ff6a3d', via: '#ffb547', to: '#7a1f0a' },
    bio: 'Reads an opponent by the heat of their hesitation. Burns brightest on long streaks.',
    ability: { key: 'none', name: 'Cosmetic only', description: 'No gameplay effect in this release.' },
  },
  {
    key: 'aqua',
    name: 'Aqua',
    title: 'Water Champion',
    element: 'Water',
    colors: { from: '#22d3ee', via: '#3b82f6', to: '#0c2a5e' },
    bio: 'Patient to the point of cruelty. Believes every run is decided by the claim, not the throw.',
    ability: { key: 'none', name: 'Cosmetic only', description: 'No gameplay effect in this release.' },
  },
  {
    key: 'terra',
    name: 'Terra',
    title: 'Earth Champion',
    element: 'Earth',
    colors: { from: '#84cc16', via: '#a16207', to: '#1c2a12' },
    bio: 'Immovable. Has claimed at level three more times than the arena archivists can count.',
    ability: { key: 'none', name: 'Cosmetic only', description: 'No gameplay effect in this release.' },
  },
  {
    key: 'volt',
    name: 'Volt',
    title: 'Lightning Champion',
    element: 'Lightning',
    colors: { from: '#fde047', via: '#a45bff', to: '#1e1b4b' },
    bio: 'Throws before the crowd finishes inhaling. Holds the arena record for shortest run — both kinds.',
    ability: { key: 'none', name: 'Cosmetic only', description: 'No gameplay effect in this release.' },
  },
  {
    key: 'nova',
    name: 'Nova',
    title: 'Cosmic Champion',
    element: 'Cosmic',
    colors: { from: '#a45bff', via: '#37e5f0', to: '#0b0820' },
    bio: 'Claims to have seen the Eternal Singularity minted once. Nobody can find the transaction.',
    ability: { key: 'none', name: 'Cosmetic only', description: 'No gameplay effect in this release.' },
  },
];

export const getChampion = (key) => CHAMPIONS.find((c) => c.key === key) || CHAMPIONS[0];
export const DEFAULT_CHAMPION = CHAMPIONS[0].key;

/** Deterministic opponent pick so the same run always faces the same rival. */
export const opponentFor = (playerKey, seed = 0) => {
  const pool = CHAMPIONS.filter((c) => c.key !== playerKey);
  return pool[Math.abs(seed) % pool.length];
};
