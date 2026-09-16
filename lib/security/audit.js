import { getRepository } from '@/lib/database/repository';

export const AUDIT_EVENTS = Object.freeze({
  ACCOUNT_CREATED: 'account.created',
  ACCOUNT_DELETED: 'account.deleted',
  ACCOUNT_DELETION_REQUESTED: 'account.deletion_requested',
  PROFILE_UPDATED: 'profile.updated',
  GUEST_SESSION_STARTED: 'session.guest_started',
  WALLET_NONCE_ISSUED: 'wallet.nonce_issued',
  WALLET_LINKED: 'wallet.linked',
  WALLET_UNLINKED: 'wallet.unlinked',
  WALLET_SIGNATURE_REJECTED: 'wallet.signature_rejected',
  RUN_CREATED: 'run.created',
  RUN_ENTRY_CONFIRMED: 'run.entry_confirmed',
  RUN_ROUND_PLAYED: 'run.round_played',
  RUN_CLAIM_REQUESTED: 'run.claim_requested',
  RUN_CLAIMED: 'run.claimed',
  RUN_LOST: 'run.lost',
  RUN_INVALID_TRANSITION: 'run.invalid_transition',
  NFT_MINT_REQUESTED: 'nft.mint_requested',
  NFT_MINTED: 'nft.minted',
  NFT_MINT_FAILED: 'nft.mint_failed',
  ADMIN_CONFIG_CHANGED: 'admin.config_changed',
});

/**
 * Appends an audit row. Deliberately never throws: a logging failure must not
 * roll back a legitimate game action.
 */
export async function audit(event, { userId = null, runId = null, ip = null, metadata = {} } = {}) {
  try {
    await getRepository().appendAudit({
      event,
      user_id: userId,
      run_id: runId,
      ip_address: ip,
      metadata,
    });
  } catch (error) {
    console.error('[audit] failed to record event', event, error);
  }
}

export const ipFrom = (request) => {
  const forwarded = request.headers.get('x-forwarded-for');
  return forwarded ? forwarded.split(',')[0].trim() : request.headers.get('x-real-ip') || null;
};
