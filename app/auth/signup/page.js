import AuthForm from '@/components/auth/AuthForm';
import AuthNotice from '@/components/auth/AuthNotice';
import { isSupabaseConfigured } from '@/config/env';

export const metadata = { title: 'Create an account' };

export default function SignupPage() {
  return (
    <div className="mx-auto max-w-md px-4 py-12 sm:px-6">
      <header className="mb-6">
        <h1 className="font-display text-3xl font-black text-white">Create an account</h1>
        <p className="mt-2 text-sm text-slate-400">Keep your history, collection, and leaderboard position across devices.</p>
      </header>
      {isSupabaseConfigured ? <AuthForm mode="signup" /> : <AuthNotice />}
    </div>
  );
}
