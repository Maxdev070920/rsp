import { rewardSvg } from '@/lib/art/rewardArt';
import { getRewardByKey } from '@/config/rewards';

/** Serves the generated reward artwork. Used as the NFT metadata image URL. */
export async function GET(request, context) {
  const { key } = await context.params;
  const reward = getRewardByKey(key);
  if (!reward) return new Response('Not found', { status: 404 });

  const url = new URL(request.url);
  const tierParam = url.searchParams.get('tier');
  const tier = ['standard', 'enhanced', 'premium'].includes(tierParam) ? tierParam : 'standard';
  const size = Math.min(Math.max(Number(url.searchParams.get('size')) || 640, 64), 1600);

  return new Response(rewardSvg({ rewardKey: key, tier, size }), {
    headers: {
      'content-type': 'image/svg+xml; charset=utf-8',
      'cache-control': 'public, max-age=31536000, immutable',
    },
  });
}
