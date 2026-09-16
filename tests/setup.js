// Deterministic environment for every test run: demo mode, testnet chain, and a
// fixed randomness secret so commit-reveal proofs are reproducible.
process.env.NEXT_PUBLIC_CHAIN_MODE = process.env.NEXT_PUBLIC_CHAIN_MODE || 'demo';
process.env.NEXT_PUBLIC_CHAIN_ID = process.env.NEXT_PUBLIC_CHAIN_ID || '2021';
process.env.NEXT_PUBLIC_APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
process.env.RANDOMNESS_SERVER_SECRET = 'test-secret-do-not-use-in-production';
process.env.SESSION_SECRET = 'test-session-secret';
