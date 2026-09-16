'use client';

import { useEffect, useState } from 'react';
import Badge from '@/components/ui/Badge';
import { api } from '@/lib/apiClient';

/**
 * Always-visible honesty indicator: demo vs blockchain, which randomness
 * provider is live, and whether data is persisted.
 */
export default function ModeBadge({ detailed = false }) {
  const [health, setHealth] = useState(null);

  useEffect(() => {
    api
      .get('/api/health')
      .then(setHealth)
      .catch(() => setHealth(null));
  }, []);

  if (!health) return null;

  const demo = health.mode === 'demo';

  if (!detailed) {
    return (
      <Badge tone={demo ? 'ember' : 'aurora'}>
        <span aria-hidden="true">{demo ? '◇' : '◆'}</span>
        {demo ? 'Demo mode' : 'Testnet mode'}
      </Badge>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Badge tone={demo ? 'ember' : 'aurora'}>{demo ? 'Demo mode — no blockchain' : `Chain ${health.chainId}`}</Badge>
      <Badge tone="nebula">Randomness: {health.randomness.mode}</Badge>
      <Badge tone={health.database.persistent ? 'success' : 'neutral'}>
        {health.database.persistent ? 'Persistent database' : 'In-memory database'}
      </Badge>
      <Badge tone={health.minting.onChain ? 'signal' : 'neutral'}>
        {health.minting.onChain ? 'On-chain minting' : 'Simulated minting'}
      </Badge>
    </div>
  );
}
