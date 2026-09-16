import { MAX_REWARD_LEVEL } from './env.js';

/**
 * The 15 reward tiers. `probability` is the chance of *reaching* this level in
 * a single run (1 / 2^level, ties replayed). `rarityScore` is a presentation
 * value derived from that probability; it is never used for payout maths.
 */
const TIERS = [
  { key: 'copper', name: 'Copper Sigil', category: 'Forged', from: '#8c5a33', via: '#d98c4a', to: '#5e3a20', glyph: 'shard' },
  { key: 'bronze', name: 'Bronze Sigil', category: 'Forged', from: '#a9713a', via: '#e0a45f', to: '#6b4522', glyph: 'shard' },
  { key: 'iron', name: 'Iron Bulwark', category: 'Forged', from: '#6b7280', via: '#aab3c0', to: '#3f4552', glyph: 'bulwark' },
  { key: 'silver', name: 'Silver Crescent', category: 'Refined', from: '#8f9bb3', via: '#e6edf7', to: '#5b6479', glyph: 'crescent' },
  { key: 'gold', name: 'Gold Ascendant', category: 'Refined', from: '#b8860b', via: '#ffd873', to: '#7a5607', glyph: 'crown' },
  { key: 'platinum', name: 'Platinum Halo', category: 'Refined', from: '#8ba0b6', via: '#f2f7ff', to: '#63788f', glyph: 'halo' },
  { key: 'obsidian', name: 'Obsidian Rift', category: 'Arcane', from: '#1b1b28', via: '#4b4361', to: '#0a0a12', glyph: 'rift' },
  { key: 'amethyst', name: 'Amethyst Prism', category: 'Arcane', from: '#6d28d9', via: '#c084fc', to: '#3b1273', glyph: 'prism' },
  { key: 'topaz', name: 'Topaz Flare', category: 'Arcane', from: '#b45309', via: '#fcd34d', to: '#7c3a05', glyph: 'flare' },
  { key: 'emerald', name: 'Emerald Verdance', category: 'Mythic', from: '#047857', via: '#6ee7b7', to: '#023d2c', glyph: 'leafstar' },
  { key: 'ruby', name: 'Ruby Pyre', category: 'Mythic', from: '#9f1239', via: '#fb7185', to: '#57061e', glyph: 'pyre' },
  { key: 'sapphire', name: 'Sapphire Tide', category: 'Mythic', from: '#1e3a8a', via: '#60a5fa', to: '#0f1f4d', glyph: 'tide' },
  { key: 'diamond', name: 'Diamond Apex', category: 'Legendary', from: '#0ea5e9', via: '#e0f2fe', to: '#0369a1', glyph: 'apex' },
  { key: 'celestial', name: 'Celestial Orbit', category: 'Legendary', from: '#4338ca', via: '#a5b4fc', to: '#1e1b4b', glyph: 'orbit' },
  { key: 'eternal', name: 'Eternal Singularity', category: 'Eternal', from: '#7c2d92', via: '#ffd873', to: '#0b0820', glyph: 'singularity' },
];

const DESCRIPTIONS = {
  copper: 'The first spark of a champion. Struck from arena slag by apprentice smiths.',
  bronze: 'Two clean reads in a row. The alloy remembers every duel it survives.',
  iron: 'A bulwark plate awarded to those who refuse the safe exit early.',
  silver: 'Crescent-cut and cold to the touch. Four rounds without a misread.',
  gold: 'The first tier the crowd stands for. Ascendant weight, ascendant risk.',
  platinum: 'A halo forged in vacuum. Six resolved rounds, zero surrendered.',
  obsidian: 'Volcanic glass folded around a rift. Sharp enough to cut a probability.',
  amethyst: 'A prism that splits a single outcome into eight possible futures.',
  topaz: 'Flare-cut and unstable. Nine straight reads, and the arena starts watching.',
  emerald: 'Verdance from the deep arena gardens. One run in a thousand reaches it.',
  ruby: 'A pyre stone. Carried by champions who stopped counting their streak.',
  sapphire: 'The tide answers only to those who held their nerve twelve times.',
  diamond: 'Apex lattice. Compressed from thirteen consecutive resolved wins.',
  celestial: 'An orbit locked around the arena core. Fourteen wins, no claim taken.',
  eternal: 'The singularity. Fifteen resolved wins. It claims itself, and the run ends in legend.',
};

export const REWARD_DEFINITIONS = TIERS.map((tier, index) => {
  const level = index + 1;
  const probability = 1 / Math.pow(2, level);
  return {
    ...tier,
    level,
    description: DESCRIPTIONS[tier.key],
    probability,
    probabilityLabel: `1 in ${Math.pow(2, level).toLocaleString()}`,
    rarityScore: Math.round(Math.pow(2, level) * 10) / 10,
    isFinal: level === MAX_REWARD_LEVEL,
  };
});

export const getReward = (level) => REWARD_DEFINITIONS[level - 1] || null;
export const getRewardByKey = (key) => REWARD_DEFINITIONS.find((r) => r.key === key) || null;
export const REWARD_CATEGORIES = [...new Set(REWARD_DEFINITIONS.map((r) => r.category))];
