import AuthForm from '@/components/auth/AuthForm';
import AuthNotice from '@/components/auth/AuthNotice';
import { isSupabaseConfigured } from '@/config/env';

export const metadata = { title: 'Sign in' };

export default function LoginPage() {
  return (
    <div className="mx-auto max-w-md px-4 py-12 sm:px-6">
      <header className="mb-6">
        <h1 className="font-display text-3xl font-black text-white">Sign in</h1>
        <p className="mt-2 text-sm text-slate-400">Welcome back. Your collection and history are waiting.</p>
      </header>
      {isSupabaseConfigured ? <AuthForm mode="login" /> : <AuthNotice />}
    </div>
  );
}
