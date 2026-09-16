import { Suspense } from 'react';
import GameClient from './GameClient';
import Spinner from '@/components/ui/Spinner';

export const metadata = { title: 'Arena' };

export default function GamePage() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center py-24">
          <Spinner label="Loading arena…" />
        </div>
      }
    >
      <GameClient />
    </Suspense>
  );
}
