import LegalPage, { Bullets, Section } from '@/components/layout/LegalPage';

export const metadata = { title: 'Privacy policy' };

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy policy"
      updated="15 September 2026"
      intro="This is a demonstration project. This page describes what the software actually stores and what it cannot control. It is not legal advice, and an operator deploying it should have it reviewed before taking real users."
    >
      <Section title="What is collected">
        <Bullets
          items={[
            'Guest sessions: a signed random identifier in an HTTP-only cookie. No email, no name, no tracking identifier.',
            'Accounts: the email address you register, handled by Supabase Auth, plus a display name and avatar seed you choose.',
            'Gameplay: every run and round — your move, the opponent move, the outcome, the reward level, and the randomness proof.',
            'Wallets: any wallet address you deliberately link, together with the chain id. Linking requires a signature; we never read your keys and cannot move your funds.',
            'Security: audit log entries for account, wallet, claim, and mint events, including an IP address where available.',
          ]}
        />
      </Section>

      <Section title="What is not collected">
        <Bullets
          items={[
            'No third-party analytics, advertising, or tracking pixels are included in this project.',
            'No private keys, seed phrases, or wallet credentials — the app never asks for them and never could use them.',
            'No payment card data. Entry fees, where enabled, are paid on chain from your own wallet.',
          ]}
        />
      </Section>

      <Section title="Cookies">
        <p>
          Two kinds of cookie are used: a guest session cookie, and Supabase authentication cookies when you sign in.
          Both are strictly necessary for the game to function. There are no advertising or analytics cookies. Sound
          preference is stored in your browser&rsquo;s local storage and never leaves your device.
        </p>
      </Section>

      <Section title="Deleting your account">
        <p>
          You can delete your account from your profile page. Your display name, email, avatar seed, and linked wallets
          are removed or anonymised. Run and round records are retained in anonymised form because the leaderboard and
          the audit trail depend on them. Audit entries are retained for a limited period for abuse investigation.
        </p>
      </Section>

      <Section title="What cannot be deleted">
        <p>
          Anything recorded on a blockchain is outside this service entirely. Entry transactions, minted tokens,
          transfers, and current NFT ownership live on a public, append-only ledger operated by a distributed network.
          Neither you nor this service can edit or erase those records. Deleting your account here removes the link
          between your profile and those addresses in our database — it does not, and cannot, remove the chain data.
        </p>
      </Section>

      <Section title="Data location and processors">
        <p>
          When configured, this project stores data in Supabase (PostgreSQL) and may pin NFT metadata to IPFS. Metadata
          pinned to IPFS is public and effectively permanent once distributed. An operator deploying this project is
          responsible for naming its actual processors and hosting regions here.
        </p>
      </Section>
    </LegalPage>
  );
}
