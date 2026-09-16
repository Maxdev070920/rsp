import './globals.css';
import { publicEnv } from '@/config/env';
import Providers from './providers';
import SiteHeader from '@/components/layout/SiteHeader';
import SiteFooter from '@/components/layout/SiteFooter';
import ParticleField from '@/components/layout/ParticleField';

export const metadata = {
  title: {
    default: `${publicEnv.appName} — Elemental Rock Paper Scissors`,
    template: `%s · ${publicEnv.appName}`,
  },
  description:
    'Climb a fifteen-tier reward ladder one Rock–Paper–Scissors round at a time. Claim early and keep the reward, or push on and risk it all. Testnet and demo play by default.',
  applicationName: publicEnv.appName,
  robots: { index: true, follow: true },
};

export const viewport = {
  themeColor: '#06040f',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body className="min-h-screen">
        <Providers>
          <a href="#main" className="skip-link">
            Skip to main content
          </a>
          <ParticleField />
          <div className="relative z-10 flex min-h-screen flex-col">
            <SiteHeader />
            <main id="main" className="flex-1">
              {children}
            </main>
            <SiteFooter />
          </div>
        </Providers>
      </body>
    </html>
  );
}
