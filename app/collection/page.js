'use client';

import { useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/apiClient';
import RewardCard from '@/components/nft/RewardCard';
import NftDetailModal from '@/components/nft/NftDetailModal';
import Spinner from '@/components/ui/Spinner';
import Badge from '@/components/ui/Badge';
import EmptyState from '@/components/ui/EmptyState';
import { REWARD_CATEGORIES } from '@/config/rewards';
import { GAME_ROOMS, getRoom } from '@/config/rooms';

const OWNERSHIP = [
  { key: 'all', label: 'All tiers' },
  { key: 'earned', label: 'Earned' },
  { key: 'locked', label: 'Not yet earned' },
];

export default function CollectionPage() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [ownership, setOwnership] = useState('all');
  const [category, setCategory] = useState('all');
  const [roomFilter, setRoomFilter] = useState('all');
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    api
      .get('/api/collection')
      .then(setData)
      .catch((err) => setError(err.message));
  }, []);

  const filtered = useMemo(() => {
    if (!data) return [];
    return data.rewards.filter(({ definition, earned }) => {
      const matchingEarned = roomFilter === 'all' ? earned : earned.filter((entry) => entry.room_key === roomFilter);
      if (ownership === 'earned' && matchingEarned.length === 0) return false;
      if (ownership === 'locked' && matchingEarned.length > 0) return false;
      if (category !== 'all' && definition.category !== category) return false;
      return true;
    });
  }, [data, ownership, category, roomFilter]);

  const earnedCount = data?.earnedCount ?? 0;

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <header className="mb-6">
        <h1 className="font-display text-3xl font-black text-white sm:text-4xl">Your collection</h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-400">
          All fifteen reward tiers, whether you have earned them or not. Each tier&rsquo;s artwork is generated from its own
          palette and glyph — nothing here is a stock asset.
        </p>
        {data && (
          <div className="mt-4 flex flex-wrap gap-2">
            <Badge tone="nebula">
              {earnedCount} earned of {data.rewards.length} tiers
            </Badge>
            <Badge tone="signal">{data.totalMints ?? 0} minted</Badge>
          </div>
        )}
      </header>

      <div className="panel mb-6 flex flex-wrap gap-4 p-4">
        <Filter label="Ownership" value={ownership} onChange={setOwnership} options={OWNERSHIP.map((o) => [o.key, o.label])} />
        <Filter
          label="Rarity category"
          value={category}
          onChange={setCategory}
          options={[['all', 'All categories'], ...REWARD_CATEGORIES.map((c) => [c, c])]}
        />
        <Filter
          label="Arena"
          value={roomFilter}
          onChange={setRoomFilter}
          options={[['all', 'All arenas'], ...GAME_ROOMS.map((r) => [r.key, r.name])]}
        />
      </div>

      {error && <EmptyState icon="⚠" title="Could not load your collection" description={error} />}

      {!data && !error && (
        <div className="flex justify-center py-20">
          <Spinner label="Loading collection…" />
        </div>
      )}

      {data && filtered.length === 0 && (
        <EmptyState
          icon="✦"
          title="Nothing matches these filters"
          description="Try widening the filters, or play a run to start unlocking tiers."
          actionLabel="Play a run"
          actionHref="/rooms"
        />
      )}

      {data && filtered.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {filtered.map(({ definition, earned }) => (
            <RewardCard
              key={definition.key}
              definition={definition}
              earned={roomFilter === 'all' ? earned : earned.filter((e) => e.room_key === roomFilter)}
              tier={getRoom(earned[0]?.room_key)?.artworkTier || 'standard'}
              onSelect={(def, entries) => setSelected({ definition: def, entries })}
            />
          ))}
        </div>
      )}

      <NftDetailModal
        open={Boolean(selected)}
        onClose={() => setSelected(null)}
        definition={selected?.definition}
        entries={selected?.entries || []}
      />
    </div>
  );
}

function Filter({ label, value, onChange, options }) {
  const id = `filter-${label.replace(/\s+/g, '-').toLowerCase()}`;
  return (
    <div>
      <label htmlFor={id} className="label-eyebrow block">
        {label}
      </label>
      <select
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 rounded-lg border border-arena-edge bg-arena-deep px-3 py-2 text-sm text-slate-200"
      >
        {options.map(([key, text]) => (
          <option key={key} value={key}>
            {text}
          </option>
        ))}
      </select>
    </div>
  );
}
