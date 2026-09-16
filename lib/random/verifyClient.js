'use client';

import { MOVES } from '@/lib/game/rps';

/**
 * Browser-side verifier for commit-reveal runs.
 *
 * Runs entirely in the player's own browser using Web Crypto, so it is an
 * independent check of the server's claims rather than another server call.
 */

const hexToBytes = (hex) => Uint8Array.from(hex.match(/.{1,2}/g).map((byte) => parseInt(byte, 16)));
const bytesToHex = (bytes) => [...new Uint8Array(bytes)].map((b) => b.toString(16).padStart(2, '0')).join('');

async function sha256Hex(bytes) {
  return bytesToHex(await crypto.subtle.digest('SHA-256', bytes));
}

async function hmacSha256(keyBytes, message) {
  const key = await crypto.subtle.importKey('raw', keyBytes, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message));
}

/** Confirms the revealed seed hashes to the commitment published at run start. */
export async function verifyCommitment({ seed, commitment }) {
  if (!seed || !commitment) return false;
  return (await sha256Hex(hexToBytes(seed))) === commitment;
}

/** Recomputes every round's opponent move from the revealed seed. */
export async function verifyRounds({ seed, runId, rounds }) {
  const seedBytes = hexToBytes(seed);
  return Promise.all(
    rounds.map(async (round) => {
      const signature = await hmacSha256(seedBytes, `${runId}:${round.roundNumber}`);
      const digestHex = bytesToHex(signature);
      const view = new DataView(signature);
      // Same 48-bit slice the server uses: 32 high bits plus the next 16.
      const value = view.getUint32(0) * 65536 + view.getUint16(4);
      const move = MOVES[value % MOVES.length];
      return {
        roundNumber: round.roundNumber,
        expectedMove: round.opponentMove,
        computedMove: move,
        digestMatches: round.proof?.digest ? round.proof.digest === digestHex : null,
        valid: move === round.opponentMove,
      };
    })
  );
}
