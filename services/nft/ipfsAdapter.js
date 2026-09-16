import { publicEnv } from '@/config/env';

/**
 * Metadata storage.
 *
 * Demo mode serves metadata from the app's own route handler, which is stable
 * and inspectable. Production should pin the same JSON to IPFS and store the
 * returned CID — the adapter boundary means only this file changes.
 */
export class MetadataStore {
  constructor({ pinningEndpoint = process.env.IPFS_PINNING_ENDPOINT, token = process.env.IPFS_PINNING_TOKEN } = {}) {
    this.pinningEndpoint = pinningEndpoint;
    this.token = token;
  }

  get configured() {
    return Boolean(this.pinningEndpoint && this.token);
  }

  get mode() {
    return this.configured ? 'ipfs' : 'hosted';
  }

  /** @returns {Promise<{url: string, gatewayUrl: string, cid: string|null, mode: string}>} */
  async store({ earnedRewardId, metadata }) {
    if (!this.configured) {
      const url = `${publicEnv.appUrl}/api/metadata/${earnedRewardId}`;
      return { url, gatewayUrl: url, cid: null, mode: 'hosted' };
    }

    const response = await fetch(this.pinningEndpoint, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${this.token}` },
      body: JSON.stringify(metadata),
    });
    if (!response.ok) {
      throw Object.assign(new Error(`IPFS pinning failed with status ${response.status}`), {
        code: 'IPFS_PIN_FAILED',
        status: 502,
      });
    }
    const data = await response.json();
    const cid = data.IpfsHash || data.cid || data.value?.cid;
    return {
      url: `ipfs://${cid}`,
      gatewayUrl: `https://ipfs.io/ipfs/${cid}`,
      cid,
      mode: 'ipfs',
    };
  }
}
