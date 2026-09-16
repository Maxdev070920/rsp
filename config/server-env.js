import 'server-only';

/**
 * Server-only configuration. Importing this from a client component throws at
 * build time thanks to `server-only`, which is the guard that keeps service
 * keys out of the browser bundle.
 */
export const serverEnv = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',

  // Secret used to derive per-run randomness commitments in simulated mode.
  randomnessSecret: process.env.RANDOMNESS_SERVER_SECRET || '',
  randomnessProvider: process.env.RANDOMNESS_PROVIDER || 'simulated', // simulated | commit-reveal | vrf

  sessionSecret: process.env.SESSION_SECRET || '',

  // Never used by the app runtime; deployment scripts read it from a local .env
  // that is git-ignored. Listed here only so misuse is obvious in review.
  rateLimitPerMinute: Number(process.env.RATE_LIMIT_PER_MINUTE || 120),
};

export const hasServiceRole = Boolean(serverEnv.supabaseUrl && serverEnv.supabaseServiceRoleKey);
