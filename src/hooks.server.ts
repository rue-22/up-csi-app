import { type Handle } from '@sveltejs/kit';
import { createServerClient } from '@supabase/ssr';
import { sequence } from '@sveltejs/kit/hooks';
import type { AppRole } from '$lib/server/auth';

import { PUBLIC_SUPABASE_ANON_KEY, PUBLIC_SUPABASE_URL } from '$env/static/public';

const supabase: Handle = ({ event, resolve }) => {
    event.locals.supabase = createServerClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY, {
        cookies: {
            getAll: () => event.cookies.getAll(),
            /**
             * SvelteKit's cookies API requires `path` to be explicitly set in
             * the cookie options. Setting `path` to `/` replicates previous/
             * standard behavior.
             */
            setAll: cookiesToSet => {
                cookiesToSet.forEach(({ name, value, options }) => {
                    event.cookies.set(name, value, { ...options, path: '/' });
                });
            },
        },
    });

    event.locals.safeGetSession = async () => {
        const {
            data: { session },
        } = await event.locals.supabase.auth.getSession();
        if (!session) {
            return { session: null, user: null };
        }

        const {
            data: { user },
            error,
        } = await event.locals.supabase.auth.getUser();
        if (error) {
            // JWT validation has failed
            return { session: null, user: null };
        }

        return { session, user };
    };

    return resolve(event, {
        filterSerializedResponseHeaders(name) {
            return name === 'content-range' || name === 'x-supabase-api-version';
        },
    });
};

const authGuard: Handle = async ({ event, resolve }) => {
  const { session, user } = await event.locals.safeGetSession()
  event.locals.session = session
  event.locals.user = user
  event.locals.userRole = null;

  if (user) {
    const { data: profile } = await event.locals.supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();
    event.locals.userRole = (profile?.role as AppRole) ?? 'applicant';
    console.log('userRole:', event.locals.userRole);
}

  return resolve(event)
}

export const handle: Handle = sequence(supabase, authGuard);
