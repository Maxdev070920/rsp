import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

/**
 * Refreshes the Supabase session cookie on navigation so a signed-in player is
 * not silently logged out mid-run. It is a no-op when Supabase is unconfigured,
 * which is what keeps guest-only deployments working.
 *
 * Named `proxy` and living in `proxy.js`: the `middleware` file convention is
 * deprecated in this Next version.
 */
export async function proxy(request) {
  const response = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return response;

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (cookiesToSet) => {
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  await supabase.auth.getUser();
  return response;
}

export const config = {
  matcher: [
    // Everything except static assets and the generated artwork route.
    '/((?!_next/static|_next/image|favicon.ico|api/art).*)',
  ],
};
