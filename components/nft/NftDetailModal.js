'use client';

import Modal from '@/components/ui/Modal';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import RewardArt from './RewardArt';
import { getRoom } from '@/config/rooms';
import { explorerTokenUrl, explorerTxUrl } from '@/config/chains';
import { percentLabel } from '@/lib/game/probability';

const Row = ({ label, children }) => (
  <div className="flex flex-col gap-0.5 border-b border-arena-edge/40 py-2 last:border-0 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4">
    <dt className="label-eyebrow">{label}</dt>
    <dd className="break-all text-sm text-slate-200 sm:text-right">{children}</dd>
  </div>
);

export default function NftDetailModal({ open, onClose, definition, entries = [] }) {
  if (!definition) return null;
  const primary = entries[0] || null;
  const mint = primary?.mint || null;
  const room = primary ? getRoom(primary.room_key) : null;
  const tier = room?.artworkTier || 'standard';

  return (
    <Modal open={open} onClose={onClose} title={definition.name} description={`Reward level ${definition.level} · ${definition.category}`} size="lg">
      <div className="grid gap-6 sm:grid-cols-[minmax(0,220px)_1fr]">
        <div className="mx-auto">
          <RewardArt rewardKey={definition.key} tier={tier} size={220} locked={!primary} />
          <div className="mt-3 flex flex-wrap justify-center gap-1.5">
            {primary ? <Badge tone="success">Earned</Badge> : <Badge>Not yet earned</Badge>}
            {mint?.simulated && <Badge tone="ember">Simulated mint</Badge>}
            {mint && !mint.simulated && mint.status === 'MINTED' && <Badge tone="signal">On chain</Badge>}
          </div>
        </div>

        <div>
          <p className="text-sm leading-relaxed text-slate-300">{definition.description}</p>

          <dl className="mt-4">
            <Row label="Reward level">{definition.level} of 15</Row>
            <Row label="Category">{definition.category}</Row>
            <Row label="Probability of reaching">
              {definition.probabilityLabel} ({percentLabel(definition.probability)})
            </Row>
            <Row label="Rarity score">{definition.rarityScore.toLocaleString()}</Row>
            <Row label="Arena">{room ? room.name : '—'}</Row>
            <Row label="Artwork tier">{tier}</Row>
            <Row label="Date earned">
              {primary ? new Date(primary.earned_at).toLocaleString() : '—'}
            </Row>
            <Row label="Token ID">{mint?.token_id || '—'}</Row>
            <Row label="Contract">{mint?.contract_address || '—'}</Row>
            <Row label="Transaction">{mint?.tx_hash || '—'}</Row>
            <Row label="Metadata">
              {mint?.metadata_url ? (
                <a className="link-quiet" href={mint.gateway_url || mint.metadata_url} target="_blank" rel="noreferrer noopener">
                  View metadata
                </a>
              ) : (
                '—'
              )}
            </Row>
            <Row label="Current owner">{mint?.owner_address || (primary ? 'Held off chain by your account' : '—')}</Row>
          </dl>

          {mint?.simulated && (
            <p className="panel-inset mt-4 px-3 py-2 text-xs text-amber-200">
              This mint was simulated in demo mode. No blockchain transaction exists for it, and the token id and
              transaction hash shown above are placeholders.
            </p>
          )}

          {mint && !mint.simulated && mint.chain_id && (
            <div className="mt-4 flex flex-wrap gap-2">
              {explorerTxUrl(mint.chain_id, mint.tx_hash) && (
                <Button size="sm" variant="ghost" href={explorerTxUrl(mint.chain_id, mint.tx_hash)} target="_blank" rel="noreferrer noopener">
                  View transaction
                </Button>
              )}
              {explorerTokenUrl(mint.chain_id, mint.contract_address, mint.token_id) && (
                <Button size="sm" variant="ghost" href={explorerTokenUrl(mint.chain_id, mint.contract_address, mint.token_id)} target="_blank" rel="noreferrer noopener">
                  View token
                </Button>
              )}
            </div>
          )}

          {entries.length > 1 && (
            <div className="mt-5">
              <p className="label-eyebrow mb-2">All copies ({entries.length})</p>
              <ul className="space-y-1 text-xs text-slate-400">
                {entries.map((entry) => (
                  <li key={entry.id} className="panel-inset px-3 py-1.5">
                    {new Date(entry.earned_at).toLocaleDateString()} · {getRoom(entry.room_key)?.name || entry.room_key}
                    {entry.mint?.token_id ? ` · token ${entry.mint.token_id}` : ''}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
