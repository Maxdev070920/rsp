'use client';

import { useState } from 'react';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import { api } from '@/lib/apiClient';
import useToast from '@/hooks/useToast';

const CONFIRMATION = 'DELETE MY ACCOUNT';

/**
 * Account deletion. The confirmation phrase is validated by the server too —
 * this is not a client-side-only guard.
 */
export default function DeleteAccountPanel() {
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [phrase, setPhrase] = useState('');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);

  const submit = async () => {
    setBusy(true);
    try {
      const data = await api.post('/api/profile/delete', { confirmation: phrase, reason: reason || undefined });
      setResult(data);
      toast.success('Account deleted', 'Your off-chain profile has been removed.');
    } catch (error) {
      toast.error('Deletion failed', error.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <div className="panel border-rose-500/40 p-5">
        <h3 className="font-display text-base font-bold text-white">Delete account</h3>
        <p className="mt-2 text-sm text-slate-300">
          This removes your display name, email, avatar, and linked wallets. Your run history is kept in anonymised
          form because the leaderboard and audit trail depend on it.
        </p>
        <p className="mt-2 text-sm text-amber-200">
          Blockchain records cannot be deleted. Any entry transaction, minted NFT, or transfer lives on a public chain
          that this service does not control. Deleting your account here does not — and cannot — erase them.
        </p>
        <Button variant="danger" className="mt-4" onClick={() => setOpen(true)}>
          Delete my account
        </Button>
      </div>

      <Modal
        open={open}
        onClose={() => !busy && setOpen(false)}
        title="Delete your account"
        description="This cannot be undone."
        footer={
          !result && (
            <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
              <Button variant="ghost" onClick={() => setOpen(false)} disabled={busy}>
                Keep my account
              </Button>
              <Button variant="danger" onClick={submit} loading={busy} disabled={phrase !== CONFIRMATION}>
                Permanently delete
              </Button>
            </div>
          )
        }
      >
        {result ? (
          <div className="space-y-3 text-sm text-slate-300">
            <p className="font-semibold text-white">Your account has been deleted.</p>
            <ul className="space-y-2 text-xs">
              {Object.entries(result.retained).map(([key, value]) => (
                <li key={key} className="panel-inset px-3 py-2">
                  {value}
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label htmlFor="delete-reason" className="label-eyebrow block">
                Reason (optional)
              </label>
              <textarea
                id="delete-reason"
                rows={2}
                maxLength={500}
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                className="mt-1 w-full rounded-xl border border-arena-edge bg-arena-deep px-3 py-2 text-sm text-white"
              />
            </div>
            <div>
              <label htmlFor="delete-confirm" className="label-eyebrow block">
                Type <span className="font-mono text-rose-300">{CONFIRMATION}</span> to confirm
              </label>
              <input
                id="delete-confirm"
                data-autofocus
                value={phrase}
                onChange={(event) => setPhrase(event.target.value)}
                className="mt-1 w-full rounded-xl border border-arena-edge bg-arena-deep px-3 py-2.5 font-mono text-sm text-white"
              />
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
