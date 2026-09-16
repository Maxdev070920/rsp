import { getRewardByKey } from '@/config/rewards';

/**
 * Procedural reward artwork.
 *
 * Every mark is generated here from the tier's palette and glyph id — there is
 * no imported, traced, or third-party artwork anywhere in this file. Output is
 * deterministic, so the same tier always renders identically in the collection
 * grid, the NFT metadata image, and the claim animation.
 *
 * `tier` maps to the arena artwork tiers: standard, enhanced, premium.
 */

const TIER_TREATMENT = {
  standard: { rings: 1, rays: 0, sparkle: 0, frame: 1 },
  enhanced: { rings: 2, rays: 8, sparkle: 4, frame: 2 },
  premium: { rings: 3, rays: 16, sparkle: 9, frame: 3 },
};

/** Small deterministic PRNG so sparkle placement is stable per tier. */
function seeded(seedText) {
  let h = 2166136261;
  for (let i = 0; i < seedText.length; i += 1) {
    h ^= seedText.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return () => {
    h ^= h << 13;
    h ^= h >>> 17;
    h ^= h << 5;
    return ((h >>> 0) % 10000) / 10000;
  };
}

const poly = (points) => points.map(([x, y]) => `${x.toFixed(2)},${y.toFixed(2)}`).join(' ');

function starPoints(cx, cy, outer, inner, spikes, rotation = -Math.PI / 2) {
  const points = [];
  for (let i = 0; i < spikes * 2; i += 1) {
    const radius = i % 2 === 0 ? outer : inner;
    const angle = rotation + (i * Math.PI) / spikes;
    points.push([cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius]);
  }
  return points;
}

function glyphMarkup(glyph, palette, fillId) {
  const cx = 160;
  const cy = 160;
  const stroke = palette.via;

  switch (glyph) {
    case 'shard':
      return `<polygon points="${poly([[cx, cy - 78], [cx + 40, cy + 10], [cx, cy + 82], [cx - 40, cy + 10]])}" fill="url(#${fillId})" stroke="${stroke}" stroke-width="3"/>`;
    case 'bulwark':
      return `<path d="M ${cx - 58} ${cy - 62} L ${cx + 58} ${cy - 62} L ${cx + 58} ${cy + 18} Q ${cx} ${cy + 92} ${cx - 58} ${cy + 18} Z" fill="url(#${fillId})" stroke="${stroke}" stroke-width="3"/>`;
    case 'crescent':
      return `<path d="M ${cx + 12} ${cy - 76} A 76 76 0 1 0 ${cx + 12} ${cy + 76} A 58 58 0 1 1 ${cx + 12} ${cy - 76} Z" fill="url(#${fillId})" stroke="${stroke}" stroke-width="3"/>`;
    case 'crown':
      return `<polygon points="${poly([[cx - 70, cy + 50], [cx - 70, cy - 46], [cx - 32, cy - 6], [cx, cy - 62], [cx + 32, cy - 6], [cx + 70, cy - 46], [cx + 70, cy + 50]])}" fill="url(#${fillId})" stroke="${stroke}" stroke-width="3"/>`;
    case 'halo':
      return `<circle cx="${cx}" cy="${cy}" r="62" fill="none" stroke="url(#${fillId})" stroke-width="18"/><circle cx="${cx}" cy="${cy}" r="30" fill="${stroke}" opacity="0.5"/>`;
    case 'rift':
      return `<path d="M ${cx - 20} ${cy - 84} L ${cx + 26} ${cy - 22} L ${cx - 6} ${cy - 10} L ${cx + 30} ${cy + 86} L ${cx - 30} ${cy + 6} L ${cx + 4} ${cy - 4} Z" fill="url(#${fillId})" stroke="${stroke}" stroke-width="3"/>`;
    case 'prism':
      return `<polygon points="${poly([[cx, cy - 80], [cx + 70, cy + 40], [cx - 70, cy + 40]])}" fill="url(#${fillId})" stroke="${stroke}" stroke-width="3"/><line x1="${cx}" y1="${cy - 80}" x2="${cx}" y2="${cy + 40}" stroke="${stroke}" stroke-width="2" opacity="0.7"/>`;
    case 'flare':
      return `<polygon points="${poly(starPoints(cx, cy, 84, 22, 4))}" fill="url(#${fillId})" stroke="${stroke}" stroke-width="2"/>`;
    case 'leafstar':
      return `<polygon points="${poly(starPoints(cx, cy, 80, 34, 6))}" fill="url(#${fillId})" stroke="${stroke}" stroke-width="2"/>`;
    case 'pyre':
      return `<path d="M ${cx} ${cy - 86} Q ${cx + 52} ${cy - 20} ${cx + 34} ${cy + 26} Q ${cx + 60} ${cy + 20} ${cx + 44} ${cy + 66} L ${cx - 44} ${cy + 66} Q ${cx - 60} ${cy + 20} ${cx - 34} ${cy + 26} Q ${cx - 52} ${cy - 20} ${cx} ${cy - 86} Z" fill="url(#${fillId})" stroke="${stroke}" stroke-width="3"/>`;
    case 'tide':
      return `<path d="M ${cx - 80} ${cy + 10} Q ${cx - 40} ${cy - 46} ${cx} ${cy + 10} T ${cx + 80} ${cy + 10} L ${cx + 80} ${cy + 58} L ${cx - 80} ${cy + 58} Z" fill="url(#${fillId})" stroke="${stroke}" stroke-width="3"/><path d="M ${cx - 80} ${cy - 30} Q ${cx - 40} ${cy - 86} ${cx} ${cy - 30} T ${cx + 80} ${cy - 30}" fill="none" stroke="${stroke}" stroke-width="3" opacity="0.65"/>`;
    case 'apex':
      return `<polygon points="${poly([[cx, cy - 88], [cx + 56, cy - 26], [cx + 34, cy + 74], [cx - 34, cy + 74], [cx - 56, cy - 26]])}" fill="url(#${fillId})" stroke="${stroke}" stroke-width="3"/><polyline points="${poly([[cx - 56, cy - 26], [cx, cy + 74], [cx + 56, cy - 26]])}" fill="none" stroke="${stroke}" stroke-width="2" opacity="0.6"/>`;
    case 'orbit':
      return `<circle cx="${cx}" cy="${cy}" r="34" fill="url(#${fillId})"/><ellipse cx="${cx}" cy="${cy}" rx="86" ry="32" fill="none" stroke="${stroke}" stroke-width="4" transform="rotate(-22 ${cx} ${cy})"/><ellipse cx="${cx}" cy="${cy}" rx="86" ry="32" fill="none" stroke="${stroke}" stroke-width="2" opacity="0.6" transform="rotate(36 ${cx} ${cy})"/>`;
    case 'singularity':
    default:
      return `<circle cx="${cx}" cy="${cy}" r="26" fill="#05030d"/><circle cx="${cx}" cy="${cy}" r="26" fill="none" stroke="url(#${fillId})" stroke-width="6"/><polygon points="${poly(starPoints(cx, cy, 96, 18, 8))}" fill="url(#${fillId})" opacity="0.85"/><circle cx="${cx}" cy="${cy}" r="64" fill="none" stroke="${stroke}" stroke-width="1.5" opacity="0.5"/>`;
  }
}

export function rewardSvg({ rewardKey, tier = 'standard', size = 320, locked = false }) {
  const reward = getRewardByKey(rewardKey);
  if (!reward) return '';

  const treatment = TIER_TREATMENT[tier] || TIER_TREATMENT.standard;
  const palette = locked
    ? { from: '#1a1830', via: '#3a3560', to: '#0c0a1a' }
    : { from: reward.from, via: reward.via, to: reward.to };
  const rand = seeded(`${reward.key}:${tier}`);
  const id = `${reward.key}-${tier}${locked ? '-locked' : ''}`;

  const rings = Array.from({ length: treatment.rings }, (_, i) => {
    const r = 124 + i * 14;
    return `<circle cx="160" cy="160" r="${r}" fill="none" stroke="${palette.via}" stroke-width="${1.5 - i * 0.3}" opacity="${0.35 - i * 0.08}"/>`;
  }).join('');

  const rays = Array.from({ length: treatment.rays }, (_, i) => {
    const angle = (i / treatment.rays) * Math.PI * 2;
    const inner = 116;
    const outer = 150;
    return `<line x1="${(160 + Math.cos(angle) * inner).toFixed(1)}" y1="${(160 + Math.sin(angle) * inner).toFixed(1)}" x2="${(160 + Math.cos(angle) * outer).toFixed(1)}" y2="${(160 + Math.sin(angle) * outer).toFixed(1)}" stroke="${palette.via}" stroke-width="2" opacity="0.4"/>`;
  }).join('');

  const sparkles = Array.from({ length: treatment.sparkle }, () => {
    const angle = rand() * Math.PI * 2;
    const radius = 60 + rand() * 90;
    const r = 1 + rand() * 2.4;
    return `<circle cx="${(160 + Math.cos(angle) * radius).toFixed(1)}" cy="${(160 + Math.sin(angle) * radius).toFixed(1)}" r="${r.toFixed(1)}" fill="#ffffff" opacity="${(0.25 + rand() * 0.5).toFixed(2)}"/>`;
  }).join('');

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 320" width="${size}" height="${size}" role="img" aria-label="${reward.name} reward artwork">
  <defs>
    <radialGradient id="bg-${id}" cx="50%" cy="38%" r="72%">
      <stop offset="0%" stop-color="${palette.via}" stop-opacity="0.55"/>
      <stop offset="55%" stop-color="${palette.from}" stop-opacity="0.35"/>
      <stop offset="100%" stop-color="#06040f" stop-opacity="1"/>
    </radialGradient>
    <linearGradient id="glyph-${id}" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${palette.via}"/>
      <stop offset="60%" stop-color="${palette.from}"/>
      <stop offset="100%" stop-color="${palette.to}"/>
    </linearGradient>
    <linearGradient id="frame-${id}" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${palette.via}" stop-opacity="0.9"/>
      <stop offset="100%" stop-color="${palette.to}" stop-opacity="0.5"/>
    </linearGradient>
  </defs>
  <rect width="320" height="320" rx="28" fill="#06040f"/>
  <rect width="320" height="320" rx="28" fill="url(#bg-${id})"/>
  ${rings}
  ${rays}
  ${sparkles}
  ${glyphMarkup(reward.glyph, palette, `glyph-${id}`)}
  <rect x="${6 - treatment.frame}" y="${6 - treatment.frame}" width="${308 + treatment.frame * 2}" height="${308 + treatment.frame * 2}" rx="26" fill="none" stroke="url(#frame-${id})" stroke-width="${treatment.frame + 1}"/>
  <text x="160" y="296" text-anchor="middle" font-family="ui-sans-serif, system-ui, sans-serif" font-size="15" letter-spacing="3" fill="${locked ? '#5b5580' : palette.via}" opacity="0.9">LEVEL ${reward.level}</text>
</svg>`;
}

export function championSvg({ champion, size = 220, pose = 'idle' }) {
  const { from, via, to } = champion.colors;
  const id = `${champion.key}-${pose}`;
  const tilt = pose === 'throw' ? 10 : 0;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 220 220" width="${size}" height="${size}" role="img" aria-label="${champion.name}, ${champion.title}">
  <defs>
    <radialGradient id="aura-${id}" cx="50%" cy="45%" r="60%">
      <stop offset="0%" stop-color="${via}" stop-opacity="0.75"/>
      <stop offset="70%" stop-color="${from}" stop-opacity="0.25"/>
      <stop offset="100%" stop-color="${to}" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="body-${id}" x1="20%" y1="0%" x2="80%" y2="100%">
      <stop offset="0%" stop-color="${via}"/>
      <stop offset="100%" stop-color="${to}"/>
    </linearGradient>
  </defs>
  <circle cx="110" cy="104" r="96" fill="url(#aura-${id})"/>
  <g transform="rotate(${tilt} 110 120)">
    <path d="M 110 34 L 150 76 L 138 146 L 110 176 L 82 146 L 70 76 Z" fill="url(#body-${id})" stroke="${via}" stroke-width="2.5"/>
    <circle cx="110" cy="88" r="20" fill="#06040f" opacity="0.72"/>
    <circle cx="103" cy="86" r="4.5" fill="${via}"/>
    <circle cx="118" cy="86" r="4.5" fill="${via}"/>
    <path d="M 96 120 L 124 120 L 118 140 L 102 140 Z" fill="${from}" opacity="0.85"/>
    <path d="M 70 76 L 42 106 L 62 118" fill="none" stroke="${via}" stroke-width="5" stroke-linecap="round"/>
    <path d="M 150 76 L 178 106 L 158 118" fill="none" stroke="${via}" stroke-width="5" stroke-linecap="round"/>
  </g>
</svg>`;
}

/**
 * Deterministic identicon-style avatar generated from a seed string. Original
 * geometry, no external avatar service, and no data leaves the app.
 */
export function avatarSvg({ seed = 'challenger', size = 96 }) {
  const rand = seeded(`avatar:${seed}`);
  const hue = Math.floor(rand() * 360);
  const hue2 = (hue + 60 + Math.floor(rand() * 180)) % 360;
  const cells = [];

  for (let y = 0; y < 5; y += 1) {
    for (let x = 0; x < 3; x += 1) {
      if (rand() > 0.45) {
        cells.push([x, y]);
        if (x < 2) cells.push([4 - x, y]); // mirrored for symmetry
      }
    }
  }

  const rects = cells
    .map(([x, y]) => `<rect x="${x * 20}" y="${y * 20}" width="20" height="20" fill="url(#av-${seed})" opacity="0.92"/>`)
    .join('');

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="${size}" height="${size}" role="img" aria-label="Player avatar">
  <defs>
    <linearGradient id="av-${seed}" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="hsl(${hue} 85% 65%)"/>
      <stop offset="100%" stop-color="hsl(${hue2} 80% 52%)"/>
    </linearGradient>
  </defs>
  <rect width="100" height="100" rx="18" fill="#0b0820"/>
  ${rects}
  <rect width="100" height="100" rx="18" fill="none" stroke="hsl(${hue} 70% 60%)" stroke-opacity="0.45" stroke-width="2"/>
</svg>`;
}
