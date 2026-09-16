import { getReward } from '@/config/rewards';
import { getRoom } from '@/config/rooms';
import { getChampion } from '@/config/characters';
import { publicEnv } from '@/config/env';

/**
 * ERC-721 metadata document for an earned reward.
 *
 * `image` points at the app's own deterministic SVG renderer in demo mode. For
 * a real mint the pipeline is: render the SVG -> pin to IPFS -> replace both
 * `image` and the token URI with the resulting `ipfs://` CIDs. See
 * `services/nft/ipfsAdapter.js`.
 */
export function buildRewardMetadata({ reward, run, earnedReward }) {
  const definition = getReward(reward.level);
  const room = getRoom(run.roomKey);
  const champion = getChampion(run.championKey);

  return {
    name: `${definition.name} — Level ${definition.level}`,
    description: definition.description,
    external_url: `${publicEnv.appUrl}/collection/${definition.key}`,
    image: `${publicEnv.appUrl}/api/art/reward/${definition.key}?tier=${room?.artworkTier || 'standard'}`,
    background_color: '0B0820',
    attributes: [
      { trait_type: 'Reward Level', value: definition.level, display_type: 'number', max_value: 15 },
      { trait_type: 'Tier', value: definition.name },
      { trait_type: 'Category', value: definition.category },
      { trait_type: 'Arena', value: room?.name || run.roomKey },
      { trait_type: 'Artwork Tier', value: room?.artworkTier || 'standard' },
      { trait_type: 'Champion', value: champion.name },
      { trait_type: 'Rarity Score', value: definition.rarityScore, display_type: 'number' },
      { trait_type: 'Reach Probability', value: definition.probabilityLabel },
      { trait_type: 'Win Streak', value: run.streak, display_type: 'number' },
      { trait_type: 'Ties Replayed', value: run.ties, display_type: 'number' },
      { trait_type: 'Earned', value: Math.floor(new Date(earnedReward?.earned_at || Date.now()).getTime() / 1000), display_type: 'date' },
    ],
    properties: {
      runId: run.id,
      randomnessProvider: run.randomnessProvider || null,
      randomnessCommitment: run.randomnessCommitment || null,
      resolvedRounds: run.resolvedRounds,
    },
  };
}
