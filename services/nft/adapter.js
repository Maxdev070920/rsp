/**
 * NFT minting adapter interface.
 *
 * The game never talks to a contract directly. It asks an adapter to mint, and
 * receives a normalised result, so demo mode and on-chain mode are
 * interchangeable from the run service's point of view.
 */
export class NftAdapter {
  get name() {
    throw new Error('NftAdapter.name must be implemented');
  }

  /** @returns {boolean} true when a real chain write occurs. */
  get onChain() {
    return false;
  }

  /**
   * @returns {Promise<{status: 'MINTED'|'PENDING'|'SIMULATED', tokenId: string|null,
   *   contractAddress: string|null, txHash: string|null, chainId: number|null,
   *   metadataUrl: string, owner: string|null}>}
   */
  async mint(_request) {
    throw new Error('NftAdapter.mint must be implemented');
  }

  async status(_reference) {
    return null;
  }
}

export class MintNotAvailableError extends Error {
  constructor(detail) {
    super(detail);
    this.name = 'MintNotAvailableError';
    this.code = 'MINT_UNAVAILABLE';
    this.status = 503;
  }
}
