import Button from '@/components/ui/Button';

export const metadata = { title: 'Not found' };

export default function NotFound() {
  return (
    <div className="mx-auto max-w-xl px-4 py-24 text-center">
      <p className="label-eyebrow">404</p>
      <h1 className="mt-2 font-display text-3xl font-black text-white">No arena here</h1>
      <p className="mt-3 text-sm text-slate-400">
        That page does not exist. The Practice Arena is always open, and always free.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        <Button href="/game?room=practice" variant="gold">
          Play free
        </Button>
        <Button href="/rooms" variant="ghost">
          Browse arenas
        </Button>
      </div>
    </div>
  );
}
