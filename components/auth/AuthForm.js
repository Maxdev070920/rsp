'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import useToast from '@/hooks/useToast';
import useSession from '@/hooks/useSession';
import { createSupabaseBrowserClient } from '@/lib/database/supabaseClients';
import { publicEnv } from '@/config/env';

/**
 * Email auth form.
 *
 * Every failure path returns the same neutral message so the form cannot be
 * used to discover whether an address is registered.
 */
const GENERIC_FAILURE = 'Those details did not work. Check them and try again.';

export default function AuthForm({ mode }) {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const router = useRouter();
  const toast = useToast();
  const { refresh } = useSession();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState(null);
  const [fieldError, setFieldError] = useState(null);

  const isSignup = mode === 'signup';
  const isReset = mode === 'reset';

  const submit = async (event) => {
    event.preventDefault();
    setFieldError(null);
    setNotice(null);

    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      setFieldError('Enter a valid email address.');
      return;
    }
    if (!isReset && password.length < 10) {
      setFieldError('Passwords must be at least 10 characters.');
      return;
    }

    setBusy(true);
    try {
      if (isReset) {
        await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${publicEnv.appUrl}/auth/login`,
        });
        // Always the same response, whether or not the address exists.
        setNotice('If that address has an account, a password reset link is on its way.');
        return;
      }

      if (isSignup) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${publicEnv.appUrl}/auth/login` },
        });
        if (error) {
          setFieldError(GENERIC_FAILURE);
          return;
        }
        setNotice('Check your inbox to verify your email address, then sign in.');
        return;
      }

      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setFieldError(GENERIC_FAILURE);
        return;
      }
      await refresh();
      toast.success('Signed in', 'Welcome back to the arena.');
      router.push('/rooms');
    } catch {
      setFieldError(GENERIC_FAILURE);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <form onSubmit={submit} noValidate>
        <div className="space-y-4">
          <div>
            <label htmlFor="email" className="label-eyebrow block">
              Email address
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="mt-1 w-full rounded-xl border border-arena-edge bg-arena-deep px-3 py-2.5 text-sm text-white placeholder:text-slate-600"
              placeholder="you@example.com"
            />
          </div>

          {!isReset && (
            <div>
              <label htmlFor="password" className="label-eyebrow block">
                Password
              </label>
              <input
                id="password"
                type="password"
                autoComplete={isSignup ? 'new-password' : 'current-password'}
                required
                minLength={10}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="mt-1 w-full rounded-xl border border-arena-edge bg-arena-deep px-3 py-2.5 text-sm text-white placeholder:text-slate-600"
                placeholder="At least 10 characters"
                aria-describedby="password-hint"
              />
              <p id="password-hint" className="mt-1 text-[11px] text-slate-500">
                Minimum 10 characters. Use a passphrase you do not use anywhere else.
              </p>
            </div>
          )}

          {fieldError && (
            <p role="alert" className="rounded-lg border border-rose-500/50 bg-rose-950/40 px-3 py-2 text-sm text-rose-200">
              {fieldError}
            </p>
          )}
          {notice && (
            <p role="status" className="rounded-lg border border-aurora/50 bg-aurora/10 px-3 py-2 text-sm text-cyan-100">
              {notice}
            </p>
          )}

          <Button type="submit" variant="primary" className="w-full" loading={busy}>
            {isReset ? 'Send reset link' : isSignup ? 'Create account' : 'Sign in'}
          </Button>
        </div>
      </form>

      <div className="mt-5 space-y-1.5 border-t border-arena-edge/60 pt-4 text-sm">
        {mode !== 'login' && (
          <p>
            Already have an account?{' '}
            <Link href="/auth/login" className="link-quiet">
              Sign in
            </Link>
          </p>
        )}
        {mode !== 'signup' && (
          <p>
            New here?{' '}
            <Link href="/auth/signup" className="link-quiet">
              Create an account
            </Link>
          </p>
        )}
        {mode !== 'reset' && (
          <p>
            Forgotten your password?{' '}
            <Link href="/auth/reset" className="link-quiet">
              Reset it
            </Link>
          </p>
        )}
        <p className="pt-2 text-xs text-slate-500">
          You never need an account to play Practice Arena.{' '}
          <Link href="/game?room=practice" className="link-quiet">
            Play as a guest
          </Link>
          .
        </p>
      </div>
    </Card>
  );
}
