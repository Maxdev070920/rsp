import Link from 'next/link';
import Badge from '@/components/ui/Badge';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import RewardArt from '@/components/nft/RewardArt';
import ChampionArt from '@/components/nft/ChampionArt';
import PlayFreeButton from '@/components/game/PlayFreeButton';
import ConnectWalletCta from '@/components/wallet/ConnectWalletCta';
import LeaderboardTable from '@/components/leaderboard/LeaderboardTable';
import ModeBadge from '@/components/layout/ModeBadge';
import { REWARD_DEFINITIONS } from '@/config/rewards';
import { CHAMPIONS } from '@/config/characters';
import { GAME_ROOMS } from '@/config/rooms';
import { getLeaderboard } from '@/services/leaderboardService';
import { percentLabel } from '@/lib/game/probability';

export const dynamic = 'force-dynamic';

const FEATURED = [4, 9, 12, 15].map((level) => REWARD_DEFINITIONS[level - 1]);

const STEPS = [
  {
    title: 'Pick an arena',
    body: 'Practice is free and needs no wallet. Bronze, Silver, and Legendary charge a configurable testnet entry fee and mint what you claim.',
  },
  {
    title: 'Throw, and resolve',
    body: 'Rock beats Scissors, Scissors beats Paper, Paper beats Rock. A tie is replayed at the same level — it costs you nothing.',
  },
  {
    title: 'Claim or push on',
    body: 'Every resolved win unlocks the next reward tier and a choice: bank it now, or risk it for the tier above.',
  },
  {
    title: 'Lose it or mint it',
    body: 'Lose a resolved round while holding an unclaimed reward and it is gone. Claim it, and it is yours — minted as an NFT in blockchain mode.',
  },
];

