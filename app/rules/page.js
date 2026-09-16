import LegalPage, { Bullets, Section } from '@/components/layout/LegalPage';
import Card from '@/components/ui/Card';
import ModeBadge from '@/components/layout/ModeBadge';
import { REWARD_DEFINITIONS } from '@/config/rewards';
import { percentLabel } from '@/lib/game/probability';

export const metadata = { title: 'Rules & fairness' };
export const dynamic = 'force-dynamic';

export default function RulesPage() {
  return (
    <LegalPage
      title="Rules & fairness"
      intro="Everything about how a round resolves, how the ladder works, and how you can check the randomness yourself."
    >
      <div>
        <ModeBadge detailed />
      </div>

      <Section title="The vocabulary">
        <Bullets
          items={[
            <><strong className="text-white">Game round</strong> — one throw by you and one by the opponent. Every throw is a game round, including ties.</>,
            <><strong className="text-white">Resolved round</strong> — a game round that ended in a win or a loss. Ties are game rounds but not resolved rounds.</>,
            <><strong className="text-white">Tie</strong> — both sides threw the same move. The reward level is unchanged and you throw again. A tie costs nothing and gains nothing.</>,
            <><strong className="text-white">Reward level</strong> — how far up the 15-tier ladder you currently stand. It advances by exactly one on each resolved win.</>,
            <><strong className="text-white">Run</strong> — one continuous attempt, from entry to either a claim or a resolved loss.</>,
            <><strong className="text-white">NFT claim</strong> — the act of ending your run to keep the reward at your current level. In blockchain mode the claim mints it.</>,
          ]}
        />
      </Section>

      <Section title="Core rules">
        <Bullets
          items={[
            'You choose Rock, Paper, or Scissors. The opponent\'s choice is generated server-side from a pre-committed seed.',
            'Rock defeats Scissors. Scissors defeats Paper. Paper defeats Rock.',
            'A tie does not end the run and does not change your reward level. You replay the same level.',
            'A resolved win advances you exactly one reward level.',
            'A resolved loss ends the run immediately.',
            'After every win you choose: Claim Reward, or Continue.',
            'Claiming ends the run and awards the reward at your current level.',
            'Continuing puts the reward you are holding entirely at risk.',
            'If you lose before claiming, you receive nothing from that run — not a lower tier, not a partial reward.',
            'The maximum run is 15 successful levels. Winning level 15 claims the highest reward automatically; you are not asked.',
          ]}
        />
      </Section>

      <Section title="The odds">
        <p>
          Each resolved round is an even 50/50. Because ties are replayed and count as neither a win nor a loss, the
          probability of reaching reward level n from the start of a run is exactly 1 / 2<sup>n</sup>.
        </p>
        <Card className="overflow-x-auto p-0">
          <table className="w-full min-w-[420px] text-left text-sm">
            <caption className="sr-only">Probability of reaching each reward level</caption>
            <thead>
              <tr className="border-b border-arena-edge/70 text-[11px] uppercase tracking-wider text-slate-400">
                <th scope="col" className="px-4 py-3">Level</th>
                <th scope="col" className="px-4 py-3">Reward</th>
                <th scope="col" className="px-4 py-3 text-right">Odds</th>
                <th scope="col" className="px-4 py-3 text-right">Percent</th>
              </tr>
            </thead>
            <tbody>
              {REWARD_DEFINITIONS.map((reward) => (
                <tr key={reward.key} className="border-b border-arena-edge/30 last:border-0">
                  <td className="px-4 py-2 font-mono text-slate-400">{reward.level}</td>
                  <td className="px-4 py-2 text-white">{reward.name}</td>
                  <td className="px-4 py-2 text-right text-ember">{reward.probabilityLabel}</td>
                  <td className="px-4 py-2 text-right text-slate-400">{percentLabel(reward.probability)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
        <p className="text-xs text-slate-500">
          These are the odds for a whole run. From where you are standing right now, the next resolved round is always a
          flat 50%, no matter how long your streak is. Past rounds do not make the next one more or less likely.
        </p>
      </Section>

      <Section title="How randomness works">
        <p>
          The opponent&rsquo;s move is never generated in your browser, and never with <code className="text-aurora">Math.random()</code>.
          The current provider is shown in the badge above.
        </p>
        <ol className="list-decimal space-y-2 pl-5">
          <li>
            When a run starts, the server derives a seed for that run and publishes a{' '}
            <strong className="text-white">commitment</strong>: the SHA-256 hash of the seed. It is fixed before your
            first throw.
          </li>
          <li>
            Each round&rsquo;s opponent move is HMAC-SHA256(seed, &ldquo;runId:roundNumber&rdquo;), reduced to one of the three moves.
            Your throw is not an input, so the result cannot be steered after seeing it.
          </li>
          <li>
            When the run ends, the server reveals the seed. Your browser can hash it to check it matches the commitment,
            then recompute every round. The &ldquo;Verify randomness in my browser&rdquo; button on the history page does exactly
            this, locally.
          </li>
        </ol>
        <p>
          The provider is an interface, not a hard-coded function. Commit–reveal can be swapped for an on-chain
          verifiable random function without any change to the game rules.
        </p>
      </Section>

      <Section title="What the server decides, and what your browser decides">
        <p>
          Your browser decides exactly one thing: which move you throw. Everything else — the opponent&rsquo;s move, whether
          the round was a win, what your reward level is, whether a claim is allowed, and whether a mint happens — is
          decided on the server and recorded there. A modified client cannot change any outcome.
        </p>
      </Section>

      <Section title="Practice Arena">
        <p>
          Practice Arena uses the identical engine, the identical ladder, and the identical odds. It needs no wallet and
          no account, costs nothing, mints nothing, and does not affect the leaderboard.
        </p>
      </Section>
    </LegalPage>
  );
}
