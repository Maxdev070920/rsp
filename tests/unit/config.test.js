import { describe, expect, it } from 'vitest';
import { REWARD_DEFINITIONS, getReward, getRewardByKey } from '@/config/rewards';
import { GAME_ROOMS, getRoom } from '@/config/rooms';
import { CHAMPIONS, opponentFor } from '@/config/characters';
import { evaluateAchievements } from '@/config/achievements';
import { probabilityOfLevel } from '@/lib/game/probability';

describe('reward definitions', () => {
  it('defines exactly fifteen tiers with sequential levels', () => {
    expect(REWARD_DEFINITIONS).toHaveLength(15);
    REWARD_DEFINITIONS.forEach((reward, index) => {
      expect(reward.level).toBe(index + 1);
    });
  });

  it('keeps every displayed probability consistent with the model', () => {
    for (const reward of REWARD_DEFINITIONS) {
      expect(reward.probability).toBeCloseTo(probabilityOfLevel(reward.level), 15);
      expect(reward.probabilityLabel).toBe(`1 in ${Math.pow(2, reward.level).toLocaleString()}`);
    }
  });

  it('uses unique keys and names', () => {
    expect(new Set(REWARD_DEFINITIONS.map((r) => r.key)).size).toBe(15);
    expect(new Set(REWARD_DEFINITIONS.map((r) => r.name)).size).toBe(15);
  });

  it('marks only level 15 as final', () => {
    expect(REWARD_DEFINITIONS.filter((r) => r.isFinal)).toHaveLength(1);
    expect(getReward(15).isFinal).toBe(true);
  });

  it('increases rarity score monotonically with level', () => {
    for (let i = 1; i < REWARD_DEFINITIONS.length; i += 1) {
      expect(REWARD_DEFINITIONS[i].rarityScore).toBeGreaterThan(REWARD_DEFINITIONS[i - 1].rarityScore);
    }
  });

  it('looks rewards up by level and by key', () => {
    expect(getReward(1).key).toBe('copper');
    expect(getRewardByKey('eternal').level).toBe(15);
    expect(getReward(16)).toBeNull();
    expect(getRewardByKey('nope')).toBeNull();
  });
});

describe('game rooms', () => {
  it('defines a free practice room that needs no wallet and mints nothing', () => {
    const practice = getRoom('practice');
    expect(practice.entryFee).toBe('0');
    expect(practice.requiresWallet).toBe(false);
    expect(practice.mintsNft).toBe(false);
    expect(practice.leaderboardMultiplier).toBe(0);
  });

  it('reads paid entry fees from configuration, not literals in components', () => {
    expect(getRoom('bronze').entryFee).toBe(process.env.NEXT_PUBLIC_ENTRY_FEE_BRONZE || '0.01');
    expect(getRoom('silver').entryFee).toBe(process.env.NEXT_PUBLIC_ENTRY_FEE_SILVER || '0.05');
    expect(getRoom('legendary').entryFee).toBe(process.env.NEXT_PUBLIC_ENTRY_FEE_LEGENDARY || '0.1');
  });

  it('increases the leaderboard multiplier with the entry tier', () => {
    const paid = GAME_ROOMS.filter((room) => !room.usesVirtualCredits);
    const multipliers = paid.map((room) => room.leaderboardMultiplier);
    expect(multipliers).toEqual([...multipliers].sort((a, b) => a - b));
  });
});

describe('champions', () => {
  it('ships five champions with no gameplay effect yet', () => {
    expect(CHAMPIONS).toHaveLength(5);
    for (const champion of CHAMPIONS) {
      expect(champion.ability.key).toBe('none');
    }
  });

  it('never picks the player champion as the opponent', () => {
    for (const champion of CHAMPIONS) {
      for (let seed = 0; seed < 20; seed += 1) {
        expect(opponentFor(champion.key, seed).key).not.toBe(champion.key);
      }
    }
  });
});

describe('achievements', () => {
  it('unlocks nothing for a brand new player', () => {
    const results = evaluateAchievements({});
    expect(results.every((a) => !a.unlocked)).toBe(true);
  });

  it('unlocks the level milestones once reached', () => {
    const results = evaluateAchievements({ runs: 1, claimed: 1, bestLevel: 10 });
    const byKey = Object.fromEntries(results.map((a) => [a.key, a.unlocked]));
    expect(byKey['level-5']).toBe(true);
    expect(byKey['level-10']).toBe(true);
    expect(byKey['level-15']).toBe(false);
  });
});
