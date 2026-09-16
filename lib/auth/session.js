import { cookies } from 'next/headers';
import { createSupabaseServerClient } from '@/lib/database/supabaseClients';
import { getRepository } from '@/lib/database/repository';
import { isSupabaseConfigured } from '@/config/env';
import { GUEST_COOKIE, createGuestToken, guestCookieOptions, verifyGuestToken } from './guestSession';

/**
 * Resolves the current actor.
 *
 * Order matters: a real Supabase session always wins over a guest cookie, so a
 * signed-in player who still has an old guest cookie is never demoted.
 *
 * @returns {Promise<{userId: string, isGuest: boolean, email: string|null, profile: object|null}|null>}
 */
export async function getActor({ createGuest = false } = {}) {
  const cookieStore = await cookies();

  if (isSupabaseConfigured) {
    const supabase = createSupabaseServerClient(cookieStore);
    const { data } = await supabase.auth.getUser();
    if (data?.user) {
      const profile = await getRepository().getProfile(data.user.id);
      return {
        userId: data.user.id,
        isGuest: false,
        email: data.user.email || null,
        emailVerified: Boolean(data.user.email_confirmed_at),
        profile,
      };
    }
  }

  const existing = verifyGuestToken(cookieStore.get(GUEST_COOKIE)?.value);
  if (existing) {
    const profile = await getRepository().getProfile(existing);
    return { userId: existing, isGuest: true, email: null, emailVerified: false, profile };
  }

  if (!createGuest) return null;

  const { id, token } = createGuestToken();
  cookieStore.set(GUEST_COOKIE, token, guestCookieOptions);
  const profile = await getRepository().upsertProfile({
    id,
    display_name: `Guest ${id.slice(6, 12)}`,
    is_guest: true,
    avatar_seed: id,
  });
  return { userId: id, isGuest: true, email: null, emailVerified: false, profile };
}

/** Throws a 401 rather than returning null — for routes that require identity. */
export async function requireActor(options) {
  const actor = await getActor(options);
  if (!actor) {
    const error = new Error('Start a session before playing.');
    error.code = 'UNAUTHORIZED';
    error.status = 401;
    throw error;
  }
  return actor;
}

export async function clearGuestCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(GUEST_COOKIE);
}
