/**
 * Central environment access.
 *
 * Only `NEXT_PUBLIC_*` values appear here with literal `process.env.X` lookups,
 * because Next.js inlines those at build time and cannot resolve dynamic keys.
 * Server-only secrets are read in `config/server-env.js`, which must never be
 * imported from a client component.
 */

const asNumber = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const asBool = (value, fallback = false) => {
  if (value === undefined || value === null || value === '') return fallback;
  return String(value).toLowerCase() === 'true';
};

export const publicEnv = {
  appName: process.env.NEXT_PUBLIC_APP_NAME || 'Elemental RPS Arena',
  appUrl: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',

  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',

  // "demo" = no chain calls at all. "blockchain" = testnet contracts.
  chainMode: process.env.NEXT_PUBLIC_CHAIN_MODE === 'blockchain' ? 'blockchain' : 'demo',
  chainId: asNumber(process.env.NEXT_PUBLIC_CHAIN_ID, 2021), // Ronin Saigon testnet
  allowMainnet: asBool(process.env.NEXT_PUBLIC_ALLOW_MAINNET, false),

  arenaContract: process.env.NEXT_PUBLIC_ARENA_CONTRACT_ADDRESS || '',
  rewardsContract: process.env.NEXT_PUBLIC_REWARDS_CONTRACT_ADDRESS || '',
  walletConnectProjectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || '',

  entryFees: {
    practice: '0',
    bronze: process.env.NEXT_PUBLIC_ENTRY_FEE_BRONZE || '0.01',
    silver: process.env.NEXT_PUBLIC_ENTRY_FEE_SILVER || '0.05',
    legendary: process.env.NEXT_PUBLIC_ENTRY_FEE_LEGENDARY || '0.1',
  },

  estimatedGasNative: process.env.NEXT_PUBLIC_ESTIMATED_GAS_NATIVE || '0.0005',
};

export const isSupabaseConfigured = Boolean(publicEnv.supabaseUrl && publicEnv.supabaseAnonKey);
export const isBlockchainMode = publicEnv.chainMode === 'blockchain';
export const MAX_REWARD_LEVEL = 15;
