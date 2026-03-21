import { PUBLIC_SUPABASE_URL } from '$env/static/public';
import { SUPABASE_SERVICE_KEY } from '$env/static/private';
import type { SupabaseClient } from '@supabase/supabase-js';
// eslint-disable-next-line no-duplicate-imports
import { createClient } from '@supabase/supabase-js';

/**
 * Service-role Supabase client. Bypasses RLS.
 * ONLY use in server-side code for admin operations.
 */
let _client: SupabaseClient | null = null;

export function getSupabaseAdmin(): SupabaseClient {
    if (!_client) {
        _client = createClient(PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_KEY);
    }
    return _client;
}
