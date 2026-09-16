import { MemoryRepository } from './memoryRepository';
import { createSupabaseRepository } from './supabaseRepository';
import { DEMO_LEADERBOARD } from './demoData';

let repository = null;

/**
 * Single access point for persistence. Falls back to the in-memory repository
 * when Supabase is not configured so the app is always runnable; the fallback
 * is reported through `describeRepository()` and surfaced in the UI rather than
 * hidden.
 */
export function getRepository() {
  if (repository) return repository;
  repository = createSupabaseRepository() || new MemoryRepository();
  if (repository.backend === 'memory') {
    repository.seedDemoLeaderboard(DEMO_LEADERBOARD);
  }
  return repository;
}

export function setRepository(next) {
  repository = next;
}

export function describeRepository() {
  const repo = getRepository();
  return { backend: repo.backend, persistent: repo.persistent };
}
