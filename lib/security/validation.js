import { z } from 'zod';
import { MOVES } from '@/lib/game/rps';
import { GAME_ROOMS } from '@/config/rooms';
import { CHAMPIONS } from '@/config/characters';

const roomKeys = GAME_ROOMS.map((r) => r.key);
const championKeys = CHAMPIONS.map((c) => c.key);

export const uuidSchema = z.string().uuid('Invalid identifier.');

export const createRunSchema = z.object({
  roomKey: z.enum(roomKeys),
  championKey: z.enum(championKeys),
  acknowledgedFee: z.boolean().optional().default(false),
});

export const playRoundSchema = z.object({
  move: z.enum(MOVES),
  // Client-supplied round number is only used to reject replays; the server's
  // own counter is what actually advances the run.
  expectedRoundNumber: z.number().int().nonnegative().optional(),
});

export const decisionSchema = z.object({
  decision: z.enum(['claim', 'continue']),
});

export const walletNonceSchema = z.object({
  address: z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid wallet address.'),
  chainId: z.number().int().positive(),
});

export const walletVerifySchema = z.object({
  address: z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid wallet address.'),
  chainId: z.number().int().positive(),
  nonce: z.string().min(16).max(128),
  signature: z.string().regex(/^0x[a-fA-F0-9]{130}$/, 'Invalid signature.'),
  message: z.string().min(20).max(2000),
});

export const profileSchema = z.object({
  displayName: z
    .string()
    .trim()
    .min(2, 'Display name must be at least 2 characters.')
    .max(24, 'Display name must be 24 characters or fewer.')
    // Escaping happens at render time via React; this is a content rule, not
    // an XSS defence on its own.
    .regex(/^[\p{L}\p{N} _.\-]+$/u, 'Use letters, numbers, spaces, dots, hyphens, or underscores.'),
  championKey: z.enum(championKeys).optional(),
  avatarSeed: z.string().trim().max(64).optional(),
});

export const deletionSchema = z.object({
  confirmation: z.literal('DELETE MY ACCOUNT', {
    errorMap: () => ({ message: 'Type DELETE MY ACCOUNT exactly to confirm.' }),
  }),
  reason: z.string().trim().max(500).optional(),
});

export const authSchema = z.object({
  email: z.string().email('Enter a valid email address.').max(254),
  password: z.string().min(10, 'Use at least 10 characters.').max(128),
});

export const emailOnlySchema = z.object({
  email: z.string().email('Enter a valid email address.').max(254),
});

/** Parses and rethrows as an AppError-compatible shape. */
export function parseBody(schema, body) {
  const result = schema.safeParse(body);
  if (result.success) return result.data;
  const first = result.error.issues[0];
  const error = new Error(first?.message || 'Invalid request.');
  error.code = 'VALIDATION_FAILED';
  error.status = 400;
  error.details = result.error.issues.map((issue) => ({
    path: issue.path.join('.'),
    message: issue.message,
  }));
  throw error;
}
