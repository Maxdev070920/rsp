import { Suspense } from 'react';
import HistoryClient from './HistoryClient';
import Spinner from '@/components/ui/Spinner';

export const metadata = { title: 'Game history' };

export default function HistoryPage() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center py-24">
          <Spinner label="Loading history…" />
        </div>
      }
    >
      <HistoryClient />
    </Suspense>
  );
}
