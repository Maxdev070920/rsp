'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/apiClient';
import Card, { CardHeader } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Spinner from '@/components/ui/Spinner';
import EmptyState from '@/components/ui/EmptyState';
import Avatar from '@/components/profile/Avatar';
import DeleteAccountPanel from '@/components/profile/DeleteAccountPanel';
import ChampionPicker from '@/components/game/ChampionPicker';
import WalletButton from '@/components/wallet/WalletButton';
import { evaluateAchievements } from '@/config/achievements';
import { getRoom } from '@/config/rooms';
import { DEFAULT_CHAMPION } from '@/config/characters';
import useSession from '@/hooks/useSession';
import useToast from '@/hooks/useToast';
import useWallet from '@/hooks/useWallet';
import { createSupabaseBrowserClient } from '@/lib/database/supabaseClients';
import { isSupabaseConfigured } from '@/config/env';

export default function ProfilePage() {
  const toast = useToast();
  const router = useRouter();
  const { refresh } = useSession();
  const wallet = useWallet();

  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [displayName, setDisplayName] = useState('');
  const [champion, setChampion] = useState(DEFAULT_CHAMPION);
  const [saving, setSaving] = useState(false);

  const load = () =>
    api
      .get('/api/profile')
      .then((payload) => {
        setData(payload);
        setDisplayName(payload.profile?.display_name || '');
        setChampion(payload.profile?.champion_key || DEFAULT_CHAMPION);
      })
      .catch((err) => setError(err.message));

  useEffect(() => {
    load();
  }, []);

  const save = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      await api.patch('/api/profile', { displayName, championKey: champion });
      await refresh();
      await load();
      toast.success('Profile saved');
    } catch (err) {
      toast.error('Could not save profile', err.message);
    } finally {
      setSaving(false);
    }
  };

  const signOut = async () => {
    const supabase = createSupabaseBrowserClient();
    if (supabase) await supabase.auth.signOut();
    await refresh();
    toast.info('Signed out');
    router.push('/');
    router.refresh();
  };

  if (error) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16">
        <h1 className="mb-6 text-center font-display text-3xl font-black text-white">Profile</h1>
        <EmptyState icon="⚠" title="Could not load your profile" description={error} actionLabel="Retry" onAction={load} />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex justify-center py-24">
        <Spinner label="Loading profile…" />
      </div>
    );
  }

  if (!data.profile) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16">
        <h1 className="mb-6 text-center font-display text-3xl font-black text-white">Profile</h1>
        <EmptyState
          icon="👤"
          title="No session yet"
          description="Start a free run as a guest, or create an account to keep your collection across devices."
          actionLabel="Play free"
          actionHref="/game?room=practice"
        />
      </div>
    );
  }

  const { profile, session, wallets, stats, rank, recentRuns, earnedCount } = data;
  const achievements = evaluateAchievements({
    runs: stats.runs,
    claimed: recentRuns.filter((run) => run.status === 'CLAIMED').length,
    ties: stats.ties,
    bestLevel: stats.bestLevel,
    longestStreak: rank?.longest_streak || 0,
    distinctTiers: earnedCount,
  });

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <header className="panel mb-6 flex flex-col items-center gap-4 p-6 sm:flex-row sm:items-start">
        <Avatar seed={profile.avatar_seed || profile.id} size={96} />
        <div className="flex-1 text-center sm:text-left">
          <h1 className="font-display text-2xl font-black text-white">{profile.display_name}</h1>
          <p className="mt-1 text-sm text-slate-400">
            {session.isGuest ? 'Guest session — not saved across devices' : session.email || 'Signed in'}
          </p>
          <div className="mt-3 flex flex-wrap justify-center gap-2 sm:justify-start">
            {session.isGuest ? <Badge tone="ember">Guest</Badge> : <Badge tone="success">Account</Badge>}
            {rank && <Badge tone="nebula">Rank #{rank.rank}</Badge>}
            <Badge tone="aurora">{earnedCount} rewards earned</Badge>
            {wallets.length > 0 && <Badge tone="signal">{wallets.length} wallet linked</Badge>}
          </div>
        </div>
        <div className="flex flex-col gap-2">
          {session.isGuest && isSupabaseConfigured && (
            <Button href="/auth/signup" variant="primary" size="sm">
              Create an account
            </Button>
          )}
          {!session.isGuest && (
            <Button variant="ghost" size="sm" onClick={signOut}>
              Sign out
            </Button>
          )}
          <Button href="/collection" variant="ghost" size="sm">
            View collection
          </Button>
        </div>
      </header>

      <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
        <div className="space-y-5">
          <Card>
            <CardHeader eyebrow="Statistics" title="Your record" />
            <dl className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {[
                ['Runs', stats.runs],
                ['Resolved wins', stats.wins],
                ['Resolved losses', stats.losses],
                ['Ties replayed', stats.ties],
                ['Best level', stats.bestLevel],
                ['Season score', rank ? rank.score.toLocaleString() : '0'],
              ].map(([label, value]) => (
                <div key={label} className="panel-inset px-3 py-2">
                  <dt className="label-eyebrow">{label}</dt>
                  <dd className="font-display text-lg font-bold text-white">{value}</dd>
                </div>
              ))}
            </dl>
          </Card>

          <Card>
            <CardHeader eyebrow="Recent games" title="Last runs" action={<Link href="/history" className="text-xs text-aurora underline underline-offset-4">Full history</Link>} />
            {recentRuns.length === 0 ? (
              <p className="text-sm text-slate-400">No runs yet. Practice Arena is free and always open.</p>
            ) : (
              <ul className="space-y-2">
                {recentRuns.slice(0, 6).map((run) => (
                  <li key={run.id} className="panel-inset flex items-center justify-between px-3 py-2 text-sm">
                    <span className="text-slate-300">{getRoom(run.roomKey)?.name || run.roomKey}</span>
                    <span className="text-xs text-slate-500">{new Date(run.createdAt).toLocaleDateString()}</span>
                    <span className="text-xs text-slate-400">Lv {run.claimedLevel ?? run.level}</span>
                    <Badge tone={run.status === 'CLAIMED' ? 'success' : run.status === 'LOST' ? 'danger' : 'neutral'}>
                      {run.status.replace('_', ' ')}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card>
            <CardHeader eyebrow="Achievements" title={`${achievements.filter((a) => a.unlocked).length} of ${achievements.length} unlocked`} />
            <ul className="grid gap-2 sm:grid-cols-2">
              {achievements.map((achievement) => (
                <li
                  key={achievement.key}
                  className={`panel-inset px-3 py-2 ${achievement.unlocked ? '' : 'opacity-55'}`}
                >
                  <p className="flex items-center gap-2 font-display text-sm font-bold text-white">
                    <span aria-hidden="true">{achievement.unlocked ? '★' : '☆'}</span>
                    {achievement.name}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-400">{achievement.description}</p>
                </li>
              ))}
            </ul>
          </Card>
        </div>

        <aside className="space-y-5">
          <Card>
            <CardHeader eyebrow="Account settings" title="Edit profile" />
            <form onSubmit={save} className="space-y-3">
              <div>
                <label htmlFor="display-name" className="label-eyebrow block">
                  Display name
                </label>
                <input
                  id="display-name"
                  value={displayName}
                  onChange={(event) => setDisplayName(event.target.value)}
                  minLength={2}
                  maxLength={24}
                  required
                  className="mt-1 w-full rounded-xl border border-arena-edge bg-arena-deep px-3 py-2.5 text-sm text-white"
                />
              </div>
              <ChampionPicker value={champion} onChange={setChampion} compact />
              <Button type="submit" variant="primary" className="w-full" loading={saving}>
                Save profile
              </Button>
            </form>
          </Card>

          <Card>
            <CardHeader eyebrow="Wallets" title="Linked wallets" />
            {wallets.length === 0 ? (
              <p className="text-sm text-slate-400">
                No wallet linked. Linking is optional — Practice Arena never needs one, and changing wallets never
                costs you your account.
              </p>
            ) : (
              <ul className="space-y-2">
                {wallets.map((entry) => (
                  <li key={entry.address} className="panel-inset px-3 py-2">
                    <p className="break-all font-mono text-xs text-slate-200">{entry.address}</p>
                    <div className="mt-1 flex items-center justify-between">
                      <span className="text-[11px] text-slate-500">Chain {entry.chain_id}</span>
                      <Button
                        size="sm"
                        variant="quiet"
                        onClick={async () => {
                          try {
                            await wallet.unlinkWallet(entry.address);
                            await load();
                            toast.success('Wallet unlinked');
                          } catch (err) {
                            toast.error('Could not unlink', err.message);
                          }
                        }}
                      >
                        Unlink
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            <div className="mt-3">
              <WalletButton size="sm" variant="ghost" />
            </div>
          </Card>

          <DeleteAccountPanel />
        </aside>
      </div>
    </div>
  );
}
