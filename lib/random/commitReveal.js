import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { moveFromIndex } from '@/lib/game/rps';
import { RandomnessProvider } from './provider';

/**
 * Commit-reveal randomness.
 *
 * Per-run seed is derived as HMAC(masterSecret, runId), so nothing has to be
 * stored between requests, and revealing one run's seed tells an observer
 * nothing about the master secret or any other run.
 *
 * Flow:
 *   1. On run creation the server publishes `commitment = sha256(runSeed)`.
 *   2. Each round's opponent move is `HMAC(runSeed, runId:roundNumber)` mapped
 *      onto 3 moves; the digest is stored with the round as its proof.
 *   3. When the run ends the server reveals `runSeed`. Anyone can recompute
 *      sha256(runSeed) to match the commitment, then recompute every round.
 *
 * The seed is fixed before the player's first throw and the player's move is
 * never an input, so the server cannot bias a round after seeing the throw.
 */
export class CommitRevealRandomnessProvider extends RandomnessProvider {
  #masterSecret;
  #ephemeral;

  constructor({ masterSecret } = {}) {
    super();
    if (masterSecret) {
      this.#masterSecret = Buffer.from(masterSecret, 'utf8');
      this.#ephemeral = false;
    } else {
      // Dev fallback: a process-lifetime secret. Runs stay verifiable while the
      // server is up, but do not survive a restart. Never use in production.
      this.#masterSecret = randomBytes(32);
      this.#ephemeral = true;
    }
  }

  get name() {
    return 'commit-reveal-v1';
  }

  get mode() {
    return 'commit-reveal';
  }

  get verifiable() {
    return true;
  }

  get label() {
    return this.#ephemeral
      ? 'Commit–reveal (ephemeral dev secret)'
      : 'Commit–reveal (server-committed seed)';
  }

  get ephemeral() {
    return this.#ephemeral;
  }

  #runSeed(runId) {
    return createHmac('sha256', this.#masterSecret).update(`run:${runId}`).digest();
  }

  #commitmentFor(runId) {
    return createHash('sha256').update(this.#runSeed(runId)).digest('hex');
  }

  async createCommitment(runId) {
    return {
      commitment: this.#commitmentFor(runId),
      provider: this.name,
      algorithm: 'sha256(hmac-sha256(master, run:<id>))',
    };
  }

  async nextMove({ runId, roundNumber }) {
    const seed = this.#runSeed(runId);
    const digest = createHmac('sha256', seed).update(`${runId}:${roundNumber}`).digest();
    // Rejection-free mapping: 3 does not divide 2^32 evenly, so take a wide
    // 48-bit slice where the modulo bias is far below any observable threshold.
    const value = digest.readUIntBE(0, 6);
    return {
      move: moveFromIndex(value),
      proof: {
        provider: this.name,
        mode: this.mode,
        commitment: this.#commitmentFor(runId),
        roundNumber,
        digest: digest.toString('hex'),
        verified: false,
      },
    };
  }

  async reveal(runId) {
    return {
      provider: this.name,
      runId,
      seed: this.#runSeed(runId).toString('hex'),
      commitment: this.#commitmentFor(runId),
      instructions:
        'sha256(seed) must equal the commitment. Each round digest is hmac-sha256(seed, "<runId>:<roundNumber>"); the first 6 bytes modulo 3 select rock, paper, or scissors.',
    };
  }

  /** Offline verifier used by the history page and by tests. */
  static verifyRound({ seed, runId, roundNumber, expectedDigest, expectedMove }) {
    const digest = createHmac('sha256', Buffer.from(seed, 'hex'))
      .update(`${runId}:${roundNumber}`)
      .digest();
    const digestHex = digest.toString('hex');
    const digestMatches =
      typeof expectedDigest === 'string' &&
      expectedDigest.length === digestHex.length &&
      timingSafeEqual(Buffer.from(digestHex), Buffer.from(expectedDigest));
    const move = moveFromIndex(digest.readUIntBE(0, 6));
    return {
      valid: digestMatches && move === expectedMove,
      digestMatches,
      move,
      moveMatches: move === expectedMove,
    };
  }

  static verifyCommitment({ seed, commitment }) {
    return createHash('sha256').update(Buffer.from(seed, 'hex')).digest('hex') === commitment;
  }
}
