'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/apiClient';

const SessionContext = createContext(null);

export function SessionProvider({ children, initialSession = null }) {
  const [session, setSession] = useState(initialSession);
  const [wallets, setWallets] = useState([]);
  const [loading, setLoading] = useState(!initialSession);
  const [error, setError] = useState(null);

  const refresh = useCallback(async () => {
    try {
      const data = await api.get('/api/session');
      setSession(data.session);
      setWallets(data.wallets || []);
      setError(null);
      return data.session;
    } catch (err) {
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Deliberate: the session is fetched once on mount; state is set in the
    // promise callback, not synchronously.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh();
  }, [refresh]);

  /** Creates a guest session on demand — used by "Play Free". */
  const startGuest = useCallback(async () => {
    const data = await api.post('/api/session', {});
    setSession(data.session);
    return data.session;
  }, []);

  const value = useMemo(
    () => ({
      session,
      wallets,
      setWallets,
      loading,
      error,
      refresh,
      startGuest,
      isGuest: Boolean(session?.isGuest),
      isSignedIn: Boolean(session && !session.isGuest),
      displayName: session?.profile?.display_name || (session?.isGuest ? 'Guest' : null),
    }),
    [session, wallets, loading, error, refresh, startGuest]
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export default function useSession() {
  const context = useContext(SessionContext);
  if (!context) throw new Error('useSession must be used inside a SessionProvider');
  return context;
}
