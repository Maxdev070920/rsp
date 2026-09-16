import { publicEnv } from './env.js';

/**
 * Room definitions. Entry fees always come from configuration — never from a
 * literal in a component — so that a deployment can change pricing without a
 * code change, and so the client can never invent its own fee.
 */
export const GAME_ROOMS = [
  {
    key: 'practice',
    name: 'Practice Arena',
    tagline: 'Learn the rules. Risk nothing.',
    difficulty: 'Training',
    entryFee: publicEnv.entryFees.practice,
    currency: 'credits',
    usesVirtualCredits: true,
    requiresWallet: false,
    mintsNft: false,
    leaderboardMultiplier: 0,
    artworkTier: 'standard',
    accent: 'aurora',
    description:
      'Unlimited free runs using virtual arena credits. Identical rules and identical odds to the paid arenas, but nothing is minted and nothing is scored.',
    perks: ['No wallet required', 'Virtual credits only', 'Full 15-level ladder', 'No NFT minting'],
  },
  {
    key: 'bronze',
    name: 'Bronze Arena',
    tagline: 'Your first real ladder.',
    difficulty: 'Beginner',
    entryFee: publicEnv.entryFees.bronze,
    currency: 'RON',
    usesVirtualCredits: false,
    requiresWallet: true,
    mintsNft: true,
    leaderboardMultiplier: 1,
    artworkTier: 'standard',
    accent: 'ember',
    description:
      'The standard reward collection with base artwork. A forgiving entry fee for players learning when to claim and when to push.',
    perks: ['Standard reward artwork', '1x leaderboard score', 'NFT minting enabled'],
  },
  {
    key: 'silver',
    name: 'Silver Arena',
    tagline: 'Enhanced artwork, higher stakes.',
    difficulty: 'Intermediate',
    entryFee: publicEnv.entryFees.silver,
    currency: 'RON',
    usesVirtualCredits: false,
    requiresWallet: true,
    mintsNft: true,
    leaderboardMultiplier: 2.5,
    artworkTier: 'enhanced',
    accent: 'signal',
    description:
      'Rewards mint with enhanced artwork variants and a 2.5x leaderboard multiplier. The same odds, a larger consequence.',
    perks: ['Enhanced reward artwork', '2.5x leaderboard score', 'NFT minting enabled'],
  },
  {
    key: 'legendary',
    name: 'Legendary Arena',
    tagline: 'Premium collection. Nothing held back.',
    difficulty: 'Expert',
    entryFee: publicEnv.entryFees.legendary,
    currency: 'RON',
    usesVirtualCredits: false,
    requiresWallet: true,
    mintsNft: true,
    leaderboardMultiplier: 5,
    artworkTier: 'premium',
    accent: 'nebula',
    description:
      'The premium reward collection with the highest leaderboard multiplier in the game. Reserved for players who intend to reach Eternal.',
    perks: ['Premium reward artwork', '5x leaderboard score', 'Highest rarity presentation'],
  },
];

export const getRoom = (key) => GAME_ROOMS.find((room) => room.key === key) || null;
export const PRACTICE_ROOM_KEY = 'practice';
