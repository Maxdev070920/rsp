import LegalPage, { Bullets, Section } from '@/components/layout/LegalPage';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';

export const metadata = { title: 'Responsible play' };

export default function ResponsiblePlayPage() {
  return (
    <LegalPage
      title="Responsible play"
      intro="This game is built around a deliberately tempting decision: bank a reward, or risk it for a rarer one. That structure is fun, and it is also exactly the structure that makes chance-based games hard to stop playing. Here is what is worth knowing."
    >
      <Section title="The maths does not bend">
        <Bullets
          items={[
            'Every resolved round is a flat 50/50. A long streak does not make the next round safer, and a bad run does not make the next one better. There is no such thing as being "due".',
            'Reaching level 10 happens in about 1 run in 1,024. Level 15 happens in about 1 run in 32,768. Those are the real numbers, shown on every screen.',
            'Continuing after a win risks the entire reward you are holding. There is no partial payout — a loss at level 12 pays exactly the same as a loss at level 1: nothing.',
            'Entry fees are spent whether you claim or lose. Over many runs, the total you spend on entry is a real cost.',
          ]}
        />
      </Section>

      <Section title="Signs worth taking seriously">
        <Bullets
          items={[
            'Playing to recover what a previous run cost you.',
            'Spending more than you had decided to, or more than you can comfortably lose.',
            'Feeling that a win is owed to you after a losing streak.',
            'Hiding how much you play from people close to you.',
            'Playing to manage stress, boredom, or low mood rather than for enjoyment.',
          ]}
        />
      </Section>

      <Section title="Practical limits">
        <Bullets
          items={[
            'Decide your claim level before you start a run, and claim there regardless of how the run feels.',
            'Set a number of runs per session and stop at it.',
            'Use Practice Arena — it is free, permanently available, and mathematically identical.',
            'Never fund an entry fee with money set aside for anything else.',
          ]}
        />
      </Section>

      <Section title="Getting help">
        <p>
          If gambling is causing harm to you or someone you know, free and confidential help exists in most countries.
          Search for your national gambling helpline, or speak to a healthcare professional. An operator running this
          game with real value at stake should list the specific services for each market it serves.
        </p>
      </Section>

      <Card>
        <h2 className="font-display text-lg font-bold text-white">Play free instead</h2>
        <p className="mt-2 text-sm text-slate-300">
          Practice Arena runs the same engine and the same odds with no entry fee, no wallet, and nothing at stake.
        </p>
        <Button href="/game?room=practice" variant="cyan" className="mt-4">
          Open Practice Arena
        </Button>
      </Card>
    </LegalPage>
  );
}
