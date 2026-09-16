import { isBlockchainMode } from '@/config/env';
import { getRepository } from '@/lib/database/repository';
import { AUDIT_EVENTS, audit } from '@/lib/security/audit';
import { buildRewardMetadata } from './metadata';
import { MockNftAdapter } from './nft/mockAdapter';
import { OnChainNftAdapter } from './nft/onChainAdapter';
import { MetadataStore } from './nft/ipfsAdapter';

let adapter = null;
let metadataStore = null;

export function getNftAdapter() {
  if (!adapter) adapter = isBlockchainMode ? new OnChainNftAdapter() : new MockNftAdapter();
  return adapter;
}

export function setNftAdapter(next) {
  adapter = next;
}

export function getMetadataStore() {
  if (!metadataStore) metadataStore = new MetadataStore();
  return metadataStore;
}

/**
 * Mints the reward for a settled run.
 *
 * Double-mint protection is layered: the repository enforces one mint row per
 * earned reward, and this function short-circuits on any existing non-failed
 * mint before it ever calls the adapter.
 */
export async function mintReward({ run, earnedReward, owner }) {
  const repo = getRepository();

  const existing = await repo.findMintByReward(earnedReward.id);
  if (existing && existing.status !== 'FAILED') {
    return { mint: existing, alreadyMinted: true };
  }

  const metadata = buildRewardMetadata({
    reward: { level: earnedReward.reward_level },
    run,
    earnedReward,
  });
  const stored = await getMetadataStore().store({ earnedRewardId: earnedReward.id, metadata });

  await audit(AUDIT_EVENTS.NFT_MINT_REQUESTED, {
    userId: run.userId,
    runId: run.id,
    metadata: { rewardLevel: earnedReward.reward_level, adapter: getNftAdapter().name },
  });

  let result;
  try {
    result = await getNftAdapter().mint({
      earnedRewardId: earnedReward.id,
      rewardLevel: earnedReward.reward_level,
      runId: run.id,
      owner,
      metadataUrl: stored.url,
    });
  } catch (error) {
    const failed = await repo.createMint({
      earned_reward_id: earnedReward.id,
      user_id: run.userId,
      run_id: run.id,
      status: 'FAILED',
      adapter: getNftAdapter().name,
      metadata_url: stored.url,
      error_message: error.message,
    });
    await audit(AUDIT_EVENTS.NFT_MINT_FAILED, {
      userId: run.userId,
      runId: run.id,
      metadata: { reason: error.code || error.message },
    });
    return { mint: failed, error };
  }

  const mint = await repo.createMint({
    earned_reward_id: earnedReward.id,
    user_id: run.userId,
    run_id: run.id,
    status: result.status,
    adapter: getNftAdapter().name,
    token_id: result.tokenId,
    contract_address: result.contractAddress,
    tx_hash: result.txHash,
    chain_id: result.chainId,
    metadata_url: result.metadataUrl,
    gateway_url: stored.gatewayUrl,
    owner_address: result.owner,
    simulated: Boolean(result.simulated),
  });

  await repo.updateEarnedReward(earnedReward.id, {
    token_id: result.tokenId,
    contract_address: result.contractAddress,
    tx_hash: result.txHash,
    metadata_url: result.metadataUrl,
    owner_address: result.owner,
    mint_status: result.status,
  });

  await audit(AUDIT_EVENTS.NFT_MINTED, {
    userId: run.userId,
    runId: run.id,
    metadata: { tokenId: result.tokenId, simulated: Boolean(result.simulated) },
  });

  return { mint, metadata };
}

export function describeMinting() {
  const active = getNftAdapter();
  return {
    adapter: active.name,
    onChain: active.onChain,
    metadataMode: getMetadataStore().mode,
    configured: active.onChain ? active.configured : true,
  };
}
