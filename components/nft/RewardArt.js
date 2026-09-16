'use client';

import { useMemo } from 'react';
import { rewardSvg } from '@/lib/art/rewardArt';

/**
 * Renders generated reward artwork. The SVG string is produced entirely from
 * the fixed tier palette in `config/rewards.js` — no user input reaches it, so
 * injecting it as markup carries no XSS surface.
 */
export default function RewardArt({ rewardKey, tier = 'standard', size = 220, locked = false, className = '' }) {
  const markup = useMemo(() => rewardSvg({ rewardKey, tier, size, locked }), [rewardKey, tier, size, locked]);

  return (
    <div
      className={`overflow-hidden rounded-2xl ${className}`}
      style={{ width: size, height: size, maxWidth: '100%' }}
      dangerouslySetInnerHTML={{ __html: markup }}
    />
  );
}