export default async function LandingPage() {
  const leaderboard = await getLeaderboard({ limit: 5 });

  return (
    <div className="mx-auto max-w-7xl px-4 pb-10 pt-10 sm:px-6 sm:pt-16">
      <section className="grid items-center gap-10 lg:grid-cols-[1.15fr_1fr]">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="nebula">15 reward tiers</Badge>
            <Badge tone="aurora">Testnet by default</Badge>
            <ModeBadge />
          </div>

          <h1 className="mt-5 font-display text-4xl font-black leading-[1.05] tracking-tight text-white text-balance sm:text-6xl">
            Fifteen rounds stand between you and the{' '}
            <span className="bg-gradient-to-r from-ember via-nebula to-aurora bg-clip-text text-transparent">
              Eternal Singularity
            </span>
          </h1>

          <p className="mt-5 max-w-xl text-base leading-relaxed text-slate-300">
            Elemental RPS Arena is Rock–Paper–Scissors with a ladder attached. Each resolved win unlocks a rarer
            collectible and one honest question: claim it, or risk it. Ties are free. Losses are not.
          </p>

          <div className="mt-7 flex flex-wrap gap-3">
            <PlayFreeButton />
            <ConnectWalletCta />
            <Button href="/rooms" variant="quiet" size="lg">
              Browse arenas →
            </Button>
          </div>

          <dl className="mt-8 grid max-w-lg grid-cols-3 gap-3">
            {[
              ['Reward tiers', '15'],
              ['Top-tier odds', '1 in 32,768'],
              ['Wallet required', 'Never, to practice'],
            ].map(([label, value]) => (
              <div key={label} className="panel-inset px-3 py-2.5">
                <dt className="label-eyebrow">{label}</dt>
                <dd className="font-display text-base font-bold text-white">{value}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="relative">
          <div aria-hidden="true" className="absolute -inset-6 rounded-[2rem] bg-nebula/10 blur-3xl" />
          <Card className="relative">
            <div className="flex items-center justify-between">
              <p className="label-eyebrow">Featured rewards</p>
              <Link href="/collection" className="text-xs text-aurora underline underline-offset-4">
                See all 15
              </Link>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3">
              {FEATURED.map((reward) => (
                <div key={reward.key} className="flex flex-col items-center gap-1.5">
                  <RewardArt rewardKey={reward.key} tier={reward.level > 12 ? 'premium' : 'enhanced'} size={128} />
                  <p className="font-display text-xs font-bold text-white">{reward.name}</p>
                  <p className="text-[10px] text-slate-400">
                    Lv {reward.level} · {reward.probabilityLabel}
                  </p>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </section>

      <section aria-labelledby="how-it-works" className="mt-20">
        <h2 id="how-it-works" className="font-display text-2xl font-black text-white">
          How the game works
        </h2>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((step, index) => (
            <Card key={step.title} className="h-full">
              <span className="font-display text-3xl font-black text-nebula/50">{String(index + 1).padStart(2, '0')}</span>
              <h3 className="mt-2 font-display text-base font-bold text-white">{step.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-400">{step.body}</p>
            </Card>
          ))}
        </div>
      </section>

      <section aria-labelledby="fairness" className="mt-20 grid gap-6 lg:grid-cols-[1fr_1fr]">
        <Card>
          <h2 id="fairness" className="font-display text-2xl font-black text-white">
            How fairness works
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-slate-300">
            The opponent&rsquo;s throw is never generated in your browser. When a run starts, the server publishes a
            commitment — a SHA-256 hash of a seed it has already fixed. Every round&rsquo;s move is derived from that seed,
            and when the run ends the seed is revealed so you can recompute every single round yourself.
          </p>
          <ul className="mt-4 space-y-2 text-sm text-slate-300">
            {[
              'Each resolved round is an even 50/50 — no house edge is applied to the throw.',
              'Reaching level n has probability 1 / 2ⁿ, because ties are replayed and count as neither win nor loss.',
              'Outcomes, levels, and claims are all decided server-side. The browser cannot change any of them.',
              'The randomness provider is swappable: simulated, commit–reveal, or an on-chain VRF.',
            ].map((line) => (
              <li key={line} className="flex gap-2">
                <span aria-hidden="true" className="text-aurora">
                  ◆
                </span>
                <span>{line}</span>
              </li>
            ))}
          </ul>
          <Button href="/rules" variant="ghost" size="sm" className="mt-5">
            Read the full fairness page
          </Button>
        </Card>

        <Card>
          <h2 className="font-display text-2xl font-black text-white">The odds, stated plainly</h2>
          <table className="mt-4 w-full text-sm">
            <thead>
              <tr className="text-[11px] uppercase tracking-wider text-slate-400">
                <th scope="col" className="py-2 text-left">Level</th>
                <th scope="col" className="py-2 text-left">Reward</th>
                <th scope="col" className="py-2 text-right">Chance</th>
              </tr>
            </thead>
            <tbody>
              {[1, 3, 5, 8, 10, 13, 15].map((level) => {
                const reward = REWARD_DEFINITIONS[level - 1];
                return (
                  <tr key={level} className="border-t border-arena-edge/40">
                    <td className="py-2 font-mono text-slate-300">{level}</td>
                    <td className="py-2 text-white">{reward.name}</td>
                    <td className="py-2 text-right text-ember">
                      {reward.probabilityLabel}{' '}
                      <span className="text-slate-500">({percentLabel(reward.probability)})</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      </section>

      <section aria-labelledby="champions" className="mt-20">
        <h2 id="champions" className="font-display text-2xl font-black text-white">
          Meet the champions
        </h2>
        <p className="mt-2 text-sm text-slate-400">
          Cosmetic for now. The system is built so abilities can arrive later without touching the rules.
        </p>
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {CHAMPIONS.map((champion) => (
            <Card key={champion.key} className="flex flex-col items-center text-center">
              <ChampionArt champion={champion} size={120} />
              <h3 className="mt-2 font-display text-sm font-black text-white">{champion.name}</h3>
              <p className="text-[11px] uppercase tracking-wider text-aurora">{champion.title}</p>
              <p className="mt-2 text-xs leading-relaxed text-slate-400">{champion.bio}</p>
            </Card>
          ))}
        </div>
      </section>

      <section aria-labelledby="arenas" className="mt-20">
        <h2 id="arenas" className="font-display text-2xl font-black text-white">
          Four arenas
        </h2>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {GAME_ROOMS.map((room) => (
            <Card key={room.key} className="h-full">
              <Badge tone={room.accent}>{room.difficulty}</Badge>
              <h3 className="mt-2 font-display text-base font-bold text-white">{room.name}</h3>
              <p className="mt-1 text-xs text-slate-400">{room.tagline}</p>
              <p className="mt-3 font-display text-lg font-black text-ember">
                {room.usesVirtualCredits ? 'Free' : `${room.entryFee} ${room.currency}`}
              </p>
              <p className="text-[11px] text-slate-500">
                {room.leaderboardMultiplier === 0 ? 'Unranked' : `${room.leaderboardMultiplier}× leaderboard score`}
              </p>
            </Card>
          ))}
        </div>
        <Button href="/rooms" variant="primary" className="mt-5">
          Choose an arena
        </Button>
      </section>

      <section aria-labelledby="leaderboard-preview" className="mt-20">
        <div className="mb-4 flex items-baseline justify-between">
          <h2 id="leaderboard-preview" className="font-display text-2xl font-black text-white">
            Current leaderboard
          </h2>
          <Link href="/leaderboard" className="text-sm text-aurora underline underline-offset-4">
            Full rankings
          </Link>
        </div>
        <LeaderboardTable entries={leaderboard} compact />
      </section>

      <section className="panel mt-20 flex flex-col items-center gap-4 px-6 py-12 text-center">
        <h2 className="font-display text-3xl font-black text-white">Start with a free run</h2>
        <p className="max-w-lg text-sm text-slate-400">
          Practice Arena uses the same rules, the same ladder, and the same odds as the paid arenas. No wallet, no
          sign-up, no cost.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <PlayFreeButton />
          <Button href="/rules" variant="ghost" size="lg">
            Read the rules first
          </Button>
        </div>
      </section>
    </div>
  );
}
