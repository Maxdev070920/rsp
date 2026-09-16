import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';

/** Shown when Supabase auth is not configured, instead of a form that cannot work. */
export default function AuthNotice() {
  return (
    <Card>
      <h2 className="font-display text-lg font-bold text-white">Email accounts are not configured</h2>
      <p className="mt-2 text-sm text-slate-300">
        This deployment has no Supabase credentials, so email sign-up, login, verification, and password reset are
        unavailable. Guest play still works, and so does Practice Arena.
      </p>
      <p className="mt-2 text-xs text-slate-500">
        To enable accounts, set <code className="text-aurora">NEXT_PUBLIC_SUPABASE_URL</code> and{' '}
        <code className="text-aurora">NEXT_PUBLIC_SUPABASE_ANON_KEY</code>, then run the migrations in{' '}
        <code className="text-aurora">supabase/migrations</code>.
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button href="/game?room=practice" variant="gold">
          Play as guest
        </Button>
        <Button href="/rules" variant="ghost">
          Read the rules
        </Button>
      </div>
    </Card>
  );
}
