import Link from 'next/link';

const LINKS = [
  { href: '/rules', label: 'Rules & Fairness' },
  { href: '/responsible-play', label: 'Responsible Play' },
  { href: '/privacy', label: 'Privacy' },
  { href: '/terms', label: 'Terms' },
];

export default function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-arena-edge/60 bg-arena-void/80">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          <div className="max-w-md">
            <p className="font-display text-sm font-black text-white">Elemental RPS Arena</p>
            <p className="mt-2 text-xs leading-relaxed text-slate-400">
              A demonstration Web3 game. Runs on testnet and simulated currency by default. Nothing here is an
              investment, and rewards have no guaranteed monetary value.
            </p>
          </div>
          <nav aria-label="Footer">
            <ul className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
              {LINKS.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="link-quiet">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
        <p className="mt-6 border-t border-arena-edge/40 pt-4 text-[11px] text-slate-500">
          All champions, reward tiers, and artwork in this project are original placeholder assets generated from code.
        </p>
      </div>
    </footer>
  );
}
