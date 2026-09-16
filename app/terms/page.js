import LegalPage, { Bullets, Section } from '@/components/layout/LegalPage';

export const metadata = { title: 'Terms of use' };

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms of use"
      updated="15 September 2026"
      intro="Elemental RPS Arena is a demonstration Web3 game. These terms describe how the software is intended to be used. They are not legal advice and must be reviewed before any production deployment."
    >
      <Section title="What this is">
        <p>
          A game of chance with a claim-or-continue decision layer. It runs on testnets and simulated currency by
          default. Mainnet behaviour is disabled unless an operator deliberately configures it.
        </p>
      </Section>

      <Section title="No investment, no guaranteed value">
        <Bullets
          items={[
            'Reward NFTs are collectibles. They carry no promise of resale value, yield, dividend, or future utility.',
            'Nothing in this game is an investment product, a security, or a financial instrument.',
            'Entry fees, where enabled, are spent. There is no expectation of return and no refund mechanism.',
          ]}
        />
      </Section>

      <Section title="Eligibility">
        <p>
          You must be of legal age in your jurisdiction and permitted to use blockchain services there. Games of chance
          with paid entry are restricted or prohibited in many places. An operator is responsible for geo-restriction,
          age verification, and licensing before enabling paid arenas.
        </p>
      </Section>

      <Section title="Fair use">
        <Bullets
          items={[
            'Do not attempt to manipulate outcomes, replay requests, or tamper with API calls. Outcomes are validated server-side and abuse is logged.',
            'Do not create multiple accounts to distort the leaderboard.',
            'Do not use automated clients to play paid arenas.',
            'Accounts found manipulating the leaderboard may have their entries removed.',
          ]}
        />
      </Section>

      <Section title="Availability">
        <p>
          The service is provided as-is with no uptime guarantee. Blockchain networks, RPC providers, and IPFS gateways
          are third-party systems that can fail independently of this application. A failed mint does not invalidate a
          claim recorded off chain, and the claim record is retained so it can be retried.
        </p>
      </Section>

      <Section title="Original assets">
        <p>
          All champions, reward tiers, names, descriptions, and artwork in this project are original and generated from
          code in this repository. No third-party characters, artwork, or branding are used.
        </p>
      </Section>
    </LegalPage>
  );
}
