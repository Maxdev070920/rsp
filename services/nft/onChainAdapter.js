import { MintNotAvailableError, NftAdapter } from './adapter';
import { publicEnv } from '@/config/env';

/**
 * On-chain minting against the deployed rewards contract.
 *
 * The server does not hold a minting key in this build. The intended production
 * shape is either:
 *   (a) the server signs an EIP-712 mint authorisation and the *player* submits
 *       the transaction and pays gas, or
 *   (b) a separately-deployed signer service (KMS-held key) relays the mint.
 *
 * Until one of those is configured this adapter refuses loudly rather than
 * silently downgrading to a simulated mint.
 */
export class OnChainNftAdapter extends NftAdapter {
  get name() {
    return 'onchain-mint-v1';
  }

  get onChain() {
    return true;
  }

  async mint() {
    throw new MintNotAvailableError(
      'On-chain minting requires a deployed rewards contract and a configured mint authoriser. ' +
        'Set NEXT_PUBLIC_REWARDS_CONTRACT_ADDRESS and provide a signing service, or run with NEXT_PUBLIC_CHAIN_MODE=demo.'
    );
  }

  get configured() {
    return Boolean(publicEnv.rewardsContract);
  }
}
