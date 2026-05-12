import { PUBLIC_SUPABASE_URL } from '$env/static/public';
import { createClient } from '@supabase/supabase-js';
import { requirePrivateEnv } from '$lib/server/env';

/**
 * Service-role Supabase client. Bypasses RLS.
 * ONLY use in server-side code for admin operations.
 */
let _client: ReturnType<typeof createClient> | null = null;

export function getSupabaseAdmin(): ReturnType<typeof createClient> {
    if (!_client) {
        _client = createClient(PUBLIC_SUPABASE_URL, requirePrivateEnv('SUPABASE_SERVICE_KEY'), {
            auth: {
                autoRefreshToken: false,
                persistSession: false,
            },
        });
    }
    return _client;
}
