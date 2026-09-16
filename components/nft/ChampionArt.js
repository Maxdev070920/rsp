'use client';

import { useMemo } from 'react';
import { championSvg } from '@/lib/art/rewardArt';

export default function ChampionArt({ champion, size = 180, pose = 'idle', className = '' }) {
  const markup = useMemo(() => championSvg({ champion, size, pose }), [champion, size, pose]);
  return (
    <div
      className={className}
      style={{ width: size, height: size, maxWidth: '100%' }}
      dangerouslySetInnerHTML={{ __html: markup }}
    />
  );
}
