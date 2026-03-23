import { type Handle, redirect } from '@sveltejs/kit';
import type { AppRole } from '$lib/server/auth';
import { createServerClient } from '@supabase/ssr';
import { sequence } from '@sveltejs/kit/hooks';

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
    const { locals } = event;
    const { session, user } = await locals.safeGetSession();
    let userRole: AppRole | null = null;

    if (user) {
        const { data: profile } = await locals.supabase.from('profiles').select('role').eq('id', user.id).single();
        userRole = (profile?.role as AppRole) ?? 'applicant';
    }

    locals.session = session;
    locals.user = user;
    locals.userRole = userRole;

    const { pathname } = event.url;
    const isPublicRoute = pathname === '/login' || pathname.startsWith('/login/');
    const isApiRoute = pathname.startsWith('/api/');

    if (!session && !isPublicRoute && !isApiRoute) {
        redirect(303, '/login');
    }

    return resolve(event);
};

export const handle: Handle = sequence(supabase, authGuard);
