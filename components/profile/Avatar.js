'use client';

import { useMemo } from 'react';
import { avatarSvg } from '@/lib/art/rewardArt';

export default function Avatar({ seed = 'challenger', size = 96, className = '' }) {
  const markup = useMemo(() => avatarSvg({ seed: String(seed).replace(/[^a-zA-Z0-9-]/g, '') || 'challenger', size }), [seed, size]);
  return <div className={className} style={{ width: size, height: size }} dangerouslySetInnerHTML={{ __html: markup }} />;
}
